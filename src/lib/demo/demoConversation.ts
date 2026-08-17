import type { Conversation, Message } from '../types'

/**
 * Conversation de démonstration, entièrement inventée.
 *
 * Elle sert à essayer le jeu sans déposer quoi que ce soit, et à développer
 * sans avoir besoin d'une vraie archive. Les personnages ont des façons
 * d'écrire volontairement distinctes — sinon la partie de démo n'a aucun sel :
 *
 *  - Camille : longues phrases construites, ponctuation soignée
 *  - Yanis   : enthousiaste, digressif, beaucoup de « du coup »
 *  - Farah   : pragmatique, organise, pose des questions concrètes
 *  - Tom     : ironique, arrive toujours après la bataille
 */

const SCRIPT: [author: string, text: string][] = [
  ['Farah', 'Bon les gens, on se décide pour le week-end de juin ou on laisse filer comme l’an dernier ?'],
  ['Yanis', 'ALORS. J’ai regardé les trains hier soir et en fait si on part le vendredi midi au lieu du soir ça coûte quasiment moitié prix, du coup je pense qu’il faut vraiment qu’on pose l’aprem'],
  ['Camille', 'Je peux poser le vendredi après-midi sans problème, mais je préférerais qu’on ait réservé le logement avant de bloquer les billets, parce que la dernière fois on s’est retrouvés avec des trains et nulle part où dormir.'],
  ['Tom', 'ah oui la fameuse nuit dans la voiture'],
  ['Farah', 'On ne s’en remettra jamais'],
  ['Yanis', 'C’ÉTAIT UNE EXPÉRIENCE'],
  ['Camille', 'C’était une hypothermie.'],
  ['Farah', 'Concrètement il nous faut quoi : quatre lits, une cuisine, et pas à trois heures de la gare. Je peux chercher ce soir si personne d’autre ne s’en occupe.'],
  ['Tom', 'je vote pour que ce soit toi oui'],
  ['Camille', 'Deuxième.'],
  ['Yanis', 'Troisième mais je participe hein, je regarde les trucs avec vue sur la mer'],
  ['Farah', 'Yanis on a un budget de 60 balles par personne pour deux nuits'],
  ['Yanis', 'Une vue sur la mer partielle alors'],
  ['Tom', 'une vue sur un parking d’où on devine la mer si on monte sur une chaise'],
  ['Camille', 'Honnêtement à ce prix-là on aura une vue sur le mur du voisin et on sera très contents, il faut juste que la cuisine soit correcte parce que je refuse de manger des pâtes trois jours d’affilée.'],
  ['Farah', 'Noté : cuisine correcte, mur du voisin acceptable.'],
  ['Yanis', 'Du coup on part à combien au final ? Parce que Léa m’a demandé si elle pouvait venir et je lui ai dit que je demanderais, mais si on est six ça change tout pour le logement'],
  ['Camille', 'Ça ne me dérange pas du tout, mais il faut trancher maintenant : à six on ne cherche pas les mêmes endroits, et on va perdre une semaine si on reste flous là-dessus.'],
  ['Farah', 'D’accord avec Camille. Réponse avant dimanche soir, sinon on part à quatre et c’est tout.'],
  ['Tom', 'dimanche soir 23h59'],
  ['Yanis', 'Je lui écris tout de suite'],
  ['Farah', 'Quelqu’un a une voiture pour le samedi ? Il y a une balade à faire mais c’est à vingt minutes et il n’y a pas de bus.'],
  ['Tom', 'j’ai la voiture de mon frère jusqu’au 15, après il la reprend pour son déménagement donc si on décale d’une semaine ça saute'],
  ['Camille', 'Encore un argument pour ne pas décaler. On dirait que tout l’univers nous demande de partir ce week-end-là précisément.'],
  ['Yanis', 'L’UNIVERS A PARLÉ'],
  ['Farah', 'L’univers a surtout un frère qui déménage'],
  ['Tom', 'l’univers c’est mon frère'],
  ['Camille', 'Je note quand même qu’on est passés d’une question simple sur les dates à une discussion cosmologique en quatorze messages.'],
  ['Yanis', 'C’est notre force'],
  ['Farah', 'Bref. J’ai trouvé trois trucs, je vous envoie les liens ce soir, vous me dites lequel et je réserve. Pas de débat de deux jours sur la couleur des rideaux s’il vous plaît.'],
  ['Tom', 'et si les rideaux sont vraiment moches'],
  ['Farah', 'Tom.'],
  ['Tom', 'ok'],
  ['Camille', 'Merci Farah, sincèrement, sans toi on serait encore en train d’en parler au mois d’août avec exactement les mêmes messages.'],
  ['Yanis', 'C’est vrai ça, on refait la même conversation tous les ans depuis 2019 et à chaque fois on est surpris'],
  ['Farah', 'La tradition.'],
  ['Tom', 'la seule chose qui tienne dans ce groupe'],
  ['Camille', 'Ça et le fait que Yanis écrive systématiquement trois messages là où une phrase suffirait.'],
  ['Yanis', 'Faux'],
  ['Yanis', 'Enfin'],
  ['Yanis', 'Pas totalement faux'],
  ['Farah', 'Voilà.'],
  ['Camille', 'Je nous adore.'],
  ['Tom', 'moi aussi mais je maintiens que les rideaux comptent'],
  ['Farah', 'Liens ce soir. Réponse de Léa avant dimanche. Trains réservés lundi. C’est la dernière fois que je récapitule.'],
]

/** Un message toutes les deux à trois minutes, un soir de mai. */
const START = new Date(2024, 4, 14, 20, 12, 0).getTime()

export function buildDemoConversation(): Conversation {
  // Les intervalles se cumulent : les multiplier par l'index donnerait des
  // horodatages non monotones, et la vue contexte afficherait des heures qui
  // reculent d'un message à l'autre.
  let stamp = START
  const messages: Message[] = SCRIPT.map(([author, text], index) => {
    const message = { i: index, author, text, ts: stamp }
    stamp += 2 * 60_000 + (index % 3) * 40_000
    return message
  })

  return {
    source: 'demo',
    title: 'Le chalet (démo)',
    participants: ['Farah', 'Yanis', 'Camille', 'Tom'],
    messages,
  }
}
