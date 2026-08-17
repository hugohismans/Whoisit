import type { ParseError, ParseProgress } from '../types'
import type { ParseOptions, ParseResult } from '../parsing'
import type { ParseRequest, ParseResponse } from './protocol'
import ParserWorker from './parser.worker?worker'

/**
 * Enveloppe typée autour du worker de parsing.
 *
 * Le worker est créé pour un seul travail puis terminé aussitôt : c'est ce qui
 * garantit qu'aucune conversation ne survit quelque part en mémoire après coup.
 */
export type ParseHandle = {
  result: Promise<ParseResult>
  /** Interrompt le parsing et libère le worker. */
  cancel: () => void
}

export function parseInWorker(
  file: File | Blob,
  options: ParseOptions,
  onProgress: (progress: ParseProgress) => void,
): ParseHandle {
  const worker = new ParserWorker()
  let settled = false

  const result = new Promise<ParseResult>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<ParseResponse>) => {
      const message = event.data

      if (message.type === 'progress') {
        onProgress(message.progress)
        return
      }

      settled = true
      worker.terminate()

      if (message.type === 'done') resolve(message.result)
      else reject(message.error satisfies ParseError)
    }

    worker.onerror = (event) => {
      settled = true
      worker.terminate()
      reject({ code: 'unknown', detail: event.message } satisfies ParseError)
    }

    const request: ParseRequest = { file, options }
    worker.postMessage(request)
  })

  return {
    result,
    cancel: () => {
      if (settled) return
      settled = true
      worker.terminate()
    },
  }
}
