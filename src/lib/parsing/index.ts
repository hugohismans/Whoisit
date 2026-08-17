import type { Conversation, ParseProgress } from '../types'
import { ParseFailure } from './errors'
import { parseMetaThread } from './meta'
import { parseWhatsApp } from './whatsapp'
import { decodeEntry, looksLikeZip, readZipEntries, type ZipEntry } from './zip'

export type ParseOptions = {
  /**
   * Plafond de messages conservés par conversation. `undefined` = tout garder.
   * Proposé à l'utilisateur quand l'archive est volumineuse.
   */
  maxMessagesPerThread?: number
}

export type ProgressReporter = (progress: ParseProgress) => void

/** Fichiers de conversation Meta. Les médias ne portent jamais ce nom. */
const META_THREAD_FILE = /(?:^|\/)message_\d+\.json$/i

/** Artefacts d'archivage macOS, présents dans beaucoup de ZIP. */
const JUNK = /(?:^|\/)(__MACOSX|\.DS_Store)(?:\/|$)/

const WHATSAPP_TEXT = /\.txt$/i

/**
 * Filtre appliqué *avant* décompression. Exporté pour être testé directement :
 * c'est lui qui garantit qu'aucun média n'est jamais matérialisé en mémoire.
 */
export function wantedInZip(path: string): boolean {
  if (JUNK.test(path)) return false
  return META_THREAD_FILE.test(path) || WHATSAPP_TEXT.test(path)
}

/** Regroupe les `message_N.json` par dossier de conversation. */
function groupMetaEntries(entries: ZipEntry[]): Map<string, ZipEntry[]> {
  const threads = new Map<string, ZipEntry[]>()
  for (const entry of entries) {
    if (!META_THREAD_FILE.test(entry.path)) continue
    const dir = entry.path.slice(0, entry.path.lastIndexOf('/'))
    const bucket = threads.get(dir)
    if (bucket) bucket.push(entry)
    else threads.set(dir, [entry])
  }
  return threads
}

/**
 * Une conversation n'est jouable qu'à partir de trois personnes qui écrivent :
 * à deux, deviner l'auteur revient à tirer à pile ou face, et les distracteurs
 * n'ont plus de sens.
 */
export function isGroupConversation(conversation: Conversation): boolean {
  // `participants` recense les auteurs de l'intégralité du fil, avant tout
  // plafonnement : un groupe ne doit pas être requalifié en discussion à deux
  // simplement parce qu'on n'a gardé que les messages récents.
  return conversation.participants.length >= 3
}

async function parseZip(
  file: Blob,
  options: ParseOptions,
  report: ProgressReporter,
): Promise<Conversation[]> {
  report({ ratio: 0, stepKey: 'parsing.step.listing' })

  const entries = await readZipEntries(file, wantedInZip, (ratio) =>
    // La traversée de l'archive occupe les trois quarts de la barre : c'est de
    // loin l'étape la plus longue sur une grosse archive.
    report({ ratio: ratio * 0.75, stepKey: 'parsing.step.extracting' }),
  )

  if (entries.length === 0) throw new ParseFailure('unsupported')

  report({ ratio: 0.78, stepKey: 'parsing.step.parsing' })

  const conversations: Conversation[] = []

  // Volet Meta : un dossier = une conversation, éclatée en plusieurs fichiers.
  const threads = groupMetaEntries(entries)
  let done = 0
  for (const [, files] of threads) {
    const conversation = parseMetaThread(
      files.map((entry) => ({ path: entry.path, content: decodeEntry(entry) })),
      { maxMessages: options.maxMessagesPerThread },
    )
    if (conversation) conversations.push(conversation)

    done += 1
    report({
      ratio: 0.78 + (done / threads.size) * 0.2,
      stepKey: 'parsing.step.parsing',
    })
  }

  // Volet WhatsApp : un ZIP exporté depuis l'app contient un unique .txt.
  for (const entry of entries) {
    if (!WHATSAPP_TEXT.test(entry.path)) continue
    const conversation = parseWhatsApp(decodeEntry(entry), entry.path, {
      maxMessages: options.maxMessagesPerThread,
    })
    if (conversation.messages.length > 0) conversations.push(conversation)
  }

  return conversations
}

async function parsePlainFile(
  file: Blob,
  name: string,
  options: ParseOptions,
  report: ProgressReporter,
): Promise<Conversation[]> {
  report({ ratio: 0.3, stepKey: 'parsing.step.parsing' })
  const content = await file.text()

  // Un `message_N.json` isolé, sorti de son archive à la main.
  if (content.trimStart().startsWith('{')) {
    const conversation = parseMetaThread([{ path: name, content }], {
      maxMessages: options.maxMessagesPerThread,
    })
    return conversation ? [conversation] : []
  }

  const conversation = parseWhatsApp(content, name, {
    maxMessages: options.maxMessagesPerThread,
  })
  return conversation.messages.length > 0 ? [conversation] : []
}

export type ParseResult = {
  /** Conversations de groupe jouables, les plus fournies d'abord. */
  conversations: Conversation[]
  /** Discussions à deux écartées — signalées à l'utilisateur, pas cachées. */
  skippedOneToOne: number
}

/**
 * Point d'entrée du parsing.
 *
 * Lève un `ParseFailure` typé : c'est ce qui permet à l'interface d'afficher un
 * message utile plutôt qu'un « une erreur est survenue » générique.
 */
export async function parseArchive(
  file: File | Blob,
  options: ParseOptions = {},
  report: ProgressReporter = () => {},
): Promise<ParseResult> {
  const name = 'name' in file ? file.name : 'conversation'
  report({ ratio: 0, stepKey: 'parsing.step.reading' })

  let conversations: Conversation[]
  try {
    conversations = (await looksLikeZip(file))
      ? await parseZip(file, options, report)
      : await parsePlainFile(file, name, options, report)
  } catch (error) {
    if (error instanceof ParseFailure) throw error
    throw new ParseFailure('corrupt', error instanceof Error ? error.message : undefined)
  }

  if (conversations.length === 0) throw new ParseFailure('empty')

  const groups = conversations.filter(isGroupConversation)
  // L'archive est lisible, mais ne contient que des discussions à deux.
  if (groups.length === 0) throw new ParseFailure('no-group')

  groups.sort((a, b) => b.messages.length - a.messages.length)
  report({ ratio: 1, stepKey: 'parsing.step.done' })
  return { conversations: groups, skippedOneToOne: conversations.length - groups.length }
}
