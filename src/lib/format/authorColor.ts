/**
 * Couleur stable par participant.
 *
 * Dans une vraie appli de messagerie, chacun a sa couleur, et c'est ce qui rend
 * un fil lisible d'un coup d'œil. La teinte est dérivée du nom : elle ne change
 * jamais d'une partie à l'autre, et rien n'a besoin d'être stocké.
 *
 * Attention : cette couleur n'est utilisée que dans la vue contexte, *après* la
 * réponse. Colorer les noms pendant la question donnerait un indice visuel qui
 * n'a rien à faire là.
 */

/** FNV-1a — court, stable, largement suffisant pour choisir une teinte. */
function hash(value: string): number {
  let result = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 0x01000193)
  }
  return result >>> 0
}

/**
 * Teintes retenues à la main plutôt que réparties sur tout le cercle : les
 * jaunes-verts et les bruns ressortent mal sur le fond sombre du jeu.
 */
const HUES = [165, 200, 265, 320, 15, 40, 100, 230, 290, 350]

export function authorHue(author: string): number {
  return HUES[hash(author) % HUES.length]
}

/** Couleur du nom et de la pastille d'initiale. */
export function authorColor(author: string): string {
  return `oklch(0.78 0.13 ${authorHue(author)})`
}

/** Fond discret de la pastille, dans la même teinte. */
export function authorTint(author: string): string {
  return `oklch(0.78 0.13 ${authorHue(author)} / 0.16)`
}

/**
 * Initiales affichées dans la pastille. Un numéro de téléphone n'a pas
 * d'initiale utile : on retombe sur un symbole neutre.
 */
export function initials(author: string): string {
  const letters = author
    .split(/[\s._\-/]+/)
    .map((token) => [...token].find((char) => /\p{L}/u.test(char)))
    .filter((char): char is string => char !== undefined)

  if (letters.length === 0) return '#'
  return (letters[0] + (letters[1] ?? '')).toUpperCase()
}
