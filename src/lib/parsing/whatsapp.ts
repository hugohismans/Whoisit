import type { Conversation, Message } from '../types'
import { capMessages, rankParticipants } from './conversation'
import { normalizeLine, toLines } from './text'

/**
 * Parseur WhatsApp tolérant.
 *
 * Le format du .txt exporté dépend de l'OS *et* de la locale du téléphone.
 * Plutôt que d'empiler des expressions régulières complètes par variante, on
 * découpe le problème :
 *
 *   1. isoler un préfixe candidat (entre crochets sur iOS, avant « - » sur
 *      Android) ;
 *   2. tenter de lire ce préfixe comme une date+heure ;
 *   3. si ça marche, la ligne ouvre un nouveau message — sinon elle appartient
 *      au message précédent (messages multi-lignes).
 *
 * L'ordre jour/mois est ambigu (12/03 peut être le 12 mars ou le 3 décembre).
 * On le tranche en analysant tout le fichier d'abord : voir `inferDateOrder`.
 */

type RawHeader = {
  /** Composants de date dans l'ordre où ils apparaissent. */
  a: number
  b: number
  c: number
  hour: number
  minute: number
  second: number
  /** 'a' | 'p' si le fichier utilise le format 12 h. */
  meridiem: 'a' | 'p' | null
  /** Ce qui suit la date : « Auteur: texte » ou un message système. */
  rest: string
}

/** Date + heure, ancrées à rien d'autre qu'elles-mêmes. */
const DATE_TIME =
  /^(\d{1,4})[./-](\d{1,2})[./-](\d{2,4})(?:,|\s+à|\s+at|\s+om)?\s+(\d{1,2})[:.h](\d{2})(?:[:.](\d{2}))?(?:\s*([APap])\.?\s*[Mm]\.?)?$/

/**
 * « Auteur: texte ». Le nom est borné en longueur : sans cette borne, un message
 * système contenant un deux-points (« Les messages sont chiffrés : … ») se ferait
 * passer pour un participant nommé d'après une phrase entière.
 */
const AUTHOR_LINE = /^([^:\n]{1,60}):\s?([\s\S]*)$/

/** Verbes des notifications système, qui ne doivent jamais devenir des auteurs. */
const SYSTEM_VERBS =
  /\b(a ajouté|a retiré|a créé|a changé|a quitté|a rejoint|vous a ajouté|added|removed|created|changed|left|joined|has changed|heeft toegevoegd|is toegevoegd)\b/i

/**
 * Placeholders média et messages supprimés, en FR / EN / NL.
 * WhatsApp remplace le média par une de ces mentions ; les garder produirait des
 * questions injouables (« qui a écrit "image absente" ? »).
 */
const PLACEHOLDERS: RegExp[] = [
  /^<[^>]*(omitted|omis|omise|weggelaten|ausgelassen|omessi)[^>]*>$/i,
  /^<(attached|joint|bijgevoegd)\s*:.*>$/i,
  /^(image|images|photo|vidéo|video|audio|gif|sticker|autocollant|document|contact card|carte de visite|localisation|location)\s+(absente?|absent|omis|omise|omitted|weggelaten|ontbreekt)$/i,
  /^(ce message a été supprimé|vous avez supprimé ce message|this message was deleted|you deleted this message|dit bericht is verwijderd|je hebt dit bericht verwijderd)\.?$/i,
  /^(appel manqué|appel vocal manqué|appel vidéo manqué|missed voice call|missed video call|gemiste (spraak|video)oproep)\.?$/i,
  /^(null|undefined)$/i,
  /^(sticker|gif|localisation en direct|live location shared)$/i,
]

/** Notifications système reconnaissables même quand elles contiennent un « : ». */
const SYSTEM_LINES = [
  /chiffr(é|és|ée|ées) de bout en bout/i,
  /end-to-end encrypted/i,
  /end-to-end versleuteld/i,
  /(les messages et les appels|messages and calls) (sont|are)/i,
  /a (créé|changé|supprimé) (ce groupe|le groupe|l’icône|la description|le sujet)/i,
  /(created|changed) (this group|the group|the subject|the group description)/i,
]

function isPlaceholder(text: string): boolean {
  const trimmed = text.trim()
  return trimmed === '' || PLACEHOLDERS.some((pattern) => pattern.test(trimmed))
}

function isSystemLine(text: string): boolean {
  return SYSTEM_LINES.some((pattern) => pattern.test(text))
}

/**
 * Extrait le préfixe date/heure d'une ligne, s'il y en a un.
 * Renvoie `null` pour une ligne de continuation.
 */
