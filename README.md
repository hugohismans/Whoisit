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
- [ ] Palier 2 — Parsers (WhatsApp, Messenger, Instagram) + fixtures + tests
- [ ] Palier 3 — Sélection et équilibrage des messages
- [ ] Palier 4 — Boucle de jeu
- [ ] Palier 5 — Vue contexte
- [ ] Palier 6 — Fusion d'identités, page d'aide, polish

## Stack

Vite · TypeScript · Svelte 5 · Tailwind 4 · fflate (lecture ZIP) · Vitest
