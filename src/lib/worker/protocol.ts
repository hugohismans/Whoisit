import type { ParseError, ParseProgress } from '../types'
import type { ParseOptions, ParseResult } from '../parsing'

/** Message envoyé au worker de parsing. */
export type ParseRequest = {
  file: File | Blob
  options: ParseOptions
}

/** Messages remontés par le worker. */
export type ParseResponse =
  | { type: 'progress'; progress: ParseProgress }
  | { type: 'done'; result: ParseResult }
  | { type: 'error'; error: ParseError }
