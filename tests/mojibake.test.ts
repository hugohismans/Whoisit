import { describe, expect, it } from 'vitest'
import { repairDeep, repairMetaEncoding } from '../src/lib/parsing/mojibake'

/**
 * Le mojibake des exports Meta : de l'UTF-8 relu comme du latin-1.
 * Les entrées de ces tests sont écrites en points de code explicites plutôt
 * qu'en caractères « Ã© » collés, pour qu'aucun outil de la chaîne (éditeur,
 * formateur, encodage du dépôt) ne puisse les « corriger » en douce.
 */
const mojibake = (...bytes: number[]) => String.fromCharCode(...bytes)

describe('repairMetaEncoding', () => {
  it('répare les accents français', () => {
    // « é » = U+00E9, encodé en UTF-8 par 0xC3 0xA9.
    expect(repairMetaEncoding(`caf${mojibake(0xc3, 0xa9)}`)).toBe('café')
    // « à » = 0xC3 0xA0, où 0xA0 est l'espace insécable — le cas qui casse
    // les réparations naïves basées sur des remplacements de chaînes.
    expect(repairMetaEncoding(`d${mojibake(0xc3, 0xa9)}j${mojibake(0xc3, 0xa0)}`)).toBe('déjà')
    expect(repairMetaEncoding(`In${mojibake(0xc3, 0xa8)}s`)).toBe('Inès')
    expect(repairMetaEncoding(`o${mojibake(0xc3, 0xb9)} ${mojibake(0xc3, 0xa7)}a`)).toBe('où ça')
  })

  it('répare les emoji, y compris hors du plan multilingue de base', () => {
    // 😀 U+1F600 = 0xF0 0x9F 0x98 0x80
    expect(repairMetaEncoding(mojibake(0xf0, 0x9f, 0x98, 0x80))).toBe('😀')
    // ❤️ = cœur U+2764 + sélecteur de variante U+FE0F
    expect(repairMetaEncoding(mojibake(0xe2, 0x9d, 0xa4, 0xef, 0xb8, 0x8f))).toBe('❤️')
    expect(repairMetaEncoding(`bravo ${mojibake(0xf0, 0x9f, 0x91, 0x8d)}`)).toBe('bravo 👍')
  })

  it('laisse l’ASCII intact', () => {
    expect(repairMetaEncoding('hello world')).toBe('hello world')
    expect(repairMetaEncoding('')).toBe('')
  })

  it('ne touche pas à une chaîne déjà correctement encodée', () => {
    // Le piège inverse : appliquer la réparation deux fois détruirait le texte.
    expect(repairMetaEncoding('café')).toBe('café')
    expect(repairMetaEncoding('déjà vu 😀')).toBe('déjà vu 😀')
    expect(repairMetaEncoding(repairMetaEncoding(`caf${mojibake(0xc3, 0xa9)}`))).toBe('café')
  })

  it('rend l’original quand les octets ne forment pas de l’UTF-8 valide', () => {
    // 0xE9 seul, c'est du vrai latin-1 : « é » en ISO-8859-1, pas du mojibake.
    const latin1 = mojibake(0xe9)
    expect(repairMetaEncoding(latin1)).toBe(latin1)
  })
})

describe('repairDeep', () => {
  it('parcourt objets et tableaux imbriqués', () => {
    const input = {
      title: `Les d${mojibake(0xc3, 0xa9)}m${mojibake(0xc3, 0xa9)}nageurs`,
      messages: [{ content: `c${mojibake(0xc3, 0xa9)}dez le passage`, timestamp_ms: 42 }],
      count: 3,
      flag: true,
      nothing: null,
    }

    expect(repairDeep(input)).toEqual({
      title: 'Les déménageurs',
      messages: [{ content: 'cédez le passage', timestamp_ms: 42 }],
      count: 3,
      flag: true,
      nothing: null,
    })
  })
})
