/**
 * Dictionnaire de référence. Sa forme définit le type des autres locales :
 * ajouter une clé ici fait échouer la compilation tant que `en.ts` ne suit pas.
 */
export const fr = {
  'app.title': 'Qui a dit ça ?',
  'app.tagline': 'Retrouvez qui a écrit quoi dans vos conversations de groupe.',

  'common.back': 'Retour',
  'common.continue': 'Continuer',
  'common.skip': 'Passer',
  'common.cancel': 'Annuler',
  'common.close': 'Fermer',
  'common.help': 'Comment exporter ma conversation',
  'common.language': 'Langue',
  'common.soon': 'Bientôt disponible',
  'common.stepOf': 'Étape {current} sur {total}',

  'home.dropzone.title': 'Déposez votre export de conversation',
  'home.dropzone.hint': 'ZIP WhatsApp, .txt WhatsApp, ou archive Messenger / Instagram',
  'home.dropzone.browse': 'Choisir un fichier',
  'home.dropzone.dropNow': 'Lâchez le fichier pour commencer',
  'home.demo': 'Essayer avec des données de démo',
  'home.privacy.heading': 'Rien ne quitte votre appareil',
  'home.privacy.enforced':
    "Ce n'est pas une promesse marketing : la page déclare <code>connect-src 'none'</code>, donc le navigateur lui-même bloque toute connexion sortante. Vérifiez-le dans le code source.",
  'home.privacy.does.1': 'Lit votre archive en mémoire, dans cet onglet',
  'home.privacy.does.2': 'Ne conserve que votre meilleur score, jamais un message',
  'home.privacy.does.3': 'Fonctionne hors ligne une fois la page chargée',
  'home.privacy.doesnt.1': "Aucun envoi, aucun serveur, aucun compte",
  'home.privacy.doesnt.2': 'Aucun cookie, aucune mesure d’audience',
  'home.privacy.doesnt.3': 'Aucune police ni ressource externe',
  'home.privacy.ephemeral': 'Fermez l’onglet : tout est effacé.',

  'parsing.title': 'Lecture de votre archive',
  'parsing.subtitle': 'Tout se passe dans votre navigateur. Cela peut prendre un moment sur une grosse archive.',
  'parsing.step.reading': 'Lecture du fichier',
  'parsing.step.listing': 'Inventaire de l’archive',
  'parsing.step.extracting': 'Extraction des conversations',
  'parsing.step.parsing': 'Analyse des messages',
  'parsing.step.done': 'Terminé',
  'parsing.error.unsupported': 'Format non reconnu.',
  'parsing.error.unsupported.hint':
    'Déposez le ZIP exporté depuis WhatsApp, son fichier .txt, ou une archive Messenger / Instagram au format JSON.',
  'parsing.error.empty': 'Aucune conversation exploitable trouvée.',
  'parsing.error.empty.hint':
    'L’archive a bien été lue, mais elle ne contient aucun message texte. Si elle vient de Meta, vérifiez qu’elle a été demandée au format JSON et non HTML.',
  'parsing.error.no-group': 'Aucune conversation de groupe dans cette archive.',
  'parsing.error.no-group.hint':
    'Le jeu a besoin d’au moins trois personnes qui écrivent : à deux, deviner l’auteur revient à tirer à pile ou face. Les discussions à deux ne sont pas encore prises en charge.',
  'parsing.error.corrupt': 'L’archive semble illisible.',
  'parsing.error.corrupt.hint':
    'Le fichier est peut-être incomplet. Retéléchargez-le et réessayez.',
  'parsing.error.unknown': 'Une erreur est survenue pendant la lecture.',
  'parsing.error.unknown.hint': 'Rien n’a été envoyé nulle part — vous pouvez réessayer.',
  'parsing.retry': 'Réessayer avec un autre fichier',

  'archive.large.title': 'Archive volumineuse',
  'archive.large.description':
    'Ce fichier pèse {size}. Vous pouvez le lire en entier, ou vous limiter aux messages les plus récents — c’est plus rapide et cela consomme beaucoup moins de mémoire.',
  'archive.large.limited': 'Garder les {count} derniers messages par conversation',
  'archive.large.limitedHint': 'Largement suffisant pour jouer.',
  'archive.large.full': 'Tout lire',
  'archive.large.fullHint': 'Peut ralentir ou saturer la mémoire sur mobile.',
  'archive.large.recommended': 'Recommandé',

  'threads.title': 'Choisissez une conversation',
  'threads.subtitle': 'Les conversations de groupe les plus actives donnent les meilleures parties.',
  'threads.messageCount.one': '{count} message',
  'threads.messageCount.other': '{count} messages',
  'threads.participantCount.one': '{count} participant',
  'threads.participantCount.other': '{count} participants',
  'threads.search': 'Filtrer par nom',
  'threads.empty': 'Aucune conversation ne correspond.',
  'threads.play': 'Jouer',
  'threads.hiddenOneToOne.one':
    'Une discussion à deux a été écartée : le jeu a besoin d’au moins trois participants.',
  'threads.hiddenOneToOne.other':
    '{count} discussions à deux ont été écartées : le jeu a besoin d’au moins trois participants.',
  'threads.truncated': 'Limitée aux {count} messages les plus récents.',

  'identities.title': 'Qui est qui ?',
  'identities.subtitle':
    'Fusionnez les doublons — numéros non enregistrés, pseudos changés — pour que le jeu ne vous piège pas bêtement.',
  'identities.skipHint': 'Vous pouvez passer cette étape et jouer tout de suite.',
  'identities.start': 'Lancer la partie',

  'game.question': 'Qui a écrit ça ?',
  'game.lives': 'Vies',
  'game.streak': 'Série',
  'game.best': 'Record',
  'game.correct': 'Bien vu !',
  'game.wrong': 'Raté — c’était {author}.',
  'game.showContext': 'Voir le contexte',
  'game.next': 'Message suivant',
  'game.quit': 'Quitter la partie',

  'context.title': 'Autour de ce message',
  'context.subtitle': 'Le message deviné est mis en évidence.',
  'context.back': 'Revenir au jeu',

  'gameover.title': 'Partie terminée',
  'gameover.streak': 'Meilleure série : {count}',
  'gameover.newBest': 'Nouveau record !',
  'gameover.missed': 'Les messages qui vous ont eu',
  'gameover.replay': 'Rejouer',
  'gameover.changeThread': 'Changer de conversation',
  'gameover.shareHint': 'Le partage de score n’inclut jamais le contenu des messages.',

  'help.title': 'Comment exporter ma conversation',
  'help.whatsapp': 'WhatsApp',
  'help.messenger': 'Messenger',
  'help.instagram': 'Instagram',
  'help.note': 'Les exports peuvent être volumineux. Rien n’est envoyé : la lecture se fait sur votre appareil.',
} as const

export type TranslationKey = keyof typeof fr
