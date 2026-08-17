import { beforeEach, describe, expect, it } from 'vitest'
import { Game, MAX_DIFFICULTY_STREAK, minCharsForStreak, STARTING_LIVES } from '../src/lib/game/engine.svelte'
import { EASIEST_MIN_CHARS, DEFAULT_ELIGIBILITY } from '../src/lib/game/eligibility'
import { createRng } from '../src/lib/game/random'
import { clearBestStreak, readBestStreak, writeBestStreak } from '../src/lib/game/storage'
import type { Conversation, Message } from '../src/lib/types'

function conversation(perAuthor = 30): Conversation {
  const authors = ['Ana', 'Bo', 'Cy', 'Dia']
  const messages: Message[] = []

  for (const author of authors) {
    for (let index = 0; index < perAuthor; index += 1) {
      messages.push({
        i: messages.length,
        author,
        text: `Message numéro ${messages.length} écrit par quelqu’un de ce groupe, assez long pour dépasser confortablement tous les seuils d’éligibilité du jeu.`,
        ts: messages.length * 60_000,
      })
    }
  }

  return { source: 'demo', title: 'Test', participants: authors, messages }
}

/** Joue un tour en donnant volontairement la bonne ou la mauvaise réponse. */
function play(game: Game, correctly: boolean): void {
  const round = game.round!
  const choice = correctly
    ? round.author
    : round.options.find((option) => option !== round.author)!
  game.submit(choice)
  game.next()
}

beforeEach(() => clearBestStreak())

describe('minCharsForStreak', () => {
  it('part du seuil normal et descend jusqu’au plus permissif', () => {
    expect(minCharsForStreak(0)).toBe(DEFAULT_ELIGIBILITY.minChars)
    expect(minCharsForStreak(MAX_DIFFICULTY_STREAK)).toBe(EASIEST_MIN_CHARS)
  })

  it('descend de façon monotone, puis se stabilise', () => {
    for (let streak = 1; streak <= MAX_DIFFICULTY_STREAK; streak += 1) {
      expect(minCharsForStreak(streak)).toBeLessThanOrEqual(minCharsForStreak(streak - 1))
    }
    expect(minCharsForStreak(50)).toBe(EASIEST_MIN_CHARS)
  })
})

