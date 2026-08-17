import type { Locale } from './index.svelte'

export type HelpSection = {
  platform: string
  steps: string[]
  note?: string
}

/**
 * Contenu de la page d'aide, séparé du dictionnaire principal : ce sont des
 * listes d'étapes, pas des libellés d'interface.
 */
export const helpContent: Record<Locale, HelpSection[]> = {
  fr: [
    {
      platform: 'WhatsApp',
      steps: [
        'Ouvrez la conversation de groupe.',
        'Touchez le nom du groupe en haut, puis faites défiler jusqu’à « Exporter la discussion ».',
        'Choisissez « Sans médias » — le jeu n’utilise que le texte, et l’export est bien plus léger.',
        'Enregistrez le fichier ZIP (ou le .txt) sur votre appareil, puis déposez-le ici.',
      ],
      note: 'Sur iPhone comme sur Android, le format du fichier texte diffère légèrement : le jeu gère les deux, ainsi que les dates au format français, anglais ou américain.',
    },
    {
      platform: 'Messenger',
      steps: [
        'Sur facebook.com, ouvrez Paramètres et confidentialité → Paramètres → Vos informations Facebook.',
        'Choisissez « Télécharger vos informations », puis créez une nouvelle demande.',
        'Sélectionnez uniquement « Messages », et surtout le format JSON (pas HTML).',
        'Réglez la qualité des médias sur « Basse » : le jeu ignore les médias, cela réduit fortement la taille.',
        'Meta prépare l’archive puis vous notifie ; téléchargez le ZIP et déposez-le ici.',
      ],
      note: 'Le format HTML n’est pas exploitable : il faut bien demander du JSON.',
    },
    {
      platform: 'Instagram',
      steps: [
        'Dans l’app ou sur instagram.com : Paramètres → Espace Comptes → Vos informations et autorisations.',
        'Choisissez « Télécharger vos informations », puis une nouvelle demande.',
        'Sélectionnez « Messages » et le format JSON.',
        'Téléchargez le ZIP quand il est prêt et déposez-le ici.',
      ],
    },
  ],
  en: [
    {
      platform: 'WhatsApp',
      steps: [
        'Open the group chat.',
        'Tap the group name at the top, then scroll down to “Export chat”.',
        'Choose “Without media” — the game only uses text, and the export stays small.',
        'Save the ZIP (or .txt) to your device, then drop it here.',
      ],
      note: 'iPhone and Android produce slightly different text formats. The game handles both, along with French, British and US date formats.',
    },
    {
      platform: 'Messenger',
      steps: [
        'On facebook.com, open Settings & privacy → Settings → Your Facebook information.',
        'Choose “Download your information”, then create a new request.',
        'Select “Messages” only, and make sure the format is JSON (not HTML).',
        'Set media quality to “Low”: the game ignores media, and this shrinks the archive a lot.',
        'Meta prepares the archive and notifies you; download the ZIP and drop it here.',
      ],
      note: 'The HTML format cannot be used — request JSON.',
    },
    {
      platform: 'Instagram',
      steps: [
        'In the app or on instagram.com: Settings → Accounts Centre → Your information and permissions.',
        'Choose “Download your information”, then a new request.',
        'Select “Messages” and the JSON format.',
        'Download the ZIP when it is ready and drop it here.',
      ],
    },
  ],
}
