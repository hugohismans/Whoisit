import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseMetaThread, sourceFromPath } from '../src/lib/parsing/meta'

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8')

describe('Messenger — fil éclaté sur plusieurs fichiers', () => {
  const conversation = parseMetaThread([
    // Volontairement dans le désordre : le parseur ne doit jamais se fier au
    // numéro de fichier pour reconstituer la chronologie.
    {
      path: 'messages/inbox/lesdemenageurs_abc123/message_2.json',
      content: fixture('messenger-message_2.json'),
    },
    {
      path: 'messages/inbox/lesdemenageurs_abc123/message_1.json',
      content: fixture('messenger-message_1.json'),
    },
  ])!

  it('produit une conversation', () => {
    expect(conversation).not.toBeNull()
    expect(conversation.source).toBe('messenger')
  })

  it('répare l’encodage du titre et des noms', () => {
    expect(conversation.title).toBe('Les déménageurs')
    expect(conversation.participants).toContain('Amélie Rousseau')
    expect(conversation.participants).toContain('Théo Nguyen')
    expect(conversation.participants).toContain('Inès Ferreira')
  })

  it('répare l’encodage du contenu, accents et emoji', () => {
    const withEmoji = conversation.messages.find((message) => message.text.includes('lumineux'))
    expect(withEmoji?.text).toContain('récupéré les clés')
    expect(withEmoji?.text).toContain('😀')
    expect(conversation.messages.some((message) => message.text.includes('👍'))).toBe(true)
    expect(conversation.messages.some((message) => message.text.includes('Ã'))).toBe(false)
  })

  it('fusionne les fichiers et rétablit l’ordre chronologique', () => {
    expect(conversation.messages).toHaveLength(6)

    const timestamps = conversation.messages.map((message) => message.ts)
    expect([...timestamps].sort((a, b) => a - b)).toEqual(timestamps)

    expect(conversation.messages[0].text).toContain('le déménagement')
    expect(conversation.messages.at(-1)?.text).toContain('récupéré les clés')
  })

  it('écarte tout ce qui n’est pas un message écrit', () => {
    const texts = conversation.messages.map((message) => message.text)
    expect(texts.some((text) => /pièce jointe/.test(text))).toBe(false) // photo
    expect(texts.some((text) => /démarré un appel/.test(text))).toBe(false) // appel
    expect(texts).not.toContain('Message annulé') // message annulé par son auteur
  })

  it('réindexe les messages de zéro après filtrage et tri', () => {
    conversation.messages.forEach((message, index) => expect(message.i).toBe(index))
  })

  it('applique le plafond aux messages les plus récents', () => {
    const limited = parseMetaThread(
      [
        {
          path: 'messages/inbox/lesdemenageurs_abc123/message_1.json',
          content: fixture('messenger-message_1.json'),
        },
        {
          path: 'messages/inbox/lesdemenageurs_abc123/message_2.json',
          content: fixture('messenger-message_2.json'),
        },
      ],
      { maxMessages: 2 },
    )!

    expect(limited.messages).toHaveLength(2)
    expect(limited.messages.at(-1)?.text).toContain('récupéré les clés')
  })
})

describe('Instagram — même schéma, chemin différent', () => {
  const conversation = parseMetaThread([
    {
      path: 'your_instagram_activity/messages/inbox/lesmelomanes_xyz789/message_1.json',
      content: fixture('instagram-message_1.json'),
    },
  ])!

  it('est reconnue comme Instagram grâce au chemin', () => {
    expect(conversation.source).toBe('instagram')
    expect(conversation.title).toBe('les mélomanes')
  })

  it('écarte les partages sans texte et les réactions', () => {
    expect(conversation.messages).toHaveLength(3)
    expect(conversation.messages.some((message) => /Réaction/.test(message.text))).toBe(false)
  })

  it('répare les pseudos accentués', () => {
    expect(conversation.participants).toContain('zoé.k')
  })
})

describe('robustesse', () => {
  it('ignore un fichier illisible sans perdre les autres', () => {
    const conversation = parseMetaThread([
      { path: 'messages/inbox/x/message_1.json', content: '{ ceci n’est pas du JSON' },
      {
        path: 'messages/inbox/x/message_2.json',
        content: fixture('messenger-message_2.json'),
      },
    ])
    expect(conversation?.messages.length).toBe(4)
  })

  it('renvoie null quand il ne reste aucun message exploitable', () => {
    const empty = JSON.stringify({
      participants: [{ name: 'A' }, { name: 'B' }],
      messages: [{ sender_name: 'A', timestamp_ms: 1, photos: [{ uri: 'x.jpg' }] }],
      title: 'Photos',
    })
    expect(parseMetaThread([{ path: 'messages/inbox/x/message_1.json', content: empty }])).toBeNull()
  })
})

describe('sourceFromPath', () => {
  it('distingue Instagram de Messenger', () => {
    expect(sourceFromPath('your_instagram_activity/messages/inbox/a/message_1.json')).toBe(
      'instagram',
    )
    expect(sourceFromPath('messages/inbox/a/message_1.json')).toBe('messenger')
    expect(sourceFromPath('your_facebook_activity/messages/inbox/a/message_1.json')).toBe(
      'messenger',
    )
  })
})
