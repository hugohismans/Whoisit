import { parseArchive } from '../parsing'
import { ParseFailure } from '../parsing/errors'
import type { ParseRequest, ParseResponse } from './protocol'

/**
 * Worker de parsing.
 *
 * Tout le travail lourd — traversée du ZIP, décompression sélective, parsing —
 * se fait ici pour que l'interface reste réactive sur une archive de plusieurs
 * centaines de mégaoctets.
 *
 * Le worker ne fait aucune requête : il ne reçoit qu'un File déjà en mémoire et
 * ne renvoie que des objets structurés. La CSP de la page s'applique de toute
 * façon à lui.
 */

const post = (message: ParseResponse) => self.postMessage(message)

self.onmessage = async (event: MessageEvent<ParseRequest>) => {
  const { file, options } = event.data

  try {
    const result = await parseArchive(file, options, (progress) =>
      post({ type: 'progress', progress }),
    )
    post({ type: 'done', result })
  } catch (error) {
    if (error instanceof ParseFailure) {
      post({ type: 'error', error: { code: error.code, detail: error.message } })
    } else {
      post({
        type: 'error',
        error: { code: 'unknown', detail: error instanceof Error ? error.message : undefined },
      })
    }
  }
}
