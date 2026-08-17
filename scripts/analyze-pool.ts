/**
 * Inspecte le vivier de messages jouables d'une conversation.
 *
 * Outil de développement, jamais embarqué dans le bundle. Il sert à régler les
 * seuils d'éligibilité sur des données concrètes plutôt qu'au jugé, et à
 * vérifier d'un coup d'œil que l'équilibrage tient.
 *
 * Usage :
 *   npm run analyze                       # conversation de démo
 *   npm run analyze -- chemin/export.txt  # un export WhatsApp
 *   npm run analyze -- chemin/archive.zip # une archive Meta ou WhatsApp
 */
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { parseArchive } from '../src/lib/parsing'
import { buildPlayableSet, DEFAULT_ELIGIBILITY } from '../src/lib/game/eligibility'
import { optionCountFor, pickRound } from '../src/lib/game/picker'
import { createRng } from '../src/lib/game/random'
import { buildDemoConversation } from '../src/lib/demo/demoConversation'
import { displayName } from '../src/lib/format/participants'
import type { Conversation } from '../src/lib/types'

const DRAWS = 20_000

async function load(path: string | undefined): Promise<Conversation[]> {
  if (!path) return [buildDemoConversation()]
  const bytes = readFileSync(path)
  const file = new File([bytes], basename(path))
  const { conversations } = await parseArchive(file)
  return conversations
}

function bar(ratio: number, width = 28): string {
  const filled = Math.round(ratio * width)
  return '█'.repeat(filled) + '·'.repeat(Math.max(0, width - filled))
}

function report(conversation: Conversation): void {
  console.log(`\n━━ ${conversation.title}  (${conversation.source})`)
  console.log(
    `   ${conversation.messages.length} messages · ${conversation.participants.length} participants`,
  )

  const set = buildPlayableSet(conversation)
  if (!set) {
    console.log('   ✕ injouable : pas assez de messages exploitables.')
    return
  }

  const relaxed = set.appliedMinMessagesPerAuthor !== DEFAULT_ELIGIBILITY.minMessagesPerAuthor
  console.log(
    `   ${set.total} messages jouables · ${set.authors.length} auteurs · ` +
      `${optionCountFor(set)} propositions par tour`,
  )
  if (relaxed) {
    console.log(
      `   seuil assoupli : ${set.appliedMinMessagesPerAuthor} messages éligibles par auteur ` +
        `(défaut ${DEFAULT_ELIGIBILITY.minMessagesPerAuthor})`,
    )
  }

  // Part de chacun dans la conversation brute — le déséquilibre à corriger.
  const written = new Map<string, number>()
  for (const message of conversation.messages) {
    written.set(message.author, (written.get(message.author) ?? 0) + 1)
  }

  // Part de chacun dans les questions réellement posées.
  const rng = createRng(20240517)
  const drawn = new Map<string, number>()
  for (let round = 0; round < DRAWS; round += 1) {
    const picked = pickRound(set, { rng, optionCount: optionCountFor(set) })
    if (!picked) break
    drawn.set(picked.author, (drawn.get(picked.author) ?? 0) + 1)
  }

  console.log('\n   auteur                  écrit    jouables   questions posées')
  for (const author of set.authors) {
    const share = (written.get(author) ?? 0) / conversation.messages.length
    const asked = (drawn.get(author) ?? 0) / DRAWS
    console.log(
      `   ${displayName(author).padEnd(22).slice(0, 22)} ` +
        `${(share * 100).toFixed(1).padStart(5)}% ` +
        `${String(set.byAuthor.get(author)?.length ?? 0).padStart(8)}   ` +
        `${(asked * 100).toFixed(1).padStart(5)}%  ${bar(asked)}`,
    )
  }

  if (set.benched.length > 0) {
    console.log(
      `\n   écartés (jamais de message assez long) : ` +
        set.benched.map((name) => displayName(name)).join(', '),
    )
  }
}

const conversations = await load(process.argv[2])
for (const conversation of conversations) report(conversation)
console.log()
