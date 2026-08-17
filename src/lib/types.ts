/** Plateforme d'origine d'une conversation. */
export type Source = 'whatsapp' | 'messenger' | 'instagram' | 'demo'

/**
 * Un message jouable. Volontairement minimal : c'est ce qui vit en mémoire,
 * et rien de tout cela n'est jamais persisté.
 */
export type Message = {
  /** Index dans `Conversation.messages` — sert à retrouver le contexte après la réponse. */
  i: number
  author: string
  text: string
  /** Timestamp epoch en millisecondes. */
  ts: number
}

export type Conversation = {
  source: Source
  title: string
  participants: string[]
  messages: Message[]
}

/** Progression émise par le worker de parsing. */
export type ParseProgress = {
  /** 0 → 1, ou null si indéterminé. */
  ratio: number | null
  /** Clé i18n décrivant l'étape en cours. */
  stepKey: string
  /** Détail brut éventuel (nom de fichier en cours, etc.). */
  detail?: string
}

/** Erreurs de parsing renvoyées au thread principal. */
export type ParseError = {
  code: 'unsupported' | 'empty' | 'corrupt' | 'unknown'
  message: string
}
