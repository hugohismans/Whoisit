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

/**
 * Causes d'échec de lecture. Chacune correspond à un message d'aide distinct :
 * dire « aucune conversation de groupe » plutôt que « erreur » évite à
 * l'utilisateur de croire que son archive est cassée.
 */
export type ParseErrorCode =
  /** Format non reconnu, ou archive sans fichier de conversation. */
  | 'unsupported'
  /** Archive lisible mais sans aucun message exploitable. */
  | 'empty'
  /** Uniquement des conversations à deux — injouables en l'état. */
  | 'no-group'
  /** Archive illisible ou tronquée. */
  | 'corrupt'
  | 'unknown'

/** Erreur de parsing renvoyée au thread principal. */
export type ParseError = {
  code: ParseErrorCode
  /** Détail technique éventuel, pour la console — jamais affiché tel quel. */
  detail?: string
}
