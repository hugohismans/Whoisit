/**
 * Affichage des noms de participants.
 *
 * Dans un export WhatsApp, un contact non enregistré apparaît en numéro de
 * téléphone brut. Ce numéro deviendrait un bouton de réponse affiché en grand :
 * quelqu'un qui joue en partageant son écran diffuserait les numéros de ses
 * amis sans y penser.
 *
 * Le numéro est donc masqué partout par défaut. Il reste révélable à l'écran de
 * fusion d'identités, là où l'utilisateur en a besoin pour reconnaître la
 * personne et lui donner un nom.
 */

const SEPARATORS = /[\s().\-/]/g

/** Vrai si le nom n'est en réalité qu'un numéro de téléphone. */
export function isPhoneNumber(name: string): boolean {
  const compact = name.replace(SEPARATORS, '')
  return /^\+?\d{7,15}$/.test(compact)
}

/**
 * Masque le milieu d'un numéro en conservant sa mise en forme d'origine :
 * « +33 6 12 34 56 78 » devient « +33 6 •• •• 56 78 ».
 *
 * L'indicatif et les quatre derniers chiffres restent lisibles : c'est ce qui
 * permet de distinguer deux inconnus l'un de l'autre sans exposer le numéro.
 */
export function maskPhoneNumber(name: string): string {
  const digitCount = (name.match(/\d/g) ?? []).length
  const visibleHead = 3
  const visibleTail = 4
  if (digitCount <= visibleHead + visibleTail) return name

  let seen = 0
  return name.replace(/\d/g, (digit) => {
    const position = seen
    seen += 1
    return position < visibleHead || position >= digitCount - visibleTail ? digit : '•'
  })
}

/**
 * Nom tel qu'il doit apparaître à l'écran.
 * `reveal` n'est activé que par l'écran de fusion d'identités.
 */
export function displayName(name: string, reveal = false): string {
  if (reveal || !isPhoneNumber(name)) return name
  return maskPhoneNumber(name)
}
