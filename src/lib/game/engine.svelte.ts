import type { Conversation, Message } from '../types'
import {
  buildPlayableSet,
  DEFAULT_ELIGIBILITY,
  EASIEST_MIN_CHARS,
  type PlayableSet,
} from './eligibility'
import { optionCountFor, pickRound, type Round } from './picker'
import type { Rng } from './random'
import { readBestStreak, writeBestStreak } from './storage'

export const STARTING_LIVES = 3

/** Série à partir de laquelle la difficulté cesse d'augmenter. */
export const MAX_DIFFICULTY_STREAK = 10

/**
 * Seuil de longueur du tour, en fonction de la série en cours.
 *
 * Plus la série monte, plus le seuil baisse : des messages plus courts livrent
 * moins d'indices sur leur auteur. La descente s'arrête au seuil le plus
 * permissif du vivier, sans quoi le tirage n'aurait plus rien à proposer.
 */
export function minCharsForStreak(streak: number): number {
  const span = DEFAULT_ELIGIBILITY.minChars - EASIEST_MIN_CHARS
  const progress = Math.min(1, Math.max(0, streak) / MAX_DIFFICULTY_STREAK)
  return Math.round(DEFAULT_ELIGIBILITY.minChars - span * progress)
}

export type Attempt = {
  message: Message
  /** La bonne réponse. */
  author: string
  /** Ce qu'a répondu le joueur. */
  answer: string
  correct: boolean
}

/** Pourquoi la partie s'est arrêtée. */
export type GameEnding =
  /** Trois erreurs. */
  | 'no-lives'
  /** Plus aucun message jouable à proposer. */
  | 'exhausted'
  /** Le joueur a quitté de lui-même. */
  | 'quit'

/**
 * Une partie.
 *
 * Tout est en mémoire et disparaît avec l'onglet, à l'exception du meilleur
 * score — un entier, écrit dans `localStorage`.
 */
export class Game {
  readonly conversation: Conversation
  readonly set: PlayableSet
  readonly optionCount: number

  lives = $state(STARTING_LIVES)
  streak = $state(0)
  /** Meilleure série de cette partie. */
  bestStreak = $state(0)
  /** Meilleure série jamais atteinte, tous jeux confondus. */
  record = $state(0)
  /** Vrai si cette partie a battu le record d'avant. */
  brokeRecord = $state(false)

  correctCount = $state(0)
  answeredCount = $state(0)

  round = $state<Round | null>(null)
  /** Réponse du joueur pour le tour en cours ; `null` tant qu'il n'a pas répondu. */
  answer = $state<string | null>(null)

  missed = $state<Attempt[]>([])
  ending = $state<GameEnding | null>(null)

  readonly #used = new Set<number>()
  readonly #rng: Rng | undefined

  private constructor(conversation: Conversation, set: PlayableSet, rng?: Rng) {
    this.conversation = conversation
    this.set = set
    this.optionCount = optionCountFor(set)
    this.#rng = rng
    this.record = readBestStreak()
    this.#nextRound()
  }

  /**
   * Crée une partie, ou `null` si la conversation ne permet pas de jouer —
   * trop courte, ou trop peu de personnes qui écrivent vraiment.
   */
  static create(conversation: Conversation, rng?: Rng): Game | null {
    const set = buildPlayableSet(conversation)
    if (!set) return null
    const game = new Game(conversation, set, rng)
    // Aucune question tirable dès le départ : inutile de prétendre le contraire.
    return game.round ? game : null
  }

  get answered(): boolean {
    return this.answer !== null
  }

  get over(): boolean {
    return this.ending !== null
  }

  get lastAttemptCorrect(): boolean {
    return this.answer !== null && this.round !== null && this.answer === this.round.author
  }

  /** Difficulté du prochain tirage — exposée pour l'affichage et les tests. */
  get minChars(): number {
    return minCharsForStreak(this.streak)
  }

  submit(choice: string): void {
    if (this.answered || this.over || !this.round) return

    const correct = choice === this.round.author
    this.answer = choice
    this.answeredCount += 1

    if (correct) {
      this.correctCount += 1
      this.streak += 1
      if (this.streak > this.bestStreak) this.bestStreak = this.streak
      if (this.bestStreak > this.record) {
        this.record = this.bestStreak
        this.brokeRecord = true
        writeBestStreak(this.record)
      }
    } else {
      this.streak = 0
      this.lives -= 1
      this.missed = [
        ...this.missed,
        { message: this.round.message, author: this.round.author, answer: choice, correct: false },
      ]
    }
  }

  /** Passe au tour suivant, ou termine la partie. */
  next(): void {
    if (!this.answered || this.over) return

    if (this.lives <= 0) {
      this.ending = 'no-lives'
      return
    }

    this.answer = null
    this.#nextRound()
  }

  #nextRound(): void {
    const draw = (minChars: number) =>
      pickRound(this.set, {
        rng: this.#rng,
        optionCount: this.optionCount,
        used: this.#used,
        minChars,
      })

    // Une conversation peut n'avoir que de courts messages : plutôt que de
    // déclarer le vivier épuisé alors qu'il reste de quoi jouer, on retombe sur
    // le seuil le plus permissif.
    const round = draw(this.minChars) ?? draw(EASIEST_MIN_CHARS)

    if (!round) {
      // Le vivier est épuisé : c'est une fin de partie honorable, pas une erreur.
      this.round = null
      if (this.answeredCount > 0) this.ending = 'exhausted'
      return
    }

    this.#used.add(round.message.i)
    this.round = round
  }
}
