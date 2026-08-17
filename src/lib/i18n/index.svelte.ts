import { fr, type TranslationKey } from './fr'
import { en } from './en'

export type Locale = 'fr' | 'en'

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { fr, en }

const STORAGE_KEY = 'whoisit.locale'

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'fr' || saved === 'en') return saved
  } catch {
    // localStorage indisponible (mode privé strict) : on retombe sur la langue du navigateur.
  }
  const preferred = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []
  return preferred.some((tag) => tag?.toLowerCase().startsWith('fr')) ? 'fr' : 'en'
}

let current = $state<Locale>(detectLocale())

export function locale(): Locale {
  return current
}

export function setLocale(next: Locale): void {
  current = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Le choix de langue n'est pas critique : on ignore silencieusement.
  }
  if (typeof document !== 'undefined') document.documentElement.lang = next
}

/**
 * Traduit une clé. Les variables `{nom}` sont substituées telles quelles.
 * Retombe sur le français si une locale est incomplète (impossible en pratique,
 * le typage l'interdit — mais on préfère afficher du texte qu'une clé brute).
 */
export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  const template = dictionaries[current][key] ?? fr[key] ?? key
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

const pluralRules = new Map<Locale, Intl.PluralRules>()

function rulesFor(target: Locale): Intl.PluralRules {
  let rules = pluralRules.get(target)
  if (!rules) {
    rules = new Intl.PluralRules(target)
    pluralRules.set(target, rules)
  }
  return rules
}

/**
 * Traduit une clé accordée en nombre.
 *
 * `base` désigne une famille de clés suffixées par catégorie de pluriel
 * (`.one`, `.other`, …). On s'appuie sur `Intl.PluralRules` plutôt que sur un
 * `count > 1 ?` maison : les catégories diffèrent d'une langue à l'autre, et le
 * français lui-même accorde « 0 » au singulier là où l'anglais met un pluriel.
 *
 * `vars.count` peut être passé pour afficher un nombre formaté ; c'est toujours
 * `count` qui décide de l'accord.
 */
export function tCount(
  base: string,
  count: number,
  vars?: Record<string, string | number>,
): string {
  const category = rulesFor(current).select(count)
  const candidate = `${base}.${category}` as TranslationKey
  const key = candidate in dictionaries[current] ? candidate : (`${base}.other` as TranslationKey)
  return t(key, { count, ...vars })
}

export type { TranslationKey }
