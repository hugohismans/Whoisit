import type { Message } from '../types'

/** Nombre de messages affichés de part et d'autre du message deviné. */
export const CONTEXT_RADIUS = 10

/** Élargissement à chaque « voir plus ». */
export const CONTEXT_STEP = 20

export type ContextWindow = {
  messages: Message[]
  /** Position du message deviné *dans la tranche*, pas dans la conversation. */
  targetIndex: number
  /** Vrai si la tranche touche le début / la fin de la conversation. */
  atStart: boolean
  atEnd: boolean
}

/**
 * Tranche de conversation autour d'un message.
 *
 * Au bord de la conversation, la fenêtre est décalée plutôt que rognée : un
 * message situé en deuxième position doit quand même s'accompagner d'une
 * vingtaine de messages, sinon la vue paraît vide sans raison apparente.
 */
export function contextWindow(
  messages: Message[],
  index: number,
  radius: number = CONTEXT_RADIUS,
): ContextWindow {
  const span = Math.min(messages.length, radius * 2 + 1)
  const ideal = index - radius
  const start = Math.max(0, Math.min(ideal, messages.length - span))
  const end = start + span

  return {
    messages: messages.slice(start, end),
    targetIndex: index - start,
    atStart: start === 0,
    atEnd: end >= messages.length,
  }
}

/** Au-delà de ce silence, on marque une rupture dans le fil. */
const GAP_MS = 60 * 60 * 1000

/** En deçà, deux messages du même auteur sont regroupés sous un seul en-tête. */
const GROUPING_MS = 5 * 60 * 1000

export type TranscriptRow = {
  message: Message
  /** Afficher l'en-tête d'auteur : nouvel auteur, ou trop de temps écoulé. */
  showAuthor: boolean
  /** Afficher un séparateur de date au-dessus. */
  showDateBreak: boolean
}

/**
 * Prépare l'affichage d'une tranche : regroupement des messages consécutifs
 * d'un même auteur, et ruptures temporelles. C'est ce qui fait ressembler la
 * vue à une vraie fenêtre de messagerie plutôt qu'à une liste.
 */
export function toTranscript(messages: Message[]): TranscriptRow[] {
  return messages.map((message, index) => {
    const previous = index > 0 ? messages[index - 1] : null

    const newDay =
      previous !== null &&
      new Date(previous.ts).toDateString() !== new Date(message.ts).toDateString()
    const longSilence = previous !== null && message.ts - previous.ts > GAP_MS

    const showDateBreak = previous === null || newDay || longSilence
    const showAuthor =
      previous === null ||
      previous.author !== message.author ||
      showDateBreak ||
      message.ts - previous.ts > GROUPING_MS

    return { message, showAuthor, showDateBreak }
  })
}