function readHeader(line: string): RawHeader | null {
  let prefix: string
  let rest: string

  if (line.startsWith('[')) {
    // Variante iOS : [12/03/2023, 14:32:11] Hugo: …
    const close = line.indexOf(']')
    if (close === -1) return null
    prefix = line.slice(1, close).trim()
    rest = line.slice(close + 1).replace(/^\s*-\s*/, '').trimStart()
  } else {
    // Variante Android : 12/03/2023, 14:32 - Hugo: …
    const separator = line.search(/\s[-–]\s/)
    // Un séparateur très tardif signale une ligne de conversation ordinaire
    // qui contient un tiret, pas un en-tête.
    if (separator === -1 || separator > 40) return null
    prefix = line.slice(0, separator).trim()
    rest = line.slice(separator + 3).trimStart()
  }

  const match = DATE_TIME.exec(prefix)
  if (!match) return null

  const [, a, b, c, hour, minute, second, meridiem] = match
  return {
    a: Number(a),
    b: Number(b),
    c: Number(c),
    hour: Number(hour),
    minute: Number(minute),
    second: second ? Number(second) : 0,
    meridiem: meridiem ? (meridiem.toLowerCase() as 'a' | 'p') : null,
    rest,
  }
}

export type DateOrder = 'dmy' | 'mdy' | 'ymd'

/**
 * Déduit l'ordre des composants de date à l'échelle du fichier entier.
 *
 * Un seul en-tête ne suffit pas : « 03/12/2023 » est ambigu. Mais sur une
 * conversation entière, il suffit qu'une date dépasse 12 quelque part pour
 * trancher. À défaut, la présence de AM/PM trahit un export américain.
 */
export function inferDateOrder(headers: RawHeader[]): DateOrder {
  let sawUsMeridiem = false

  for (const header of headers) {
    if (header.a > 31) return 'ymd'
    if (header.a > 12) return 'dmy'
    if (header.b > 12) return 'mdy'
    if (header.meridiem !== null) sawUsMeridiem = true
  }

  // Aucune date discriminante : le format 12 h penche fortement vers l'export US.
  return sawUsMeridiem ? 'mdy' : 'dmy'
}

function toTimestamp(header: RawHeader, order: DateOrder): number {
  let year: number
  let month: number
  let day: number

  if (order === 'ymd') {
    ;[year, month, day] = [header.a, header.b, header.c]
  } else if (order === 'mdy') {
    ;[month, day, year] = [header.a, header.b, header.c]
  } else {
    ;[day, month, year] = [header.a, header.b, header.c]
  }

  if (year < 100) year += 2000

  let hour = header.hour
  if (header.meridiem === 'p' && hour < 12) hour += 12
  if (header.meridiem === 'a' && hour === 12) hour = 0

  return new Date(year, month - 1, day, hour, header.minute, header.second).getTime()
}

/**
 * Déduit un titre lisible depuis le nom du fichier exporté.
 * « Discussion WhatsApp avec Les Zouzous.txt » → « Les Zouzous »
 */
export function titleFromFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '').replace(/^.*\//, '')
  const stripped = withoutExtension.replace(
    /^(discussion whatsapp avec|conversation whatsapp avec|whatsapp chat (with|met)|chat whatsapp con|whatsapp-chat mit)\s+/i,
    '',
  )
  return stripped.trim() || withoutExtension
}

export function parseWhatsApp(
  content: string,
  fileName = 'WhatsApp',
  options: { maxMessages?: number } = {},
): Conversation {
  const lines = toLines(content)

  // Passe 1 — repérer tous les en-têtes pour trancher l'ordre des dates.
  const parsed: (RawHeader | null)[] = lines.map((line) => readHeader(normalizeLine(line)))
  const headers = parsed.filter((header): header is RawHeader => header !== null)
  const order = inferDateOrder(headers)

  // Passe 2 — reconstruire les messages, en recollant les lignes de continuation.
  const messages: Message[] = []
  let current: { author: string; parts: string[]; ts: number } | null = null

  const flush = () => {
    if (!current) return
    const text = current.parts.join('\n').trim()
    if (!isPlaceholder(text) && !isSystemLine(text)) {
      messages.push({ i: messages.length, author: current.author, text, ts: current.ts })
    }
    current = null
  }

  for (let index = 0; index < lines.length; index += 1) {
    const header = parsed[index]

    if (!header) {
      // Ligne de continuation : elle prolonge le message ouvert, s'il y en a un.
      if (current) current.parts.push(normalizeLine(lines[index]))
      continue
    }

    flush()

    if (isSystemLine(header.rest)) continue

    const authorMatch = AUTHOR_LINE.exec(header.rest)
    // Pas de « Auteur: » → notification système (ajout, départ, chiffrement, appel).
    if (!authorMatch) continue

    const author = authorMatch[1].trim()
    if (author === '' || SYSTEM_VERBS.test(author)) continue

    current = { author, parts: [authorMatch[2]], ts: toTimestamp(header, order) }
  }

  flush()

  return {
    source: 'whatsapp',
    title: titleFromFileName(fileName),
    // Comme pour Meta : établis avant plafonnement, pour que la liste des
    // participants ne dépende pas du nombre de messages conservés.
    participants: rankParticipants(messages),
    messages: capMessages(messages, options.maxMessages),
  }
}

