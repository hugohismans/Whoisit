import { describe, expect, it } from 'vitest'
import {
  applyIdentities,
  initialGroups,
  isIdentityMapEmpty,
  mergeGroups,
  suggestMerges,
  toIdentityMap,
} from '../src/lib/identity/merge'
import type { Conversation, Message } from '../src/lib/types'

function conversation(authors: string[]): Conversation {
  const messages: Message[] = authors.map((author, index) => ({
    i: index,
    author,
    text: `message ${index}`,
    ts: index * 1000,
  }))
  return {
    source: 'whatsapp',
    title: 'Test',
    participants: [...new Set(authors)],
    messages,
  }
}

describe('initialGroups', () => {
  it('crée un groupe par participant, avec son nombre de messages', () => {
    const groups = initialGroups(conversation(['Ana', 'Bo', 'Ana', 'Ana']))

    expect(groups).toHaveLength(2)
    expect(groups[0]).toEqual({ name: 'Ana', renamed: null, members: ['Ana'], count: 3 })
    expect(groups[1]).toEqual({ name: 'Bo', renamed: null, members: ['Bo'], count: 1 })
  })
})

describe('mergeGroups', () => {
  const groups = initialGroups(conversation(['Théo Nguyen', 'Théo', 'Théo Nguyen', 'Ana']))

  it('réunit les identités sous le nom de la cible', () => {
    const merged = mergeGroups(groups, 'Théo Nguyen', ['Théo'])

    expect(merged).toHaveLength(2)
    const theo = merged.find((group) => group.name === 'Théo Nguyen')!
    expect(theo.members.sort()).toEqual(['Théo', 'Théo Nguyen'])
    expect(theo.count).toBe(3)
  })

  it('reclasse les groupes du plus bavard au moins bavard', () => {
    expect(mergeGroups(groups, 'Théo Nguyen', ['Théo'])[0].name).toBe('Théo Nguyen')
  })

  it('ne fait rien si la source est la cible', () => {
    expect(mergeGroups(groups, 'Ana', ['Ana'])).toBe(groups)
  })
})

describe('applyIdentities', () => {
  it('renomme les auteurs et refait la liste des participants', () => {
    const source = conversation(['+33 6 12 34 56 78', 'Léa', 'Ana', '+33 6 12 34 56 78'])
    const map = { '+33 6 12 34 56 78': 'Léa', Léa: 'Léa', Ana: 'Ana' }

    const merged = applyIdentities(source, map)

    expect(merged.participants).toEqual(['Léa', 'Ana'])
    expect(merged.messages.filter((message) => message.author === 'Léa')).toHaveLength(3)
  })

  it('conserve les index, pour que la vue contexte reste juste', () => {
    const source = conversation(['Ana', 'Bo', 'Ana'])
    const merged = applyIdentities(source, { Ana: 'Anaïs', Bo: 'Bo' })

    merged.messages.forEach((message, index) => expect(message.i).toBe(index))
    expect(merged.messages[0].text).toBe(source.messages[0].text)
  })

  it('rend la conversation telle quelle quand rien ne change', () => {
    const source = conversation(['Ana', 'Bo'])
    expect(applyIdentities(source, { Ana: 'Ana', Bo: 'Bo' })).toBe(source)
  })
})

describe('toIdentityMap', () => {
  it('associe chaque nom d’origine au nom affiché du groupe', () => {
    const map = toIdentityMap([
      {
        name: '+33 6 12 34 56 78',
        renamed: 'Léa',
        members: ['+33 6 12 34 56 78', 'Lea B.'],
        count: 5,
      },
      { name: 'Ana', renamed: null, members: ['Ana'], count: 2 },
    ])

    expect(map).toEqual({ '+33 6 12 34 56 78': 'Léa', 'Lea B.': 'Léa', Ana: 'Ana' })
    expect(isIdentityMapEmpty(map)).toBe(false)
  })

  it('retombe sur le nom d’origine si le champ a été vidé', () => {
    const map = toIdentityMap([{ name: 'Ana', renamed: '   ', members: ['Ana'], count: 1 }])
    expect(map).toEqual({ Ana: 'Ana' })
    expect(isIdentityMapEmpty(map)).toBe(true)
  })

  it('n’expose jamais le numéro brut comme nom affiché après renommage', () => {
    const map = toIdentityMap([
      { name: '+33 6 12 34 56 78', renamed: 'Léa', members: ['+33 6 12 34 56 78'], count: 4 },
    ])
    expect(Object.values(map)).toEqual(['Léa'])
  })
})

describe('suggestMerges', () => {
  it('repère deux graphies du même nom', () => {
    const [suggestion] = suggestMerges(['Amélie', 'AMELIE', 'Bo'])

    expect(suggestion.reason).toBe('same-name')
    expect(suggestion.names).toEqual(['Amélie', 'AMELIE'])
  })

  it('repère un prénom seul face à un prénom suivi d’un nom', () => {
    const [suggestion] = suggestMerges(['Théo', 'Théo Nguyen'])

    expect(suggestion.reason).toBe('prefix')
    expect(suggestion.names).toEqual(['Théo', 'Théo Nguyen'])
  })

  it('ne suggère rien entre deux personnes distinctes', () => {
    expect(suggestMerges(['Camille', 'Yanis', 'Farah', 'Tom'])).toEqual([])
  })

  it('n’assimile pas deux noms qui partagent seulement un patronyme', () => {
    // « Nguyen Théo » n'ouvre pas « Théo Nguyen » : l'ordre compte.
    expect(suggestMerges(['Nguyen Théo', 'Théo Nguyen'])).toEqual([])
  })

  it('ne suggère rien sur un seul participant', () => {
    expect(suggestMerges(['Ana'])).toEqual([])
  })
})
