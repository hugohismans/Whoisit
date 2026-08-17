import type { Conversation, ParseError, ParseProgress } from './types'
import type { ParseOptions } from './parsing'
import { parseInWorker, type ParseHandle } from './worker/client'
import { buildDemoConversation } from './demo/demoConversation'

export type Screen =
  | 'home'
  | 'archive-size'
  | 'parsing'
  | 'threads'
  | 'identities'
  | 'game'
  | 'gameover'
  | 'help'

/**
 * Au-delà de ce poids, on demande à l'utilisateur s'il veut tout lire ou se
 * limiter aux messages récents. En dessous, la question serait du bruit.
 */
export const LARGE_ARCHIVE_BYTES = 40 * 1024 * 1024

/** Plafond proposé par défaut sur une grosse archive. */
export const DEFAULT_MESSAGE_CAP = 50_000

/**
 * État global de navigation et de session.
 *
 * Tout vit en mémoire : aucune conversation n'est écrite sur disque, et un
 * rechargement de page repart de l'accueil — c'est voulu.
 */
class AppState {
  screen = $state<Screen>('home')
  #returnTo: Screen = 'home'

  /** Fichier déposé, en attente ou en cours de lecture. */
  pendingFile = $state<File | null>(null)

  conversations = $state<Conversation[]>([])
  selected = $state<Conversation | null>(null)
  /** Discussions à deux écartées lors du dernier parsing. */
  skippedOneToOne = $state(0)
  /** Plafond appliqué au parsing en cours, pour pouvoir le signaler à l'écran. */
  messageCap = $state<number | undefined>(undefined)

  progress = $state<ParseProgress>({ ratio: 0, stepKey: 'parsing.step.reading' })
  error = $state<ParseError | null>(null)

  #handle: ParseHandle | null = null

  goto(screen: Screen): void {
    if (screen === 'help') this.#returnTo = this.screen === 'help' ? this.#returnTo : this.screen
    this.screen = screen
  }

  leaveHelp(): void {
    this.screen = this.#returnTo
  }

  /**
   * Point d'entrée depuis la zone de dépôt. Sur une grosse archive, on passe
   * d'abord par l'écran de choix plutôt que de décider à la place de l'utilisateur.
   */
  submitFile(file: File): void {
    this.error = null
    this.pendingFile = file
    if (file.size > LARGE_ARCHIVE_BYTES) this.goto('archive-size')
    else this.startParsing({})
  }

  startParsing(options: ParseOptions): void {
    const file = this.pendingFile
    if (!file) return

    this.error = null
    this.messageCap = options.maxMessagesPerThread
    this.progress = { ratio: 0, stepKey: 'parsing.step.reading' }
    this.goto('parsing')

    const handle = parseInWorker(file, options, (progress) => {
      this.progress = progress
    })
    this.#handle = handle

    handle.result.then(
      (result) => {
        // Un résultat arrivé après une annulation ne doit rien changer à l'écran.
        if (this.#handle !== handle) return
        this.#handle = null
        this.conversations = result.conversations
        this.skippedOneToOne = result.skippedOneToOne
        this.#afterParsing()
      },
      (error: ParseError) => {
        if (this.#handle !== handle) return
        this.#handle = null
        this.error = error
      },
    )
  }

  /** Partie de démonstration : aucune lecture de fichier, aucun worker. */
  startDemo(): void {
    this.cancelParsing()
    this.pendingFile = null
    this.error = null
    this.skippedOneToOne = 0
    this.messageCap = undefined
    this.conversations = [buildDemoConversation()]
    this.#afterParsing()
  }

  /** Une seule conversation : l'écran de sélection n'aurait rien à sélectionner. */
  #afterParsing(): void {
    if (this.conversations.length === 1) this.select(this.conversations[0])
    else this.goto('threads')
  }

  select(conversation: Conversation): void {
    this.selected = conversation
    this.goto('identities')
  }

  cancelParsing(): void {
    this.#handle?.cancel()
    this.#handle = null
  }

  /** Retour à l'accueil : on relâche explicitement toutes les données lues. */
  reset(): void {
    this.cancelParsing()
    this.pendingFile = null
    this.conversations = []
    this.selected = null
    this.skippedOneToOne = 0
    this.messageCap = undefined
    this.error = null
    this.progress = { ratio: 0, stepKey: 'parsing.step.reading' }
    this.screen = 'home'
  }
}

export const app = new AppState()
