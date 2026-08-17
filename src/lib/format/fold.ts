/**
 * Repli d'une chaîne pour comparaison : minuscules, sans accents.
 *
 * Utilisé partout où deux textes doivent être comparés « à la lecture » plutôt
 * qu'octet par octet — détecter le prénom de l'auteur dans son message,
 * repérer deux graphies d'un même participant, dédupliquer.
 */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}
