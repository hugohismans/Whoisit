import { describe, expect, it } from 'vitest'
import { fr } from '../src/lib/i18n/fr'
import { en } from '../src/lib/i18n/en'
import { helpContent } from '../src/lib/i18n/help'
import { locale, setLocale, t, tCount } from '../src/lib/i18n/index.svelte'

describe('dictionnaires', () => {
  it('couvrent exactement les mêmes clés', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
  })

  it('ne contient aucune traduction vide', () => {
    for (const [key, value] of Object.entries({ ...fr, ...en })) {
      expect(value.trim(), `clé vide : ${key}`).not.toBe('')
    }
  })

  it('couvre les mêmes plateformes dans la page d’aide', () => {
    expect(helpContent.en.map((s) => s.platform)).toEqual(helpContent.fr.map((s) => s.platform))
  })

  it('déclare une forme « other » pour chaque famille accordée en nombre', () => {
    // `tCount` retombe sur `.other` quand la catégorie de pluriel de la locale
    // n'existe pas : cette forme est donc obligatoire, les autres facultatives.
    for (const dictionary of [fr, en]) {
      const families = new Set(
        Object.keys(dictionary)
          .filter((key) => /\.(zero|one|two|few|many|other)$/.test(key))
          .map((key) => key.slice(0, key.lastIndexOf('.'))),
      )
      for (const family of families) {
        expect(Object.keys(dictionary), `${family} sans forme « other »`).toContain(
          `${family}.other`,
        )
      }
    }
  })
})

describe('t()', () => {
  it('substitue les variables', () => {
    setLocale('fr')
    expect(t('game.wrong', { author: 'Camille' })).toBe('Raté — c’était Camille.')
  })

  it('laisse les placeholders inconnus intacts plutôt que d’afficher "undefined"', () => {
    expect(t('game.wrong', {})).toContain('{author}')
  })

  it('accorde en nombre selon les règles de la locale', () => {
    setLocale('fr')
    expect(tCount('threads.participantCount', 1)).toBe('1 participant')
    expect(tCount('threads.participantCount', 4)).toBe('4 participants')
    // Le français accorde « 0 » au singulier, l'anglais au pluriel.
    expect(tCount('threads.participantCount', 0)).toBe('0 participant')

    setLocale('en')
    expect(tCount('threads.participantCount', 1)).toBe('1 participant')
    expect(tCount('threads.participantCount', 0)).toBe('0 participants')
    setLocale('fr')
  })

  it('laisse le nombre formaté prendre le pas sur le nombre brut', () => {
    setLocale('fr')
    expect(tCount('threads.messageCount', 50000, { count: '50 000' })).toBe('50 000 messages')
  })

  it('suit le changement de locale', () => {
    setLocale('en')
    expect(locale()).toBe('en')
    expect(t('app.title')).toBe('Who said that?')
    setLocale('fr')
    expect(t('app.title')).toBe('Qui a dit ça ?')
  })
})
