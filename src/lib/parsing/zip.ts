import { Unzip, UnzipInflate } from 'fflate'

/**
 * Lecture d'archive ZIP en flux.
 *
 * Deux raisons de ne surtout pas tout décompresser :
 *  - une archive Meta pèse couramment plusieurs centaines de mégaoctets, dont
 *    99 % de photos et vidéos dont le jeu n'a aucun usage ;
 *  - décompresser ces médias ferait exploser la mémoire de l'onglet, sur mobile
 *    en particulier.
 *
 * `Unzip` de fflate expose chaque entrée *avant* décompression : si on n'appelle
 * pas `start()`, les octets sont ignorés au fil de l'eau. C'est le filtre par
 * chemin, appliqué avant extraction, et non après.
 *
 * On enregistre `UnzipInflate` (synchrone) plutôt que sa variante asynchrone :
 * tout ce code tourne déjà dans un Web Worker, et la version async ferait naître
 * des workers supplémentaires depuis des URL blob — inutile ici, et une surface
 * de moins vis-à-vis de la CSP.
 */

export type ZipEntry = { path: string; bytes: Uint8Array }

const decoder = new TextDecoder('utf-8')

function concat(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

/**
 * Itère les octets d'un Blob, en flux quand la plateforme le permet.
 * Certains environnements (jsdom, vieux navigateurs) n'exposent pas de
 * ReadableStream utilisable : on retombe alors sur un chargement complet, ce
 * qui est acceptable pour les tests mais jamais pour une vraie archive.
 */
async function* blobChunks(blob: Blob): AsyncGenerator<Uint8Array> {
  const stream = typeof blob.stream === 'function' ? blob.stream() : null

  if (stream && typeof stream.getReader === 'function') {
    const reader = stream.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return
      yield value instanceof Uint8Array ? value : new Uint8Array(value as ArrayBufferLike)
    }
  } else {
    yield new Uint8Array(await blob.arrayBuffer())
  }
}

/**
 * Parcourt une archive et ne matérialise que les entrées retenues par `want`.
 * `onProgress` reçoit la fraction d'octets compressés déjà traversés.
 */
export async function readZipEntries(
  blob: Blob,
  want: (path: string) => boolean,
  onProgress?: (ratio: number) => void,
): Promise<ZipEntry[]> {
  const entries: ZipEntry[] = []
  let failure: Error | null = null

  const unzip = new Unzip()
  unzip.register(UnzipInflate)

  unzip.onfile = (file) => {
    // Ne pas appeler start() = l'entrée est traversée sans être décompressée.
    if (!want(file.name)) return

    const chunks: Uint8Array[] = []
    let size = 0

    file.ondata = (error, chunk, final) => {
      if (error) {
        failure ??= error
        return
      }
      if (chunk.length > 0) {
        chunks.push(chunk)
        size += chunk.length
      }
      if (final) entries.push({ path: file.name, bytes: concat(chunks, size) })
    }

    file.start()
  }

  let read = 0
  const total = blob.size || 1

  for await (const chunk of blobChunks(blob)) {
    unzip.push(chunk, false)
    if (failure) throw failure
    read += chunk.length
    onProgress?.(Math.min(1, read / total))
  }
  unzip.push(new Uint8Array(0), true)

  if (failure) throw failure
  return entries
}

export function decodeEntry(entry: ZipEntry): string {
  return decoder.decode(entry.bytes)
}

/** Vrai si les premiers octets sont la signature d'une archive ZIP (« PK\x03\x04 »). */
export async function looksLikeZip(blob: Blob): Promise<boolean> {
  const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer())
  return header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04
}
