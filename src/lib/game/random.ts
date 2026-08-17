/**
 * Aléatoire injectable.
 *
 * Toute la sélection de messages passe par une fonction `Rng` explicite plutôt
 * que par `Math.random` direct : c'est ce qui permet de tester l'équilibrage
 * statistiquement, avec des tirages reproductibles.
 */

export type Rng = () => number

/**
 * Générateur déterministe (mulberry32) — pour les tests et pour rejouer une
 * partie identique. Petit, rapide, distribution largement suffisante ici.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Un élément au hasard, uniformément. */
export function pickOne<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)]
}

/** Mélange de Fisher-Yates, sur une copie. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1))
    ;[out[index], out[swap]] = [out[swap], out[index]]
  }
  return out
}

/** `count` éléments distincts, tirés sans remise. Rend moins si la source est plus courte. */
export function sample<T>(items: readonly T[], count: number, rng: Rng): T[] {
  return shuffle(items, rng).slice(0, Math.max(0, count))
}
