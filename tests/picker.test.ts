import { describe, expect, it } from 'vitest'
import { buildPlayableSet } from '../src/lib/game/eligibility'
import { optionCountFor, pickRound } from '../src/lib/game/picker'
import { createRng } from '../src/lib/game/random'
import type { Conversation, Message } from '../src/lib/types'

/**
 * Une conversation de groupe réaliste : deux personnes écrivent 70 % du total.
 * C'est exactement la situation où un tirage naïf ferait de « répondre le plus
 * bavard » une stratégie gagnante.
 */
function lopsidedConversation(): Conversation {
  const distribution: Record<string, number> = {
    Bavarde: 350,
    Prolixe: 350,
    Moyenne: 150,
    Discret: 100,
    Rare: 50,
  }

  const messages: Message[] = []
  for (const [author, count] of Object.entries(distribution)) {
    for (let index = 0; index < count; index += 1) {
      messages.push({
        i: messages.length,
        author,
        text: `Voici un message parfaitement ordinaire numéro ${messages.length}, écrit pour dépasser confortablement les seuils de longueur et de nombre de mots.`,
        ts: messages.length,
      })
    }
  }

  return {
    source: 'demo',
    title: 'Groupe déséquilibré',
    participants: Object.keys(distribution),
    messages,
  }
}

describe('équilibrage — le cœur du jeu', () => {
  const set = buildPlayableSet(lopsidedConversation())!

  it('tire les auteurs uniformément, malgré un groupe très déséquilibré', () => {
    const rng = createRng(1234)
    const draws = 20_000
    const counts = new Map<string, number>()

    for (let round = 0; round < draws; round += 1) {
      const picked = pickRound(set, { rng, optionCount: 4 })!
      counts.set(picked.author, (counts.get(picked.author) ?? 0) + 1)
    }

    const expected = draws / set.authors.length
    for (const author of set.authors) {
      const observed = counts.get(author) ?? 0
      // Bavarde écrit sept fois plus que Rare ; sans équilibrage on serait à
      // 35 % contre 5 %. Chacun doit sortir autour de 20 %.
      expect(Math.abs(observed - expected) / expected).toBeLessThan(0.06)
    }
  })

  it('« répondre toujours le plus bavard » ne bat pas le hasard', () => {
    const rng = createRng(99)
    const draws = 5_000
    let correct = 0

    for (let round = 0; round < draws; round += 1) {
      if (pickRound(set, { rng })!.author === 'Bavarde') correct += 1
    }

    // 35 % si l'on tirait un message au hasard ; ici on doit tomber à 1/5.
    expect(correct / draws).toBeLessThan(0.25)
  })

  it('propose toujours la bonne réponse, mélangée parmi des propositions distinctes', () => {
    const rng = createRng(7)

    for (let round = 0; round < 500; round += 1) {
      const picked = pickRound(set, { rng, optionCount: 4 })!

      expect(picked.options).toContain(picked.author)
      expect(new Set(picked.options).size).toBe(picked.options.length)
      expect(picked.options).toHaveLength(4)
    }
  })

  it('ne propose que des noms qui peuvent réellement être la réponse', () => {
    const rng = createRng(31)

    for (let round = 0; round < 500; round += 1) {
      for (const option of pickRound(set, { rng, optionCount: 4 })!.options) {
        expect(set.authors).toContain(option)
      }
    }
  })

  it('ne place pas la bonne réponse toujours au même endroit', () => {
    const rng = createRng(2024)
    const positions = new Map<number, number>()

    for (let round = 0; round < 4_000; round += 1) {
      const picked = pickRound(set, { rng, optionCount: 4 })!
      const index = picked.options.indexOf(picked.author)
      positions.set(index, (positions.get(index) ?? 0) + 1)
    }

    for (const index of [0, 1, 2, 3]) {
      expect(Math.abs((positions.get(index) ?? 0) - 1_000) / 1_000).toBeLessThan(0.12)
    }
  })
})

describe('pickRound', () => {
  const set = buildPlayableSet(lopsidedConversation())!

  it('ne repose jamais un message déjà utilisé', () => {
    const rng = createRng(5)
    const used = new Set<number>()

    for (let round = 0; round < 300; round += 1) {
      const picked = pickRound(set, { rng, used })!
      expect(used.has(picked.message.i)).toBe(false)
      used.add(picked.message.i)
    }
  })

  it('respecte le seuil de longueur du tour', () => {
    const rng = createRng(11)
    for (let round = 0; round < 200; round += 1) {
      const picked = pickRound(set, { rng, minChars: 120 })
      if (picked) expect(picked.message.text.length).toBeGreaterThanOrEqual(120)
    }
  })

  it('renvoie null quand le vivier est épuisé plutôt que de poser une fausse question', () => {
    const rng = createRng(3)
    // Tous les messages sauf ceux d'une seule autrice sont déjà passés.
    const used = new Set(
      [...set.byAuthor.entries()]
        .filter(([author]) => author !== 'Rare')
        .flatMap(([, messages]) => messages.map((message) => message.i)),
    )

    expect(pickRound(set, { rng, used })).toBeNull()
  })

  it('n’exige jamais plus de propositions qu’il n’y a de participants', () => {
    const rng = createRng(8)
    const picked = pickRound(set, { rng, optionCount: 20 })!
    expect(picked.options.length).toBeLessThanOrEqual(6)
    expect(picked.options.length).toBeLessThanOrEqual(set.authors.length)
  })
})

describe('optionCountFor', () => {
  it('propose autant d’options que d’auteurs jouables, plafonné à six', () => {
    expect(optionCountFor(buildPlayableSet(lopsidedConversation())!)).toBe(5)
  })
})
