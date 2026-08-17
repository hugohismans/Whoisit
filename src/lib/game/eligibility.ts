import type { Conversation, Message } from '../types'
import { countWords } from '../parsing/text'

/**
 * Sélection des messages « jouables ».
 *
 * Un message tiré au hasard dans une vraie conversation est le plus souvent
 * injouable : « ok », « 😂 », un lien seul, ou une adresse copiée-collée.
 * Ces filtres décident de ce qui peut devenir une question.
 */

export type EligibilityConfig = {
  /** Longueur minimale du message, en caractères. */
  minChars: number
  /** Nombre de mots minimum — un seul mot très long ne fait pas une question. */
  minWords: number
  /** Messages éligibles qu'un auteur doit avoir pour être une réponse possible. */
  minMessagesPerAuthor: number
  /** En dessous de ce nombre d'auteurs jouables, les seuils sont assouplis. */
  minAuthors: number
}

export const DEFAULT_ELIGIBILITY: EligibilityConfig = {
  minChars: 80,
  minWords: 12,
  minMessagesPerAuthor: 15,
  minAuthors: 3,
}

/**
 * Seuil le plus permissif que la difficulté progressive pourra atteindre.
 * Le vivier est construit une fois à ce niveau ; chaque tour y puise ensuite
 * avec son propre seuil, ce qui évite de tout recalculer à chaque question.
 */
export const EASIEST_MIN_CHARS = 40
export const EASIEST_MIN_WORDS = 7

const URL_PATTERN = /(https?:\/\/|www\.)\S+/gi

/** Pourquoi un message n'est pas jouable — `null` s'il l'est. */
export type Unplayable = 'too-short' | 'too-few-words' | 'link' | 'not-prose' | 'pasted'

export function playabilityIssue(
  text: string,
  config: Pick<EligibilityConfig, 'minChars' | 'minWords'>,
): Unplayable | null {
  const trimmed = text.trim()

  if (trimmed.length < config.minChars) return 'too-short'
  if (countWords(trimmed) < config.minWords) return 'too-few-words'

  // Un message qui n'est qu'un lien, ou un lien avec trois mots autour, ne dit
  // rien de son auteur. On juge ce qu'il reste une fois les URL retirées.
  const withoutLinks = trimmed.replace(URL_PATTERN, ' ').trim()
  if (withoutLinks.length < config.minChars || countWords(withoutLinks) < config.minWords) {
    return 'link'
  }

  // Emoji en rafale, ASCII art, suites de chiffres : beaucoup de caractères,
  // très peu de lettres. La prose ordinaire dépasse largement ce ratio.
  const dense = withoutLinks.replace(/\s+/g, '')
  const letters = (dense.match(/\p{L}/gu) ?? []).length
  if (dense.length > 0 && letters / dense.length < 0.6) return 'not-prose'

  // Paroles de chanson, recette, article transféré : un empilement de lignes
  // courtes que l'auteur n'a pas écrit lui-même.
  const lines = trimmed.split('\n')
  if (lines.length > 8) return 'pasted'

  return null
}

/** Minuscules sans accents — pour comparer des noms sans se soucier de la casse. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/**
 * Vrai si le message contient le nom de son propre auteur.
 *
 * C'est le spoiler le plus fréquent : une signature, ou quelqu'un qui parle de
 * lui à la troisième personne. Le nom d'un *autre* participant, en revanche,
 * est une information légitime que le joueur a le droit d'exploiter.
 */
export function mentionsOwnAuthor(message: Message): boolean {
  const tokens = message.author
    .split(/[\s._\-/]+/)
    .filter((token) => token.length >= 3 && /\p{L}/u.test(token))
    .map(fold)

  if (tokens.length === 0) return false

  const haystack = fold(message.text)
  return tokens.some((token) => new RegExp(`(?<!\\p{L})${escapeRegExp(token)}(?!\\p{L})`, 'u').test(haystack))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Clé de déduplication : deux messages identiques ne doivent être posés qu'une fois. */
function dedupeKey(text: string): string {
  return fold(text).replace(/\s+/g, ' ').trim()
}

export type PlayableSet = {
  /** Messages jouables, par auteur, pour les auteurs retenus. */
  byAuthor: Map<string, Message[]>
  /**
   * Auteurs jouables : ils sont à la fois les bonnes réponses possibles et le
   * vivier des distracteurs.
   *
   * Proposer comme distracteur quelqu'un qui ne peut jamais être la réponse
   * serait exploitable : un joueur régulier apprendrait à l'éliminer d'office,
   * et une question à cinq propositions en vaudrait trois. Toutes les
   * propositions affichées doivent être des réponses crédibles.
   */
  authors: string[]
  /** Participants écartés faute de messages assez longs — pour diagnostic. */
  benched: string[]
  /** Seuil d'éligibilité réellement appliqué, après assouplissement éventuel. */
  appliedMinMessagesPerAuthor: number
  /** Nombre total de messages jouables retenus. */
  total: number
}

/**
 * Construit le vivier de messages jouables d'une conversation.
 *
 * Le vivier est bâti au seuil le plus permissif que la difficulté progressive
 * pourra atteindre ; chaque tour y puise ensuite avec son propre seuil.
 *
 * Renvoie `null` si la conversation ne permet pas de poser de question.
 */
export function buildPlayableSet(
  conversation: Conversation,
  config: EligibilityConfig = DEFAULT_ELIGIBILITY,
): PlayableSet | null {
  const thresholds = {
    minChars: Math.min(config.minChars, EASIEST_MIN_CHARS),
    minWords: Math.min(config.minWords, EASIEST_MIN_WORDS),
  }

  const seen = new Set<string>()
  const byAuthor = new Map<string, Message[]>()
  const totalPerAuthor = new Map<string, number>()

  for (const message of conversation.messages) {
    totalPerAuthor.set(message.author, (totalPerAuthor.get(message.author) ?? 0) + 1)

    if (playabilityIssue(message.text, thresholds) !== null) continue
    if (mentionsOwnAuthor(message)) continue

    const key = dedupeKey(message.text)
    if (seen.has(key)) continue
    seen.add(key)

    const bucket = byAuthor.get(message.author)
    if (bucket) bucket.push(message)
    else byAuthor.set(message.author, [message])
  }

  // Assouplissement : sur un petit groupe, exiger 15 messages éligibles par
  // auteur ne laisserait personne. On descend par paliers jusqu'à obtenir
  // assez d'auteurs — mieux vaut une partie un peu courte que pas de partie.
  const ladder = [config.minMessagesPerAuthor, 8, 4, 2, 1].filter(
    (value, index, all) => value <= config.minMessagesPerAuthor && all.indexOf(value) === index,
  )

  let applied = ladder[0]
  let authors: string[] = []
  for (const threshold of ladder) {
    applied = threshold
    authors = [...byAuthor.entries()]
      .filter(([, messages]) => messages.length >= threshold)
      .map(([author]) => author)
    if (authors.length >= config.minAuthors) break
  }

  // Deux auteurs au minimum : en dessous, il n'y a rien à deviner.
  if (authors.length < 2) return null

  const retained = new Map(authors.map((author) => [author, byAuthor.get(author)!]))

  const benched = [...totalPerAuthor.keys()].filter((author) => !authors.includes(author))

  return {
    byAuthor: retained,
    authors,
    benched,
    appliedMinMessagesPerAuthor: applied,
    total: [...retained.values()].reduce((sum, messages) => sum + messages.length, 0),
  }
}
