import { describe, expect, it } from 'vitest'
import { displayName, isPhoneNumber, maskPhoneNumber } from '../src/lib/format/participants'

describe('isPhoneNumber', () => {
  it('reconnaît les numéros dans leurs mises en forme courantes', () => {
    expect(isPhoneNumber('+33 6 12 34 56 78')).toBe(true)
    expect(isPhoneNumber('+44 7700 900123')).toBe(true)
    expect(isPhoneNumber('06 12 34 56 78')).toBe(true)
    expect(isPhoneNumber('+1 (555) 010-9999')).toBe(true)
  })

  it('ne prend pas un prénom pour un numéro', () => {
    expect(isPhoneNumber('Camille')).toBe(false)
    expect(isPhoneNumber('Théo Nguyen')).toBe(false)
    expect(isPhoneNumber('zoé.k')).toBe(false)
    // Un pseudo qui contient des chiffres reste un pseudo.
    expect(isPhoneNumber('marin_b42')).toBe(false)
  })
})

describe('maskPhoneNumber', () => {
  it('conserve l’indicatif, les quatre derniers chiffres et la mise en forme', () => {
    expect(maskPhoneNumber('+33 6 12 34 56 78')).toBe('+33 6 •• •• 56 78')
    expect(maskPhoneNumber('+44 7700 900123')).toBe('+44 7••• ••0123')
  })

  it('laisse intact un numéro trop court pour être masqué utilement', () => {
    expect(maskPhoneNumber('1234567')).toBe('1234567')
  })
})

describe('displayName', () => {
  it('masque les numéros par défaut', () => {
    expect(displayName('+33 6 12 34 56 78')).not.toContain('12 34')
    expect(displayName('+33 6 12 34 56 78')).toContain('•')
  })

  it('laisse les noms ordinaires intacts', () => {
    expect(displayName('Camille')).toBe('Camille')
    expect(displayName('Inès Ferreira')).toBe('Inès Ferreira')
  })

  it('révèle le numéro à la demande — l’écran de fusion d’identités en a besoin', () => {
    expect(displayName('+33 6 12 34 56 78', true)).toBe('+33 6 12 34 56 78')
  })
})
