import { describe, expect, it } from 'vitest'
import { buildDemoConversation } from '../src/lib/demo/demoConversation'
import { buildPlayableSet } from '../src/lib/game/eligibility'
import { Game } from '../src/lib/game/engine.svelte'
import { createRng } from '../src/lib/game/random'

describe('conversation de démonstration', () => {
  const demo = buildDemoConversation()

  it('avance dans le temps, message après message', () => {
    // La vue contexte affiche les heures : des horodatages non monotones y
    // sautent aux yeux, et donnent l'impression que le parseur est cassé.
    for (let index = 1; index < demo.messages.length; index += 1) {
      expect(demo.messages[index].ts).toBeGreaterThan(demo.messages[index - 1].ts)
    }
  })

  it('numérote ses messages sans trou', () => {
    demo.messages.forEach((message, index) => expect(message.i).toBe(index))
  })

  it('est effectivement jouable', () => {
    const set = buildPlayableSet(demo)!
    expect(set).not.toBeNull()
    expect(set.authors.length).toBeGreaterThanOrEqual(3)
    expect(set.total).toBeGreaterThan(15)
  })

  it('permet d’enchaîner une partie complète', () => {
    const game = Game.create(demo, createRng(1))!
    expect(game).not.toBeNull()

    let rounds = 0
    while (game.round && !game.over && rounds < 100) {
      game.submit(game.round.author)
      game.next()
      rounds += 1
    }

    expect(rounds).toBeGreaterThan(10)
  })

  it('déclare tous ses auteurs dans la liste des participants', () => {
    const authors = new Set(demo.messages.map((message) => message.author))
    for (const author of authors) expect(demo.participants).toContain(author)
  })
})
