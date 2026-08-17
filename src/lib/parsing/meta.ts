import type { Conversation, Message, Source } from '../types'
import { repairDeep } from './mojibake'
import { capMessages, rankParticipants } from './conversation'

/**
 * Parseur des exports « Download your information » de Meta.
 * Messenger et Instagram partagent exactement le même schéma JSON — seul le
 * chemin dans l'archive diffère.
 *
 * Trois pièges, tous traités ici :
 *  - l'encodage (voir `mojibake.ts`) ;
 *  - les messages sont en ordre antichronologique ET répartis sur plusieurs
 *    fichiers (`message_1.json`, `message_2.json`, …) qu'il faut fusionner ;
 *  - la majorité des entrées ne sont pas des messages texte (photos, réactions,
 *    appels, sondages, notifications) et doivent disparaître.
 */

export type MetaMessage = {
  sender_name?: string
  timestamp_ms?: number
  content?: string
  /** Présent sur les appels — jamais un message jouable. */
  call_duration?: number
  /** Message annulé par son auteur. */
  is_unsent?: boolean
  is_geoblocked_for_viewer?: boolean
  photos?: unknown[]
  videos?: unknown[]
  audio_files?: unknown[]
  sticker?: unknown
  gifs?: unknown[]
  share?: unknown
}

export type MetaThreadFile = {
  participants?: { name?: string }[]
  messages?: MetaMessage[]
  title?: string
  thread_path?: string
}

/**
 * Contenus qui sont en réalité des notifications générées par Meta, pas des
 * messages écrits par quelqu'un. Ils passeraient le filtre « a du contenu ».
 */
const NOTIFICATION_CONTENT: RegExp[] = [
  /a envoyé une pièce jointe\.?$/i,
  /sent an attachment\.?$/i,
  /heeft een bijlage verstuurd\.?$/i,
  /^vous êtes maintenant connectés? sur messenger/i,
  /^you are now connected on messenger/i,
  /(a créé un sondage|created a poll|a voté pour|voted for)/i,
  /(a démarré un appel|started a call|appel vidéo terminé|video call ended|the (video )?call ended)/i,
  /(a manqué votre appel|missed your call|vous avez manqué un appel)/i,
  /(a réagi .* à votre message|reacted .* to your message)/i,
  /^r[ée]actions? (à|a) votre message/i,
  /^reacted to your message/i,
  /(a épinglé un message|pinned a message|a modifié le nom du groupe|named the group)/i,
  /(a aimé un message|liked a message)/i,
  /^(a envoyé un autocollant|sent a sticker|envoyé un gif|sent a gif)\.?$/i,
]

function isRealMessage(entry: MetaMessage): boolean {
  if (typeof entry.content !== 'string') return false
  if (entry.is_unsent === true) return false
  if (typeof entry.call_duration === 'number') return false
  if (typeof entry.sender_name !== 'string' || entry.sender_name.trim() === '') return false
  if (typeof entry.timestamp_ms !== 'number') return false

  const content = entry.content.trim()
  if (content === '') return false
  return !NOTIFICATION_CONTENT.some((pattern) => pattern.test(content))
}

/** Déduit la plateforme depuis le chemin de l'entrée dans l'archive. */
export function sourceFromPath(path: string): Source {
  return /instagram/i.test(path) ? 'instagram' : 'messenger'
}

/**
 * Fusionne les `message_N.json` d'un même fil en une conversation.
 *
 * `files` peut arriver dans n'importe quel ordre : on trie sur le timestamp,
 * jamais sur le nom de fichier. Meta numérote à l'envers (message_1.json
 * contient les messages les *plus récents*), et se fier au nom mélangerait
 * silencieusement la chronologie.
 */
export function parseMetaThread(
  files: { path: string; content: string }[],
  options: { maxMessages?: number } = {},
): Conversation | null {
  if (files.length === 0) return null

  const entries: MetaMessage[] = []
  let title: string | undefined

  for (const file of files) {
    let raw: MetaThreadFile
    try {
      raw = repairDeep(JSON.parse(file.content) as MetaThreadFile)
    } catch {
      // Un fichier illisible ne doit pas condamner tout le fil.
      continue
    }

    title ??= raw.title
    for (const entry of raw.messages ?? []) entries.push(entry)
  }

  const all: Message[] = entries
    .filter(isRealMessage)
    .sort((a, b) => a.timestamp_ms! - b.timestamp_ms!)
    .map((entry, index) => ({
      i: index,
      author: entry.sender_name!.trim(),
      text: entry.content!.trim(),
      ts: entry.timestamp_ms!,
    }))

  if (all.length === 0) return null

  return {
    source: sourceFromPath(files[0].path),
    title: title?.trim() || 'Conversation',
    // Établis sur l'intégralité du fil, avant tout plafonnement : la liste des
    // participants ne doit pas dépendre de la quantité de messages conservés.
    //
    // Les membres déclarés dans le JSON qui n'ont jamais écrit sont volontairement
    // écartés : ils ne peuvent pas être une réponse, et comme distracteurs ils
    // seraient un cadeau (« celle-là n'écrit jamais »).
    participants: rankParticipants(all),
    messages: capMessages(all, options.maxMessages),
  }
}

