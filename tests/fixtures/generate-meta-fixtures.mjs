#!/usr/bin/env node
/**
 * Génère les fixtures Meta (Messenger / Instagram).
 *
 * Ces fichiers ne sont pas écrits à la main : le mojibake de Meta doit être
 * *exact* pour que le test ait une valeur, et taper « Ã© » au clavier expose à
 * ce qu'un éditeur, un linter ou un copier-coller le « corrige » silencieusement.
 * On reproduit donc mécaniquement le bug d'origine : encoder en UTF-8, puis
 * relire chaque octet comme un point de code latin-1.
 *
 * Le résultat est ré-échappé en \uXXXX pur ASCII, comme dans les vraies
 * archives — ce qui rend la fixture insensible à l'encodage du dépôt.
 *
 * Usage : node tests/fixtures/generate-meta-fixtures.mjs
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const encoder = new TextEncoder()

/** Reproduit le bug d'encodage de Meta : UTF-8 relu comme du latin-1. */
function toMojibake(text) {
  return [...encoder.encode(text)].map((byte) => String.fromCharCode(byte)).join('')
}

function deepMojibake(value) {
  if (typeof value === 'string') return toMojibake(value)
  if (Array.isArray(value)) return value.map(deepMojibake)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deepMojibake(v)]))
  }
  return value
}

/** JSON pur ASCII : tout caractère non-ASCII devient \uXXXX. */
function writeAsciiJson(path, data) {
  const json = JSON.stringify(deepMojibake(data), null, 2).replace(
    /[-￿]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
  )
  writeFileSync(path, json + '\n', 'utf8')
}

const ts = (isoLike) => new Date(isoLike).getTime()

// ─────────────────────────────────────────────────────────────────────────────
// Messenger — conversation de groupe inventée, accents français et emoji.
// Les messages sont volontairement en ordre antichronologique, comme chez Meta,
// et répartis sur deux fichiers (message_1 = les plus récents).
// ─────────────────────────────────────────────────────────────────────────────
const messengerParticipants = [
  { name: 'Amélie Rousseau' },
  { name: 'Théo Nguyen' },
  { name: 'Inès Ferreira' },
]

const messengerRecent = [
  {
    sender_name: 'Inès Ferreira',
    timestamp_ms: ts('2023-06-18T19:42:00Z'),
    content:
      "J'ai récupéré les clés ce matin, et franchement l'appartement est beaucoup plus lumineux que sur les photos 😀",
  },
  {
    sender_name: 'Théo Nguyen',
    timestamp_ms: ts('2023-06-18T19:40:00Z'),
    content: 'Théo Nguyen a envoyé une pièce jointe.',
  },
  {
    sender_name: 'Amélie Rousseau',
    timestamp_ms: ts('2023-06-18T19:35:00Z'),
    content:
      "Est-ce que quelqu'un a pensé à prévenir le syndic pour l'ascenseur ? Sinon on va porter le canapé sur six étages et je refuse catégoriquement de participer à ça.",
  },
  {
    sender_name: 'Inès Ferreira',
    timestamp_ms: ts('2023-06-18T19:30:00Z'),
    photos: [{ uri: 'messages/inbox/lesdemenageurs_abc123/photos/photo_1.jpg' }],
  },
  {
    sender_name: 'Théo Nguyen',
    timestamp_ms: ts('2023-06-18T19:20:00Z'),
    content: 'Message annulé',
    is_unsent: true,
  },
]

const messengerOlder = [
  {
    sender_name: 'Théo Nguyen',
    timestamp_ms: ts('2023-06-15T10:12:00Z'),
    content:
      "Je peux emprunter la camionnette de mon oncle le samedi matin, mais il faut la rendre avant 14h sinon il en a besoin pour le marché 🚚",
  },
  {
    sender_name: 'Amélie Rousseau',
    timestamp_ms: ts('2023-06-15T10:05:00Z'),
    content:
      "Parfait. Dans ce cas on commence à huit heures, on charge tout d'un coup, et on évite complètement le débat sur qui prend l'escalier et qui prend l'ascenseur.",
  },
  {
    sender_name: 'Inès Ferreira',
    timestamp_ms: ts('2023-06-15T09:58:00Z'),
    content: 'Ça marche pour moi 👍',
  },
  {
    sender_name: 'Amélie Rousseau',
    timestamp_ms: ts('2023-06-15T09:50:00Z'),
    call_duration: 0,
    content: 'Amélie Rousseau a démarré un appel.',
  },
  {
    sender_name: 'Théo Nguyen',
    timestamp_ms: ts('2023-06-15T09:45:00Z'),
    content:
      "Rappel : le déménagement c'est le 17, pas le 18. Théo a déjà noté la mauvaise date deux fois, donc je préfère l'écrire noir sur blanc.",
  },
]

writeAsciiJson(join(here, 'messenger-message_1.json'), {
  participants: messengerParticipants,
  messages: messengerRecent,
  title: 'Les déménageurs',
  thread_path: 'inbox/lesdemenageurs_abc123',
})

writeAsciiJson(join(here, 'messenger-message_2.json'), {
  participants: messengerParticipants,
  messages: messengerOlder,
  title: 'Les déménageurs',
  thread_path: 'inbox/lesdemenageurs_abc123',
})

// ─────────────────────────────────────────────────────────────────────────────
// Instagram — même schéma, chemin et ton différents.
// ─────────────────────────────────────────────────────────────────────────────
writeAsciiJson(join(here, 'instagram-message_1.json'), {
  participants: [{ name: 'lou.pescheur' }, { name: 'marin_b' }, { name: 'zoé.k' }],
  messages: [
    {
      sender_name: 'zoé.k',
      timestamp_ms: ts('2023-08-02T21:15:00Z'),
      content:
        "Franchement le concert d'hier était incroyable, je n'avais pas ressenti ça depuis des années et j'ai encore les oreilles qui sifflent ce matin 🎶",
    },
    {
      sender_name: 'marin_b',
      timestamp_ms: ts('2023-08-02T21:10:00Z'),
      share: { link: 'https://example.invalid/post' },
    },
    {
      sender_name: 'lou.pescheur',
      timestamp_ms: ts('2023-08-02T20:58:00Z'),
      content:
        "Je suis arrivée pendant la deuxième chanson à cause du tram, donc je réclame officiellement un résumé détaillé de ce que j'ai raté.",
    },
    {
      sender_name: 'marin_b',
      timestamp_ms: ts('2023-08-02T20:45:00Z'),
      content: 'Réaction à votre message : ❤️',
    },
    {
      sender_name: 'marin_b',
      timestamp_ms: ts('2023-08-02T20:30:00Z'),
      content:
        "On recommence le mois prochain, il y a un truc au même endroit et cette fois je prends les places à l'avance plutôt que la veille à minuit.",
    },
  ],
  title: 'les mélomanes',
  thread_path: 'inbox/lesmelomanes_xyz789',
})

console.log('Fixtures Meta régénérées.')
