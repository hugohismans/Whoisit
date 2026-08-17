import type { Conversation } from '../types'
import { rankParticipants } from '../parsing/conversation'
import { fold } from '../format/fold'

/**
 * Fusion et renommage de participants.
 *
 * Deux situations très courantes rendent une partie injuste :
 *  - le même contact apparaît sous un numéro brut *et* sous son nom, parce
 *    qu'il a été enregistré entre-temps ;
 *  - quelqu'un a changé de pseudo Messenger en cours de conversation.
 *
 * Dans les deux cas, le joueur perd une vie pour une raison qui n'a rien à voir
 * avec le style d'écriture. Cet écran répare ça avant la partie.
 */

/** Groupe d'identités traitées comme une seule personne. */
export type IdentityGroup = {
  /**
   * Nom de référence du groupe, tel qu'il apparaît dans la conversation.
   * Jamais modifié : il sert d'identité stable pour la sélection et la fusion.
   */
  name: string
  /**
   * Nom choisi par l'utilisateur, ou `null` s'il n'a rien saisi.
   *
   * Séparé de `name` à dessein : quand l'identité est un numéro de téléphone,
   * l'interface n'affiche que sa forme masquée. Si le champ de saisie était
   * pré-rempli avec le nom de référence, le numéro complet apparaîtrait à
   * l'écran malgré le masquage — et éditer le texte masqué renommerait la
   * personne en « +33 6 •• •• 56 78 ».
   */
  renamed: string | null
  /** Noms d'origine réunis dans ce groupe — au moins un. */
  members: string[]
  /** Messages écrits par l'ensemble du groupe. */
  count: number
}

/** Nom sous lequel un groupe sera joué. */
export function resolvedName(group: IdentityGroup): string {
  return group.renamed?.trim() || group.name
}

/** Correspondance nom d'origine → nom affiché. */
export type IdentityMap = Record<string, string>

/** Un groupe par participant, du plus bavard au moins bavard. */
export function initialGroups(conversation: Conversation): IdentityGroup[] {
  const counts = new Map<string, number>()
  for (const message of conversation.messages) {
    counts.set(message.author, (counts.get(message.author) ?? 0) + 1)
  }

  return conversation.participants.map((name) => ({
    name,
    renamed: null,
    members: [name],
    count: counts.get(name) ?? 0,
  }))
}

export function toIdentityMap(groups: IdentityGroup[]): IdentityMap {
  const map: IdentityMap = {}
  for (const group of groups) {
    const name = resolvedName(group)
    for (const member of group.members) map[member] = name
  }
  return map
}

/** Vrai si la carte ne change rien — permet de sauter le travail inutile. */
export function isIdentityMapEmpty(map: IdentityMap): boolean {
  return Object.entries(map).every(([from, to]) => from === to)
}

/**
 * Applique la carte d'identités à une conversation.
 *
 * Les index `i` sont conservés : la vue contexte continue de pointer sur les
 * bons messages après une fusion.
 */
export function applyIdentities(conversation: Conversation, map: IdentityMap): Conversation {
  if (isIdentityMapEmpty(map)) return conversation

  const messages = conversation.messages.map((message) => {
    const renamed = map[message.author]
    return renamed && renamed !== message.author ? { ...message, author: renamed } : message
  })

  return { ...conversation, messages, participants: rankParticipants(messages) }
}

export type MergeSuggestion = {
  names: [string, string]
  reason: 'same-name' | 'prefix'
}

/**
 * Repère les doublons évidents, pour éviter à l'utilisateur de tout inspecter.
 *
 * Deux heuristiques volontairement prudentes — une suggestion fausse coûte plus
 * cher qu'une suggestion manquée, puisqu'elle demande d'être refusée :
 *  - même nom à la casse et aux accents près ;
 *  - l'un est le nom complet de l'autre (« Théo » et « Théo Nguyen »), cas
 *    fréquent des exports Messenger.
 */
export function suggestMerges(participants: string[]): MergeSuggestion[] {
  const suggestions: MergeSuggestion[] = []

  for (let a = 0; a < participants.length; a += 1) {
    for (let b = a + 1; b < participants.length; b += 1) {
      const left = fold(participants[a])
      const right = fold(participants[b])
      if (left === '' || right === '') continue

      if (left === right) {
        suggestions.push({ names: [participants[a], participants[b]], reason: 'same-name' })
        continue
      }

      const leftTokens = left.split(/\s+/)
      const rightTokens = right.split(/\s+/)
      const [shorter, longer] =
        leftTokens.length <= rightTokens.length ? [leftTokens, rightTokens] : [rightTokens, leftTokens]

      // Un prénom seul face à un prénom + nom. On exige que tous les mots du
      // plus court ouvrent le plus long, dans l'ordre.
      const isPrefix =
        shorter.length < longer.length &&
        shorter.every((token, index) => token === longer[index])

      if (isPrefix) {
        suggestions.push({ names: [participants[a], participants[b]], reason: 'prefix' })
      }
    }
  }

  return suggestions
}

/** Fusionne `source` dans `target`, en conservant le nom affiché de `target`. */
export function mergeGroups(
  groups: IdentityGroup[],
  targetName: string,
  sourceNames: string[],
): IdentityGroup[] {
  const absorbed = new Set(sourceNames.filter((name) => name !== targetName))
  if (absorbed.size === 0) return groups

  return groups
    .map((group) => {
      if (group.name !== targetName) return group
      const extra = groups.filter((other) => absorbed.has(other.name))
      return {
        name: group.name,
        renamed: group.renamed,
        members: [...group.members, ...extra.flatMap((other) => other.members)],
        count: group.count + extra.reduce((sum, other) => sum + other.count, 0),
      }
    })
    .filter((group) => !absorbed.has(group.name))
    .sort((a, b) => b.count - a.count)
}
