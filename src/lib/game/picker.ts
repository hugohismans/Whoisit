import type { Message } from '../types'
import { DEFAULT_ELIGIBILITY, type PlayableSet } from './eligibility'
import { pickOne, sample, shuffle, type Rng } from './random'

/**
 * Tirage d'une question.
 *
 * Le point central : **on tire d'abord un auteur, uniformément, puis un de ses
 * messages**. Dans un groupe, deux personnes écrivent souvent 70 % du total ;
 * tirer un message au hasard ferait de « répondre le plus bavard » une
 * stratégie gagnante, et le jeu s'effondrerait en trois tours.
 */

export type Round = {
  message: Message
  /** La bonne réponse. */
  author: string
  /** Propositions mélangées, la bonne réponse comprise. */
  options: string[]
}

export type PickOptions = {
  rng?: Rng
  /** Nombre de propositions visé (4 à 6 en pratique). */
  optionCount?: number
  /** Index des messages déjà posés dans la partie en cours. */
  used?: ReadonlySet<number>
  /**
   * Longueur minimale exigée pour ce tour. Baisser ce seuil rend la partie plus
   * difficile : des messages plus courts livrent moins d'indices.
   *
   * Le vivier est bâti au seuil le plus permissif que la difficulté pourra
   * atteindre ; sans valeur ici, on sert donc la difficulté normale, et non
   * tout le contenu du vivier.
   */
  minChars?: number
}

export const DEFAULT_OPTION_COUNT = 4
export const MAX_OPTION_COUNT = 6

export function pickRound(set: PlayableSet, options: PickOptions = {}): Round | null {
  const {
    rng = Math.random,
    optionCount = DEFAULT_OPTION_COUNT,
    used = new Set<number>(),
    minChars = DEFAULT_ELIGIBILITY.minChars,
  } = options

  // Candidats restants par auteur, au seuil de difficulté du tour.
  const candidates = new Map<string, Message[]>()
  for (const [author, messages] of set.byAuthor) {
    const available = messages.filter(
      (message) => !used.has(message.i) && message.text.length >= minChars,
    )
    if (available.length > 0) candidates.set(author, available)
  }

  // Un seul auteur encore disponible : la réponse serait toujours la même.
  // Le vivier est épuisé, autant le dire au lieu de poser une fausse question.
  if (candidates.size < 2) return null

  const author = pickOne([...candidates.keys()], rng)
  const message = pickOne(candidates.get(author)!, rng)

  const wanted = Math.min(Math.max(optionCount, 2), MAX_OPTION_COUNT)
  // Les distracteurs sont tirés parmi les auteurs jouables : chaque proposition
  // affichée doit pouvoir être la bonne réponse.
  const distractors = sample(
    set.authors.filter((name) => name !== author),
    wanted - 1,
    rng,
  )

  return { message, author, options: shuffle([author, ...distractors], rng) }
}

/**
 * Nombre de propositions adapté à la conversation : autant que de participants
 * crédibles, plafonné à six. Vingt boutons seraient illisibles, et quatre
 * suffisent à rendre la question intéressante.
 */
export function optionCountFor(set: PlayableSet): number {
  return Math.min(set.authors.length, MAX_OPTION_COUNT)
}
