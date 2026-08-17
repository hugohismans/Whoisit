#!/usr/bin/env node
/**
 * Audit de vie privée du bundle produit.
 *
 * La promesse du projet — « rien ne quitte l'appareil » — ne vaut que si elle est
 * vérifiable. Ce script échoue si le build livré :
 *   1. ne déclare pas la CSP stricte attendue ;
 *   2. contient une primitive réseau (fetch, XHR, WebSocket, beacon…) ;
 *   3. référence une ressource distante (script, style, police, image).
 *
 * Il tourne en CI avant tout déploiement.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const DIST = new URL('../dist/', import.meta.url).pathname

/** Primitives capables de sortir des données de la page. */
const NETWORK_PRIMITIVES = [
  'XMLHttpRequest',
  'sendBeacon',
  'EventSource',
  'importScripts',
  'WebSocket',
  'WebTransport',
  'RTCPeerConnection',
  /\bfetch\s*\(/,
]

/**
 * URLs autorisées : uniquement des chaînes inertes (namespaces XML, liens de
 * documentation dans des messages d'erreur, commentaire d'en-tête Tailwind).
 * Aucune n'est jamais chargée.
 */
const ALLOWED_URL_PREFIXES = [
  'http://www.w3.org/',
  'https://www.w3.org/',
  'https://svelte.dev/e/',
  'https://tailwindcss.com',
]

const REQUIRED_CSP_DIRECTIVES = [
  "default-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "form-action 'none'",
]

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const failures = []

// ── 1. CSP présente et stricte ───────────────────────────────────────────────
const html = readFileSync(join(DIST, 'index.html'), 'utf8')
for (const directive of REQUIRED_CSP_DIRECTIVES) {
  if (!html.includes(directive)) failures.push(`CSP: directive manquante — ${directive}`)
}

// ── 2 & 3. Contenu des assets ────────────────────────────────────────────────
const files = walk(DIST).filter((f) => /\.(js|css|html)$/.test(f))

for (const file of files) {
  // Les commentaires ne s'exécutent pas — et celui d'index.html cite justement
  // les primitives que la CSP interdit. On les retire avant de scanner.
  const source = readFileSync(file, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
  const name = relative(DIST, file)

  for (const primitive of NETWORK_PRIMITIVES) {
    const found =
      typeof primitive === 'string' ? source.includes(primitive) : primitive.test(source)
    if (found) failures.push(`${name}: primitive réseau détectée — ${primitive}`)
  }

  for (const url of source.match(/https?:\/\/[^"'`\s)]+/g) ?? []) {
    if (!ALLOWED_URL_PREFIXES.some((prefix) => url.startsWith(prefix))) {
      failures.push(`${name}: URL distante — ${url}`)
    }
  }
}

if (failures.length > 0) {
  console.error('✕ Audit de vie privée échoué :\n')
  for (const failure of failures) console.error(`  · ${failure}`)
  process.exit(1)
}

console.log(`✓ Audit de vie privée : ${files.length} fichiers, aucune sortie réseau possible.`)
