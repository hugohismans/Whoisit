import type { ParseErrorCode } from '../types'

/**
 * Échec de parsing porteur d'un code, pour que l'interface puisse expliquer ce
 * qui s'est passé dans la langue de l'utilisateur plutôt que d'afficher un
 * message technique.
 *
 * `detail` n'est jamais montré tel quel : il sert au diagnostic en console et
 * peut contenir un nom de fichier.
 */
export class ParseFailure extends Error {
  readonly code: ParseErrorCode

  constructor(code: ParseErrorCode, detail?: string) {
    super(detail ?? code)
    this.name = 'ParseFailure'
    this.code = code
  }
}
