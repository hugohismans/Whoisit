import { describe, expect, it } from 'vitest'
import {
  buildPlayableSet,
  DEFAULT_ELIGIBILITY,
  mentionsOwnAuthor,
  playabilityIssue,
} from '../src/lib/game/eligibility'
import type { Conversation, Message } from '../src/lib/types'

const thresholds = { minChars: 80, minWords: 12 }

const message = (author: string, text: string, i = 0): Message => ({ i, author, text, ts: i })

describe('playabilityIssue', () => {
  const long =
    'Je pense sincèrement qu’on devrait partir plus tôt que prévu, sinon on va se retrouver coincés dans les bouchons pendant des heures.'

  it('accepte un message de conversation ordinaire', () => {
    expect(playabilityIssue(long, thresholds)).toBeNull()
  })

  it('écarte les messages trop courts', () => {
    expect(playabilityIssue('ok', thresholds)).toBe('too-short')
    expect(playabilityIssue('oui carrément je suis complètement d’accord', thresholds)).toBe(
      'too-short',
    )
  })

  it('écarte les messages assez longs mais pauvres en mots', () => {
    expect(playabilityIssue('Aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaah', thresholds)).toBe(
      'too-few-words',
    )
  })

  it('écarte un message dont l’URL fait tout le volume', () => {
    // Assez long et assez de mots pour passer les deux premiers seuils, mais
    // une fois le lien retiré il ne reste plus de quoi poser une question.
    expect(
      playabilityIssue(
        'jetez un oeil à ça les amis ça vaut vraiment le coup je vous jure https://example.invalid/x',
        thresholds,
      ),
    ).toBe('link')
  })

  it('garde un vrai message qui contient aussi un lien', () => {
    expect(
      playabilityIssue(
        'J’ai trouvé exactement ce qu’il nous faut et le prix est raisonnable, regardez avant que ça parte : https://example.invalid/x',
        thresholds,
      ),
    ).toBeNull()
  })

  it('écarte les rafales d’emoji et les suites de chiffres', () => {
    // `[...]` et non `[i]` : indexer une chaîne d'emoji par unité UTF-16
    // découperait les paires de substitution en deux moitiés invalides.
    const palette = [...'😂🎉😭🔥🙌']
    const emojiWall = Array.from({ length: 30 }, (_, index) => palette[index % 5]).join(' ')
    expect(emojiWall.length).toBeGreaterThan(thresholds.minChars)
    expect(playabilityIssue(emojiWall, thresholds)).toBe('not-prose')

    const numbers = Array.from({ length: 20 }, (_, index) => `0${index % 10} 4${index % 7}`).join(
      ' / ',
    )
    expect(playabilityIssue(numbers, thresholds)).toBe('not-prose')
  })

  it('écarte un copier-coller empilé sur de nombreuses lignes', () => {
    const pasted = Array.from({ length: 12 }, (_, index) => `Ingrédient numéro ${index}`).join('\n')
    expect(playabilityIssue(pasted, thresholds)).toBe('pasted')
  })

  it('garde les messages écrits en majuscules — c’est un style, pas un défaut', () => {
    expect(
      playabilityIssue(
        'MAIS ATTENDEZ DEUX SECONDES, PERSONNE NE M’A DIT QUE LA RÉUNION AVAIT ÉTÉ DÉPLACÉE À MARDI !',
        thresholds,
      ),
    ).toBeNull()
  })
})

