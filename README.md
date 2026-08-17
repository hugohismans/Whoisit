# Qui a dit ça ? / Who said that?

Un jeu web qui pioche un message dans une de vos conversations de groupe et vous
demande **qui l'a écrit**. 3 vies, la plus longue série possible.

**Tout se passe dans votre navigateur.** Vous déposez votre export de conversation
(WhatsApp, Messenger, Instagram), il est lu en mémoire, et rien n'est envoyé nulle part.

## La vie privée, en vérifiable plutôt qu'en promesse

La page déclare cette Content-Security-Policy :

```
default-src 'self'; connect-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; font-src 'self'; worker-src 'self' blob:; object-src 'none';
frame-ancestors 'none'; base-uri 'self'; form-action 'none'
```

`connect-src 'none'` signifie que **le navigateur lui-même** refuse toute connexion
sortante : pas de `fetch`, pas de XHR, pas de WebSocket, pas de beacon. Même un bug
ou une dépendance compromise ne peut pas exfiltrer vos messages.

En complément, `npm run audit:privacy` inspecte le build produit et échoue si :

- la CSP attendue est absente du HTML livré ;
- une primitive réseau apparaît dans le bundle (`fetch`, `XMLHttpRequest`,
  `sendBeacon`, `WebSocket`, `EventSource`, `importScripts`…) ;
- une ressource distante est référencée (police, CDN, image, script).

Cet audit tourne en CI et bloque le déploiement s'il échoue.

Par ailleurs : aucun cookie, aucune mesure d'audience, aucune police externe. Le seul
élément persisté est votre meilleur score dans `localStorage` — jamais un message.

## Développement

```bash
npm install
npm run dev        # serveur de développement
npm test           # tests des parsers et de la logique de jeu
npm run check      # types (svelte-check)
npm run build      # build statique dans dist/
npm run verify     # check + test + build + audit de vie privée
```

En développement, un plugin Vite élargit `connect-src` au seul websocket HMR local ;
le build de production n'est jamais modifié.

## Déploiement

Le build cible GitHub Pages sous `/<repo>/` par défaut. Pour un déploiement à la
racine (Cloudflare Pages, domaine custom) :

```bash
BASE_PATH=/ npm run build
```

## État d'avancement

- [x] Palier 1 — Setup, CSP, squelette d'interface navigable, i18n FR/EN
- [x] Palier 2 — Parsers (WhatsApp, Messenger, Instagram) + fixtures + tests + sélection du fil
- [x] Palier 3 — Sélection et équilibrage des messages
- [x] Palier 4 — Boucle de jeu (3 vies, série, record, difficulté progressive)
- [x] Palier 5 — Vue contexte
- [x] Palier 6 — Fusion d'identités, page d'aide, polish

## Formats lus

| Source | Entrée acceptée | Particularités traitées |
| --- | --- | --- |
| WhatsApp | ZIP exporté, ou le `.txt` seul | Variantes iOS / Android, dates FR / EN / US, format 12 h, messages multi-lignes, marques de direction Unicode, placeholders média et messages supprimés (FR/EN/NL) |
| Messenger | Archive « Download your information », JSON | Encodage latin-1/UTF-8 réparé, fichiers `message_N.json` fusionnés, ordre antichronologique rétabli |
| Instagram | Idem, sous `your_instagram_activity/` | Même pipeline que Messenger |

Deux garde-fous valent d'être connus :

- **Les médias ne sont jamais décompressés.** Le filtrage se fait sur le chemin
  de chaque entrée *avant* extraction, en flux. Une archive de 50 Mo dont 50 Mo
  de photos ne fait grimper le tas JS que d'environ 1 Mo.
- **Les discussions à deux sont écartées** : deviner l'auteur entre deux
  personnes est un tirage à pile ou face. Si l'archive n'en contient pas
  d'autres, le jeu le dit explicitement plutôt que de proposer une partie vide.

Les fixtures de test sont des conversations inventées. Celles de Meta sont
générées par `node tests/fixtures/generate-meta-fixtures.mjs`, qui reproduit
mécaniquement le bug d'encodage plutôt que de le taper à la main.

## Équilibrage

Dans un groupe, deux personnes écrivent souvent 70 % des messages. Tirer un
message au hasard ferait de « répondre le plus bavard » une stratégie gagnante.
Le jeu tire donc **un auteur uniformément, puis un de ses messages**.

`npm run analyze` inspecte le vivier d'une conversation et compare la part de
chacun dans les messages écrits à sa part dans les questions posées :

```
   auteur                  écrit    jouables   questions posées
   Sonia                   36.0%       13    33.0%  █████████
   Malik                   33.0%       12    33.7%  █████████
   Elise                   15.0%        9    33.3%  █████████
```

Deux règles complètent le tirage :

- **Toutes les propositions affichées peuvent être la bonne réponse.** Proposer
  comme distracteur quelqu'un qui n'a jamais écrit de message assez long serait
  exploitable : un joueur régulier apprendrait à l'éliminer d'office, et une
  question à cinq propositions en vaudrait trois.
- **Le seuil d'éligibilité s'assouplit** quand la conversation est petite, plutôt
  que de refuser la partie.

```bash
npm run analyze                       # conversation de démo
npm run analyze -- export.txt         # un export WhatsApp
npm run analyze -- archive.zip        # une archive Meta ou WhatsApp
```

## Fusion d'identités

Deux situations très courantes rendent une partie injuste : le même contact
apparaît sous un numéro brut *et* sous son nom parce qu'il a été enregistré
entre-temps, ou quelqu'un a changé de pseudo Messenger en cours de route. Dans
les deux cas, on perd une vie pour une raison qui n'a rien à voir avec le style
d'écriture.

Un écran, sautable, permet de renommer et de regrouper les participants avant la
partie. Il propose de lui-même les doublons évidents — même nom à la casse et aux
accents près, ou prénom seul face à prénom + nom.

**Les numéros de téléphone sont masqués partout** (`+33 6 •• •• 56 78`), y
compris dans les boutons de réponse et la vue contexte : jouer en partageant son
écran ne doit pas diffuser les numéros de ses amis. Cet écran est le seul endroit
où l'on peut les révéler, parce que c'est le seul où l'on en a besoin pour
reconnaître la personne.

## Stack

Vite · TypeScript · Svelte 5 · Tailwind 4 · fflate (lecture ZIP) · Vitest
