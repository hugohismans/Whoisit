import type { Conversation, ParseError, ParseProgress } from './types'

export type Screen =
  | 'home'
  | 'parsing'
  | 'threads'
  | 'identities'
  | 'game'
  | 'gameover'
  | 'help'

/**
 * État global de navigation et de session.
 *
 * Tout vit en mémoire : aucune conversation n'est écrite sur disque, et un
 * rechargement de page repart de l'accueil — c'est voulu.
 */
class AppState {
  screen = $state<Screen>('home')
  /** Écran auquel revenir en quittant l'aide. */
  #returnTo: Screen = 'home'

  /** Fichier déposé en attente de lecture. `null` = partie de démonstration. */
  pendingFile = $state<File | null>(null)

  /** Conversations issues du dernier parsing (vidées dès qu'on revient à l'accueil). */
  conversations = $state<Conversation[]>([])
  /** Conversation sélectionnée pour jouer. */
  selected = $state<Conversation | null>(null)

  progress = $state<ParseProgress>({ ratio: 0, stepKey: 'parsing.step.reading' })
  error = $state<ParseError | null>(null)

  goto(screen: Screen): void {
    if (screen === 'help') this.#returnTo = this.screen === 'help' ? this.#returnTo : this.screen
    this.screen = screen
  }

  leaveHelp(): void {
    this.screen = this.#returnTo
  }

  /** Retour à l'accueil : on relâche explicitement toutes les données lues. */
  reset(): void {
    this.pendingFile = null
    this.conversations = []
    this.selected = null
    this.error = null
    this.progress = { ratio: 0, stepKey: 'parsing.step.reading' }
    this.screen = 'home'
  }
}

export const app = new AppState()
