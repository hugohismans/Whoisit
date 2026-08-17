/**
 * Nettoyage de texte partagé par tous les parseurs.
 *
 * Les exports WhatsApp iOS sont truffés de marques de direction Unicode
 * invisibles (U+200E notamment, posée avant chaque en-tête de ligne et avant
 * les placeholders média). Elles cassent les expressions régulières les plus
 * évidentes et se retrouvent affichées telles quelles si on ne les enlève pas.
 *
 * Les classes de caractères sont construites depuis leurs points de code plutôt
 * qu'écrites littéralement : ces caractères sont invisibles dans un éditeur, et
 * un copier-coller malheureux les ferait disparaître du code sans que personne
 * ne le remarque.
 */

type CodeRange = readonly [start: number, end: number]

function charClass(ranges: readonly CodeRange[]): RegExp {
  const body = ranges
    .map(([start, end]) =>
      start === end
        ? String.fromCharCode(start)
        : `${String.fromCharCode(start)}-${String.fromCharCode(end)}`,
    )
    .join('')
  return new RegExp(`[${body}]`, 'g')
}

/** Invisibles à retirer partout. */
const INVISIBLE = charClass([
  [0x200b, 0x200f], // espace de largeur nulle, ZWNJ, ZWJ, LRM, RLM
  [0x202a, 0x202e], // incorporation et override de direction
  [0x2066, 0x2069], // isolats de direction
  [0xfeff, 0xfeff], // BOM
])

/** Espaces exotiques ramenés à l'espace ASCII. */
const EXOTIC_SPACES = charClass([
  [0x00a0, 0x00a0], // insécable
  [0x2007, 0x2007], // espace chiffre
  [0x2009, 0x2009], // espace fine
  [0x202f, 0x202f], // fine insécable — posée avant AM/PM par certaines locales
])

export function stripInvisible(input: string): string {
  return input.replace(INVISIBLE, '')
}

/**
 * Normalise une ligne brute : marques invisibles retirées, espaces exotiques
 * ramenés à l'espace ASCII, retour chariot Windows supprimé.
 */
export function normalizeLine(input: string): string {
  return stripInvisible(input).replace(EXOTIC_SPACES, ' ').replace(/\r$/, '')
}

/** Découpe un fichier texte en lignes, quel que soit le style de fin de ligne. */
export function toLines(content: string): string[] {
  return stripInvisible(content).split(/\r\n|\r|\n/)
}

/**
 * Compte les mots d'un message. Utilisé par les filtres d'éligibilité, donc
 * volontairement simple et rapide : on sépare sur les blancs.
 */
export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}
