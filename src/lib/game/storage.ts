/**
 * Persistance du meilleur score.
 *
 * C'est la seule chose que le jeu écrive sur l'appareil, et volontairement la
 * plus pauvre possible : un entier. Pas de titre de conversation, pas de nom de
 * participant, pas un mot de message.
 *
 * Un record *par conversation* serait plus agréable, mais il faudrait une clé
 * dérivée du fil — et cette clé trahirait dans `localStorage` quelles
 * conversations ont été jouées. Un record unique évite la question.
 */

const BEST_STREAK_KEY = 'whoisit.bestStreak'

export function readBestStreak(): number {
  try {
    const raw = localStorage.getItem(BEST_STREAK_KEY)
    if (raw === null) return 0
    const value = Number.parseInt(raw, 10)
    // Une valeur trafiquée ou corrompue ne doit pas casser l'affichage.
    return Number.isFinite(value) && value >= 0 ? value : 0
  } catch {
    // localStorage indisponible (mode privé strict, stockage désactivé).
    return 0
  }
}

export function writeBestStreak(value: number): void {
  if (!Number.isFinite(value) || value < 0) return
  try {
    localStorage.setItem(BEST_STREAK_KEY, String(Math.floor(value)))
  } catch {
    // Le record n'est pas essentiel : on joue très bien sans.
  }
}

/** Efface le record. Utile depuis la console, et pour les tests. */
export function clearBestStreak(): void {
  try {
    localStorage.removeItem(BEST_STREAK_KEY)
  } catch {
    // Rien à faire.
  }
}
