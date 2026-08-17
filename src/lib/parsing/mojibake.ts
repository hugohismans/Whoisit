/**
 * Réparation de l'encodage des exports Meta (Messenger / Instagram).
 *
 * Le piège : dans ces JSON, Meta écrit de l'UTF-8 en le traitant comme du
 * latin-1. Chaque octet UTF-8 devient un point de code U+0000–U+00FF distinct.
 * « é » (0xC3 0xA9 en UTF-8) arrive donc sous la forme "Ã©", et l'emoji 😀
 * (0xF0 0x9F 0x98 0x80) sous la forme "ð".
 *
 * La réparation consiste à refaire le chemin inverse : chaque point de code
 * redevient un octet, et la séquence d'octets est décodée en UTF-8.
 *
 * Deux garde-fous, parce que cette opération est destructrice si on l'applique
 * à tort :
 *  - une chaîne contenant un point de code > U+00FF n'est pas du mojibake de
 *    ce type (elle contient déjà de l'Unicode correct) — on la laisse ;
 *  - le décodage est strict (`fatal: true`) : si la séquence d'octets n'est pas
 *    de l'UTF-8 valide, c'est que la chaîne était du vrai latin-1 voulu, et on
 *    rend l'original intact.
 */

const strictUtf8 = new TextDecoder('utf-8', { fatal: true })

/** Vrai si la chaîne contient au moins un caractère hors ASCII. */
const HAS_HIGH_BYTE = /[-ÿ]/

export function repairMetaEncoding(input: string): string {
  // Chemin rapide : de l'ASCII pur ne peut pas être du mojibake.
  if (!HAS_HIGH_BYTE.test(input)) return input

  const bytes = new Uint8Array(input.length)
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index)
    // Un point de code au-delà de 0xFF signifie que la chaîne est déjà correcte.
    if (code > 0xff) return input
    bytes[index] = code
  }

  try {
    return strictUtf8.decode(bytes)
  } catch {
    // Pas de l'UTF-8 valide : la chaîne était réellement du latin-1, on n'y touche pas.
    return input
  }
}

/**
 * Applique la réparation à toutes les chaînes d'une structure JSON désérialisée.
 * Meta encode ainsi *tous* les champs texte : contenus, noms d'expéditeurs,
 * titres de conversation.
 */
export function repairDeep<T>(value: T): T {
  if (typeof value === 'string') return repairMetaEncoding(value) as T
  if (Array.isArray(value)) return value.map(repairDeep) as T
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value)) out[key] = repairDeep(nested)
    return out as T
  }
  return value
}
