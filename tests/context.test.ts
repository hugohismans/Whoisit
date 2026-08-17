import { describe, expect, it } from 'vitest'
import { CONTEXT_RADIUS, contextWindow, toTranscript } from '../src/lib/game/context'
import type { Message } from '../src/lib/types'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function messages(count: number, spacing = 2 * MINUTE): Message[] {
  return Array.from({ length: count }, (_, index) => ({
    i: index,
    author: index % 2 === 0 ? 'Ana' : 'Bo',
    text: `message ${index}`,
    ts: index * spacing,
  }))
}

describe('contextWindow', () => {
  const all = messages(100)

  it('centre la fenêtre sur le message visé', () => {
    const window = contextWindow(all, 50)

    expect(window.messages).toHaveLength(CONTEXT_RADIUS * 2 + 1)
    expect(window.messages[window.targetIndex].i).toBe(50)
    expect(window.atStart).toBe(false)
    expect(window.atEnd).toBe(false)
  })

  it('décale la fenêtre au début plutôt que de la rogner', () => {
    // Un message en deuxième position doit quand même s'accompagner d'une
    // vingtaine de messages, sinon la vue paraît vide sans raison.
    const window = contextWindow(all, 1)

    expect(window.messages).toHaveLength(CONTEXT_RADIUS * 2 + 1)
    expect(window.messages[window.targetIndex].i).toBe(1)
    expect(window.atStart).toBe(true)
    expect(window.atEnd).toBe(false)
  })

  it('décale la fenêtre à la fin de la même façon', () => {
    const window = contextWindow(all, all.length - 2)

    expect(window.messages).toHaveLength(CONTEXT_RADIUS * 2 + 1)
    expect(window.messages[window.targetIndex].i).toBe(all.length - 2)
    expect(window.atEnd).toBe(true)
    expect(window.atStart).toBe(false)
  })

  it('rend toute la conversation quand elle est plus courte que la fenêtre', () => {
    const few = messages(5)
    const window = contextWindow(few, 2)

    expect(window.messages).toHaveLength(5)
    expect(window.messages[window.targetIndex].i).toBe(2)
    expect(window.atStart).toBe(true)
    expect(window.atEnd).toBe(true)
  })

  it('s’élargit à la demande sans perdre le message visé', () => {
    const narrow = contextWindow(all, 50, 5)
    const wide = contextWindow(all, 50, 25)

    expect(narrow.messages).toHaveLength(11)
    expect(wide.messages).toHaveLength(51)
    expect(wide.messages[wide.targetIndex].i).toBe(50)
  })
})

describe('toTranscript', () => {
  it('regroupe les messages consécutifs d’un même auteur', () => {
    const burst: Message[] = [
      { i: 0, author: 'Ana', text: 'un', ts: 0 },
      { i: 1, author: 'Ana', text: 'deux', ts: MINUTE },
      { i: 2, author: 'Ana', text: 'trois', ts: 2 * MINUTE },
      { i: 3, author: 'Bo', text: 'quatre', ts: 3 * MINUTE },
    ]

    const rows = toTranscript(burst)

    expect(rows.map((row) => row.showAuthor)).toEqual([true, false, false, true])
  })

  it('réaffiche l’auteur après un silence, même s’il n’a pas changé', () => {
    const rows = toTranscript([
      { i: 0, author: 'Ana', text: 'un', ts: 0 },
      { i: 1, author: 'Ana', text: 'deux', ts: 30 * MINUTE },
    ])

    expect(rows[1].showAuthor).toBe(true)
  })

  it('marque une rupture au changement de jour', () => {
    const rows = toTranscript([
      { i: 0, author: 'Ana', text: 'un', ts: new Date(2024, 0, 1, 23, 0).getTime() },
      { i: 1, author: 'Ana', text: 'deux', ts: new Date(2024, 0, 2, 9, 0).getTime() },
    ])

    expect(rows[1].showDateBreak).toBe(true)
  })

  it('marque une rupture après une longue absence dans la même journée', () => {
    const rows = toTranscript([
      { i: 0, author: 'Ana', text: 'un', ts: new Date(2024, 0, 1, 9, 0).getTime() },
      { i: 1, author: 'Bo', text: 'deux', ts: new Date(2024, 0, 1, 18, 0).getTime() },
    ])

    expect(rows[1].showDateBreak).toBe(true)
  })

  it('ne marque aucune rupture dans un échange rapproché', () => {
    const rows = toTranscript(messages(6, MINUTE))
    expect(rows.slice(1).every((row) => !row.showDateBreak)).toBe(true)
  })

  it('ouvre toujours par un séparateur et un en-tête d’auteur', () => {
    const rows = toTranscript(messages(3))
    expect(rows[0].showDateBreak).toBe(true)
    expect(rows[0].showAuthor).toBe(true)
  })

  it('accepte une tranche vide', () => {
    expect(toTranscript([])).toEqual([])
  })

  it('gère une conversation étalée sur plusieurs jours', () => {
    const spread = messages(4, DAY)
    const rows = toTranscript(spread)
    expect(rows.every((row) => row.showDateBreak)).toBe(true)
  })
})
