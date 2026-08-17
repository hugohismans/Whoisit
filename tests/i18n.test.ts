import { describe, expect, it } from 'vitest'
import { fr } from '../src/lib/i18n/fr'
import { en } from '../src/lib/i18n/en'
import { helpContent } from '../src/lib/i18n/help'
import { locale, setLocale, t } from '../src/lib/i18n/index.svelte'

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
})

describe('t()', () => {
  it('substitue les variables', () => {
    setLocale('fr')
    expect(t('game.wrong', { author: 'Camille' })).toBe('Raté — c’était Camille.')
  })

  it('laisse les placeholders inconnus intacts plutôt que d’afficher "undefined"', () => {
    expect(t('game.wrong', {})).toContain('{author}')
  })

  it('suit le changement de locale', () => {
    setLocale('en')
    expect(locale()).toBe('en')
    expect(t('app.title')).toBe('Who said that?')
    setLocale('fr')
    expect(t('app.title')).toBe('Qui a dit ça ?')
  })
})