describe('déroulement d’une partie', () => {
  it('commence avec trois vies et une question', () => {
    const game = Game.create(conversation(), createRng(1))!
    expect(game.lives).toBe(STARTING_LIVES)
    expect(game.round).not.toBeNull()
    expect(game.answered).toBe(false)
    expect(game.over).toBe(false)
  })

  it('ne coûte pas de vie sur une bonne réponse et fait monter la série', () => {
    const game = Game.create(conversation(), createRng(2))!

    play(game, true)
    play(game, true)

    expect(game.lives).toBe(STARTING_LIVES)
    expect(game.streak).toBe(2)
    expect(game.correctCount).toBe(2)
    expect(game.missed).toHaveLength(0)
  })

  it('coûte une vie sur une erreur et remet la série à zéro', () => {
    const game = Game.create(conversation(), createRng(3))!

    play(game, true)
    play(game, false)

    expect(game.lives).toBe(STARTING_LIVES - 1)
    expect(game.streak).toBe(0)
    expect(game.bestStreak).toBe(1)
    expect(game.missed).toHaveLength(1)
    expect(game.missed[0].answer).not.toBe(game.missed[0].author)
  })

  it('se termine après trois erreurs, pas avant', () => {
    const game = Game.create(conversation(), createRng(4))!

    play(game, false)
    expect(game.over).toBe(false)
    play(game, false)
    expect(game.over).toBe(false)
    play(game, false)

    expect(game.over).toBe(true)
    expect(game.ending).toBe('no-lives')
    expect(game.missed).toHaveLength(3)
  })

  it('laisse voir le résultat de la réponse fatale avant de terminer', () => {
    const game = Game.create(conversation(), createRng(5))!
    play(game, false)
    play(game, false)

    const round = game.round!
    game.submit(round.options.find((option) => option !== round.author)!)

    // Plus de vies, mais la partie n'est pas encore close : le joueur voit
    // d'abord qui avait écrit le message.
    expect(game.lives).toBe(0)
    expect(game.over).toBe(false)
    expect(game.answered).toBe(true)

    game.next()
    expect(game.over).toBe(true)
  })

  it('ignore une seconde réponse sur le même tour', () => {
    const game = Game.create(conversation(), createRng(6))!
    const round = game.round!

    game.submit(round.author)
    game.submit(round.options.find((option) => option !== round.author)!)

    expect(game.answeredCount).toBe(1)
    expect(game.correctCount).toBe(1)
    expect(game.lives).toBe(STARTING_LIVES)
  })

  it('ne repose jamais deux fois le même message', () => {
    const game = Game.create(conversation(), createRng(7))!
    const seen = new Set<number>()

    while (game.round && !game.over && seen.size < 60) {
      expect(seen.has(game.round.message.i)).toBe(false)
      seen.add(game.round.message.i)
      play(game, true)
    }

    expect(seen.size).toBeGreaterThan(20)
  })

  it('se termine proprement quand le vivier s’épuise', () => {
    // Juste assez de messages pour quelques tours.
    const game = Game.create(conversation(2), createRng(8))!

    let guard = 0
    while (!game.over && guard < 100) {
      play(game, true)
      guard += 1
    }

    expect(game.over).toBe(true)
    expect(game.ending).toBe('exhausted')
  })

  it('durcit la difficulté à mesure que la série monte', () => {
    const game = Game.create(conversation(), createRng(9))!
    const atStart = game.minChars

    for (let round = 0; round < 5; round += 1) play(game, true)

    expect(game.minChars).toBeLessThan(atStart)
  })
})

describe('record', () => {
  it('retient la meilleure série et la signale', () => {
    const game = Game.create(conversation(), createRng(10))!

    for (let round = 0; round < 4; round += 1) play(game, true)

    expect(game.bestStreak).toBe(4)
    expect(game.brokeRecord).toBe(true)
    expect(readBestStreak()).toBe(4)
  })

  it('ne signale pas de record quand l’ancien n’est pas battu', () => {
    writeBestStreak(10)
    const game = Game.create(conversation(), createRng(11))!

    for (let round = 0; round < 3; round += 1) play(game, true)

    expect(game.record).toBe(10)
    expect(game.brokeRecord).toBe(false)
    expect(readBestStreak()).toBe(10)
  })

  it('ne conserve que le meilleur d’une série interrompue', () => {
    const game = Game.create(conversation(), createRng(12))!

    for (let round = 0; round < 5; round += 1) play(game, true)
    play(game, false)
    play(game, true)

    expect(game.streak).toBe(1)
    expect(game.bestStreak).toBe(5)
    expect(readBestStreak()).toBe(5)
  })
})

describe('conversations injouables', () => {
  it('renvoie null plutôt que de démarrer une partie impossible', () => {
    expect(
      Game.create({
        source: 'demo',
        title: 'trop courte',
        participants: ['A', 'B'],
        messages: [
          { i: 0, author: 'A', text: 'ok', ts: 0 },
          { i: 1, author: 'B', text: 'oui', ts: 1 },
        ],
      }),
    ).toBeNull()
  })
})

describe('stockage', () => {
  it('n’écrit qu’une clé, dont la valeur est un entier', () => {
    const before = new Set(Object.keys(localStorage))
    writeBestStreak(7)

    const added = Object.keys(localStorage).filter((key) => !before.has(key))
    expect(added).toEqual(['whoisit.bestStreak'])
    expect(localStorage.getItem('whoisit.bestStreak')).toBe('7')
  })

  it('résiste à une valeur corrompue', () => {
    localStorage.setItem('whoisit.bestStreak', 'not-a-number')
    expect(readBestStreak()).toBe(0)
    localStorage.setItem('whoisit.bestStreak', '-5')
    expect(readBestStreak()).toBe(0)
  })
})
