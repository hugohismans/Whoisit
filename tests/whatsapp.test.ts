import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseWhatsApp, titleFromFileName } from '../src/lib/parsing/whatsapp'

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8')

describe('WhatsApp — export iOS français', () => {
  const conversation = parseWhatsApp(
    fixture('whatsapp-ios-fr.txt'),
    'Discussion WhatsApp avec Le chalet.txt',
  )

  it('extrait uniquement les vrais messages', () => {
    expect(conversation.messages).toHaveLength(9)
  })

  it('déduit le titre depuis le nom du fichier', () => {
    expect(conversation.title).toBe('Le chalet')
  })

  it('ignore la notification de chiffrement et les événements de groupe', () => {
    const texts = conversation.messages.map((message) => message.text)
    expect(texts.some((text) => /chiffrés de bout en bout/.test(text))).toBe(false)
    expect(texts.some((text) => /a créé le groupe/.test(text))).toBe(false)
    expect(conversation.participants).not.toContain('Farah a créé le groupe « Le chalet »')
  })

  it('ignore les placeholders média et les messages supprimés', () => {
    const texts = conversation.messages.map((message) => message.text)
    expect(texts).not.toContain('<Médias omis>')
    expect(texts).not.toContain('image absente')
    expect(texts).not.toContain('Ce message a été supprimé')
  })

  it('recolle les messages multi-lignes', () => {
    const multiline = conversation.messages.find((message) =>
      message.text.startsWith('Je peux poser le vendredi'),
    )
    expect(multiline?.author).toBe('Camille')
    expect(multiline?.text.split('\n')).toHaveLength(3)
    expect(multiline?.text).toContain("Et je n'ai pas envie de revivre ça.")
  })

  it('nettoie les marques de direction Unicode invisibles', () => {
    for (const message of conversation.messages) {
      expect(message.author).not.toMatch(/[‎‏‪-‮]/)
      expect(message.text).not.toMatch(/[‎‏‪-‮]/)
    }
  })

  it('conserve les contacts non enregistrés sous leur numéro', () => {
    expect(conversation.participants).toContain('+33 6 12 34 56 78')
  })

  it('lit les dates au format jour/mois', () => {
    // 12/03/2023 est le 12 mars, pas le 3 décembre.
    expect(new Date(conversation.messages[0].ts).getMonth()).toBe(2)
    expect(new Date(conversation.messages[0].ts).getDate()).toBe(12)
  })

  it('numérote les messages dans l’ordre, sans trou', () => {
    conversation.messages.forEach((message, index) => expect(message.i).toBe(index))
  })
})

describe('WhatsApp — export Android anglais, format américain 12 h', () => {
  const conversation = parseWhatsApp(
    fixture('whatsapp-android-en.txt'),
    'WhatsApp Chat with Book club.txt',
  )

  it('extrait uniquement les vrais messages', () => {
    expect(conversation.messages).toHaveLength(13)
  })

  it('ignore les événements de groupe de la variante Android', () => {
    const texts = conversation.messages.map((message) => message.text)
    expect(texts.some((text) => /end-to-end encrypted/.test(text))).toBe(false)
    expect(texts.some((text) => /created group/.test(text))).toBe(false)
    expect(texts.some((text) => /added Marcus/.test(text))).toBe(false)
  })

  it('ignore les placeholders média anglais', () => {
    const texts = conversation.messages.map((message) => message.text)
    expect(texts).not.toContain('<Media omitted>')
    expect(texts).not.toContain('image omitted')
    expect(texts).not.toContain('This message was deleted')
  })

  it('interprète 3/12/23 comme mois/jour et convertit le PM en 24 h', () => {
    const first = new Date(conversation.messages[0].ts)
    expect(first.getMonth()).toBe(2) // mars
    expect(first.getDate()).toBe(12)
    expect(first.getHours()).toBe(14) // 2:34 PM
    expect(first.getMinutes()).toBe(34)
  })

  it('n’est pas dérouté par un tiret dans le texte du message', () => {
    const dashes = conversation.messages.find((message) =>
      message.text.startsWith('Right, whose turn'),
    )
    expect(dashes?.author).toBe('Priya')
  })

  it('classe les participants du plus bavard au moins bavard', () => {
    // Les trois habitués sont à égalité ; l'arrivant, qui n'a écrit qu'une
    // fois, doit se retrouver en queue de liste.
    expect(conversation.participants).toHaveLength(4)
    expect(conversation.participants.at(-1)).toBe('+44 7700 900123')
  })
})

describe('titleFromFileName', () => {
  it('retire les préfixes des différentes locales', () => {
    expect(titleFromFileName('Discussion WhatsApp avec Le chalet.txt')).toBe('Le chalet')
    expect(titleFromFileName('WhatsApp Chat with Book club.txt')).toBe('Book club')
    expect(titleFromFileName('WhatsApp Chat met De buren.txt')).toBe('De buren')
  })

  it('retombe sur le nom de fichier quand il n’y a pas de préfixe connu', () => {
    expect(titleFromFileName('archives/_chat.txt')).toBe('_chat')
  })
})
