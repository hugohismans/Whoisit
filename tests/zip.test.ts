import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { parseArchive, wantedInZip } from '../src/lib/parsing'
import { ParseFailure } from '../src/lib/parsing/errors'
import { readZipEntries } from '../src/lib/parsing/zip'

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name))
const encoder = new TextEncoder()

/** Faux média : incompressible, pour que sa décompression se voie. */
function fakeMedia(size: number): Uint8Array {
  const bytes = new Uint8Array(size)
  for (let index = 0; index < size; index += 1) bytes[index] = (index * 37) % 256
  return bytes
}

function buildMetaArchive(): Blob {
  const zipped = zipSync({
    'messages/inbox/lesdemenageurs_abc123/message_1.json': new Uint8Array(
      fixture('messenger-message_1.json'),
    ),
    'messages/inbox/lesdemenageurs_abc123/message_2.json': new Uint8Array(
      fixture('messenger-message_2.json'),
    ),
    'messages/inbox/lesdemenageurs_abc123/photos/photo_1.jpg': fakeMedia(64 * 1024),
    'messages/inbox/lesdemenageurs_abc123/videos/video_1.mp4': fakeMedia(128 * 1024),
    'your_instagram_activity/messages/inbox/lesmelomanes_xyz789/message_1.json': new Uint8Array(
      fixture('instagram-message_1.json'),
    ),
    '__MACOSX/._message_1.json': encoder.encode('poubelle macOS'),
    'personal_information/profile.json': encoder.encode('{"name":"hors sujet"}'),
  })
  return new Blob([zipped])
}

describe('lecture de ZIP', () => {
  it('n’extrait que les fichiers de conversation', async () => {
    const entries = await readZipEntries(buildMetaArchive(), wantedInZip)
    const paths = entries.map((entry) => entry.path)

    expect(paths).toHaveLength(3)
    expect(paths.some((path) => path.endsWith('.jpg'))).toBe(false)
    expect(paths.some((path) => path.endsWith('.mp4'))).toBe(false)
    // Le pseudo-fichier créé par macOS porte pourtant un nom de conversation.
    expect(paths.some((path) => path.startsWith('__MACOSX'))).toBe(false)
    expect(paths.some((path) => path.includes('personal_information'))).toBe(false)
  })

  it('ne matérialise jamais les octets des médias', async () => {
    // Le vrai garde-fou mémoire : la somme des octets extraits doit rester de
    // l'ordre des JSON, pas de celui des 192 ko de faux médias de l'archive.
    const entries = await readZipEntries(buildMetaArchive(), (path) =>
      /message_\d+\.json$/.test(path),
    )
    const extracted = entries.reduce((total, entry) => total + entry.bytes.length, 0)

    expect(extracted).toBeGreaterThan(0)
    expect(extracted).toBeLessThan(64 * 1024)
  })

  it('rend compte de la progression', async () => {
    const ratios: number[] = []
    await readZipEntries(buildMetaArchive(), () => true, (ratio) => ratios.push(ratio))

    expect(ratios.length).toBeGreaterThan(0)
    expect(ratios.at(-1)).toBeCloseTo(1, 5)
    expect([...ratios].sort((a, b) => a - b)).toEqual(ratios)
  })
})

describe('parseArchive sur une archive Meta complète', () => {
  it('reconstitue les deux conversations, la plus fournie d’abord', async () => {
    const { conversations, skippedOneToOne } = await parseArchive(buildMetaArchive())

    expect(conversations).toHaveLength(2)
    expect(conversations[0].title).toBe('Les déménageurs')
    expect(conversations[0].source).toBe('messenger')
    expect(conversations[1].title).toBe('les mélomanes')
    expect(conversations[1].source).toBe('instagram')
    expect(skippedOneToOne).toBe(0)
  })

  it('ignore les dossiers sans rapport et les artefacts macOS', async () => {
    const { conversations } = await parseArchive(buildMetaArchive())
    expect(conversations.every((conversation) => conversation.messages.length > 0)).toBe(true)
  })

  it('lit un ZIP WhatsApp contenant un simple .txt', async () => {
    const zipped = zipSync({
      'Discussion WhatsApp avec Le chalet.txt': new Uint8Array(fixture('whatsapp-ios-fr.txt')),
    })
    const { conversations } = await parseArchive(new Blob([zipped]))

    expect(conversations).toHaveLength(1)
    expect(conversations[0].source).toBe('whatsapp')
    expect(conversations[0].title).toBe('Le chalet')
  })

  it('lit un .txt WhatsApp déposé directement', async () => {
    const file = new File([fixture('whatsapp-android-en.txt')], 'WhatsApp Chat with Book club.txt')
    const { conversations } = await parseArchive(file)

    expect(conversations[0].title).toBe('Book club')
    expect(conversations[0].messages).toHaveLength(13)
  })

  it('applique le plafond de messages demandé', async () => {
    const { conversations } = await parseArchive(buildMetaArchive(), {
      maxMessagesPerThread: 2,
    })
    expect(conversations.every((conversation) => conversation.messages.length <= 2)).toBe(true)
  })
})

describe('échecs typés', () => {
  const failureCode = async (promise: Promise<unknown>) => {
    try {
      await promise
      return null
    } catch (error) {
      return error instanceof ParseFailure ? error.code : 'not-a-parse-failure'
    }
  }

  it('signale une archive sans fichier de conversation', async () => {
    const zipped = zipSync({ 'photos/vacances.jpg': fakeMedia(1024) })
    expect(await failureCode(parseArchive(new Blob([zipped])))).toBe('unsupported')
  })

  it('signale un fichier au format inconnu', async () => {
    const file = new File(['ceci n’est pas une conversation'], 'notes.txt')
    expect(await failureCode(parseArchive(file))).toBe('empty')
  })

  it('signale une archive qui ne contient que des discussions à deux', async () => {
    const oneToOne = JSON.stringify({
      participants: [{ name: 'Alex' }, { name: 'Sam' }],
      messages: [
        { sender_name: 'Alex', timestamp_ms: 2, content: 'On se voit demain ?' },
        { sender_name: 'Sam', timestamp_ms: 1, content: 'Oui, vers 19h devant le cinéma.' },
      ],
      title: 'Sam',
    })
    const zipped = zipSync({
      'messages/inbox/sam_123/message_1.json': encoder.encode(oneToOne),
    })

    expect(await failureCode(parseArchive(new Blob([zipped])))).toBe('no-group')
  })
})
