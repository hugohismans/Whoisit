import type { Message } from '../types'

/** Helpers partagés par les parseurs, sans dépendance à un format particulier. */

/**
 * Participants triés du plus bavard au moins bavard — l'ordre utile partout
 * dans l'interface.
 *
 * À calculer sur l'intégralité du fil, avant tout plafonnement : la liste des
 * participants ne doit pas dépendre du nombre de messages conservés.
 */
export function rankParticipants(messages: Message[]): string[] {
  const counts = new Map<string, number>()
  for (const message of messages) {
    counts.set(message.author, (counts.get(message.author) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([author]) => author)
}

/**
 * Plafond mémoire : on garde les messages les plus récents, qui sont aussi ceux
 * dont l'utilisateur se souvient le mieux. Les index sont refaits, car ils
 * servent à retrouver le contexte dans le tableau finalement conservé.
 */
export function capMessages(messages: Message[], max: number | undefined): Message[] {
  if (max === undefined || messages.length <= max) return messages
  return messages.slice(-max).map((message, index) => ({ ...message, i: index }))
}