describe('mentionsOwnAuthor', () => {
  it('repère le prénom de l’auteur, quelle que soit la casse ou les accents', () => {
    expect(mentionsOwnAuthor(message('Amélie', 'bon, amelie a encore oublié les clés'))).toBe(true)
    expect(mentionsOwnAuthor(message('Théo Nguyen', 'signé THEO'))).toBe(true)
  })

  it('ne se déclenche pas sur le nom d’un autre participant', () => {
    // Savoir que le message parle de Camille est une déduction légitime.
    expect(mentionsOwnAuthor(message('Yanis', 'Camille a raison sur ce coup-là'))).toBe(false)
  })

  it('ne confond pas un prénom avec un fragment de mot', () => {
    expect(mentionsOwnAuthor(message('Tom', 'demain on prend l’automobile de mon frère'))).toBe(
      false,
    )
    expect(mentionsOwnAuthor(message('Lea', 'je voudrais qu’on realease ça vite'))).toBe(false)
  })

  it('ne déclenche rien sur un auteur qui est un numéro de téléphone', () => {
    expect(mentionsOwnAuthor(message('+33 6 12 34 56 78', 'bonjour tout le monde'))).toBe(false)
  })
})

describe('buildPlayableSet', () => {
  const longFor = (author: string, index: number) =>
    `Message numéro ${index} de ${author.length} caractères, écrit pour dépasser confortablement les seuils de longueur et de nombre de mots exigés.`

  function conversation(counts: Record<string, number>): Conversation {
    const messages: Message[] = []
    for (const [author, count] of Object.entries(counts)) {
      for (let index = 0; index < count; index += 1) {
        messages.push(message(author, longFor(author, messages.length), messages.length))
      }
    }
    return {
      source: 'demo',
      title: 'test',
      participants: Object.keys(counts),
      messages,
    }
  }

  it('déduplique les messages identiques', () => {
    const repeated = longFor('X', 1)
    const set = buildPlayableSet({
      source: 'demo',
      title: 'test',
      participants: ['A', 'B'],
      messages: [
        message('A', repeated, 0),
        message('A', repeated, 1),
        message('A', `   ${repeated.toUpperCase()}  `, 2),
        message('B', longFor('B', 9), 3),
        message('B', longFor('B', 10), 4),
      ],
    })!

    expect(set.byAuthor.get('A')).toHaveLength(1)
  })

  it('retient les auteurs qui ont assez de messages éligibles', () => {
    const set = buildPlayableSet(conversation({ Bavarde: 40, Moyenne: 20, Discret: 16 }))!

    expect(set.authors.sort()).toEqual(['Bavarde', 'Discret', 'Moyenne'])
    expect(set.appliedMinMessagesPerAuthor).toBe(DEFAULT_ELIGIBILITY.minMessagesPerAuthor)
  })

  it('assouplit le seuil plutôt que de refuser une petite conversation', () => {
    const set = buildPlayableSet(conversation({ Ana: 5, Bo: 5, Cy: 5 }))!

    expect(set.authors).toHaveLength(3)
    expect(set.appliedMinMessagesPerAuthor).toBeLessThan(
      DEFAULT_ELIGIBILITY.minMessagesPerAuthor,
    )
  })

  it('écarte complètement un participant actif mais jamais bavard', () => {
    const base = conversation({ Ana: 20, Bo: 20, Cy: 20 })
    // Laconique écrit souvent, mais toujours trop court pour être une question.
    for (let index = 0; index < 12; index += 1) {
      base.messages.push(message('Laconique', 'ok', base.messages.length))
    }
    base.participants.push('Laconique')

    const set = buildPlayableSet(base)!

    // Ni bonne réponse, ni distracteur : le proposer alors qu'il ne peut jamais
    // être la réponse offrirait une élimination gratuite au joueur régulier.
    expect(set.authors).not.toContain('Laconique')
    expect(set.benched).toContain('Laconique')
  })

  it('renvoie null quand il n’y a rien à deviner', () => {
    expect(buildPlayableSet(conversation({ Seule: 30 }))).toBeNull()
    expect(
      buildPlayableSet({
        source: 'demo',
        title: 'vide',
        participants: ['A', 'B', 'C'],
        messages: [message('A', 'ok', 0), message('B', 'oui', 1), message('C', '👍', 2)],
      }),
    ).toBeNull()
  })
})
