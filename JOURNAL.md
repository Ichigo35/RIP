# Journal de bord — RIP (ex-Reboot)

Ce journal sert de matière première à la vidéo « making-of » de l'app : il garde chaque étape, son heure,
sa durée, les choix faits (et par qui), et les outils utilisés. Il est tenu à jour par Claude à chaque étape
et finalisé à chaque fin de phase (voir les règles dans `CLAUDE.md`).

Heures en heure locale (UTC+7, Vientiane). Durées arrondies à la minute, mesurées sur l'horodatage des
conversations Claude Code.

## Vue d'ensemble

| Phase | Date | Début → fin | Durée | Résultat |
| --- | --- | --- | --- | --- |
| 0. Idée et plan illustré | 2026-11-03 | 10:28 → 10:47 | ~19 min | Concept, étude de marché, plan en 11 planches, journal + dépôt GitHub |
| 0b. Renommage en RIP | 2026-11-03 | 10:49 → 10:53 | ~4 min | Nom officiel « RIP », planches et document mis à jour |
| 1. Site web : accueil + « Enterre ton projet » | 2026-11-03 | 10:55 → 11:04 | ~9 min | Site Cloudflare + base Neon en ligne et testé : https://rip.ichigo35.workers.dev (confirmé par l'utilisateur le 2026-11-05) |
| 2. Comptes, swipe, match | 2026-11-05 | 08:53 → 09:23 | ~30 min | Comptes, cimetière à swiper, file du créateur, écran « Il revit ! », en ligne et testé (confirmé par l'utilisateur à 09:23) |
| 3. Veillée, signalement, modération | 2026-11-05 | 09:23 → 09:47 | ~24 min | Conversation de 14 jours avec la bougie, conclusion à deux, signalement, page de modération, en ligne et testé (**en attente de la confirmation de l'utilisateur**) |

**Total au 2026-11-05 09:47 : environ 1 h 31 de travail** (37 min le 3 novembre, 54 min le 5 novembre). Modèles : Opus 5.5 (effort élevé) jusqu'au 3 novembre 10:48, Sonnet 5.5 (effort moyen) jusqu'à la fin de la phase 1, changement fait par l'utilisateur, puis Opus 5.5 pour les phases 2 et 3.

## État actuel (2026-11-05 09:47)

- Phases 0 à 3 terminées ; **la phase 3 attend la confirmation de l'utilisateur** avant de passer à la suite.
- Le parcours complet fonctionne en ligne : enterrer, swiper, choisir, match, veillée, conclure.
- Le site reste un MVP sans domaine (décision de l'utilisateur) : pas d'e-mails, donc pas de mot de passe oublié ni d'alertes.
- Le cimetière est vide : l'utilisateur n'a pas de projet abandonné à y mettre.
- Personne n'est encore administrateur : il faut d'abord que l'utilisateur crée son compte.
- Décisions ouvertes : tombes d'exemple pour le cimetière vide, langue FR + EN, renommer le dossier local, suite à donner (pacte type, Médium, filtres).

---

## Phase 0 — Idée et plan illustré (2026-11-03)

### La demande de départ (mots de l'utilisateur)

> « propose moi une idee, un concep sur les gens mettent dans l'app tous leurs projet en arret ou abandonner
> et les gens regardent de plus pres et peux swipper pour matcher un peu comme tinder pour reprendre le projet
> avec le createur. un cimetière à idées et à projets […] fais moi un plan, ne code rien »

En cours de route (≈ 10:41), l'utilisateur a ajouté : garder la trace de chaque étape, du temps passé, du
plan, des choix et des technos, pour en faire une vidéo quand l'app sera prête ; mettre à jour CLAUDE.md +
mémoire à chaque fin de phase et pousser sur https://github.com/Ichigo35/Reboot.

### Chronologie

| Heure | Durée | Étape | Outils |
| --- | --- | --- | --- |
| 10:27 | — | Ouverture de la session, modèle Opus 5.5, effort « xhigh » | Claude Code (`/model`, `/effort`) |
| 10:28 | 2 min | Réflexion sur le concept, création du document du plan (squelette de 12 sections) et ouverture à l'écran | Claude Docs |
| 10:30 | < 1 min | Rédaction de la section « Le concept » (signature R.I.P. = Reprise Immédiate Possible) | Claude Docs |
| 10:30 | 2 min | Étude de marché : 2 recherches web puis un agent qui ouvre et vérifie 6 pages de concurrents | WebSearch, agent web-fetch |
| 10:31 | 4 min | Direction artistique (charte « cimetière français à la Toussaint »), téléchargement de 65 icônes | skills frontend-design + artifact-diagramming, Lucide |
| 10:35 | 6 min | Écriture du générateur des 11 planches illustrées (HTML) | Node.js, `plan/build.mjs` |
| 10:41 | 3 min | Premier rendu, relecture image par image, 3 passes de corrections | Playwright + Google Chrome (×2), sips |
| 10:43 | 2 min | Envoi des 11 images dans le document, remplissage des 11 sections restantes | Artifact (assets), Claude Docs |
| 10:45 | 2 min | Journal de bord, CLAUDE.md, mémoire, archive de la conversation, premier commit + push | git, gh, GitHub |

### Le plan produit

Document : https://claude.ai/artifact/VxLnkZkt7tsi8bz63LzUcM — « Reboot — le cimetière où les projets
ressuscitent ». Sections : concept, deux publics, la pierre tombale, la mécanique du match, les quatre
testaments, les écrans clés, ce qui existe déjà, modèle économique, risques et parades, feuille de route,
architecture technique, décisions à prendre + annexes (champs de la tombe, périmètre par phase, amorçage,
sources).

Planches (dans `plan/out/`, générées par `plan/build.mjs`) : `reboot-cover`, `-publics`, `-anatomie`,
`-mecanique`, `-testaments`, `-ecrans`, `-marche`, `-argent`, `-risques`, `-route`, `-archi` (.jpg, 1680 px de large).

### Les choix faits

| Choix | Qui | Pourquoi |
| --- | --- | --- |
| Idée : un cimetière de projets abandonnés, swipe façon Tinder, reprise avec le créateur | Utilisateur | Idée de départ |
| ~~Nom de travail « Reboot »~~ remplacé | Claude (proposition), puis changé | Nom du dossier ; pistes de secours : Lazare, Second Souffle |
| **Nom de l'app : « RIP »**, signature « Reprise Immédiate Possible » (le « R.I.P. » ponctué n'est plus utilisé) | **Utilisateur** (10:49 : « j'aime bien le nom RIP, Reprise Immédiate Possible, renomme l'app ainsi ou du moins RIP si c'est trop long ») | Court, mémorable, le sens est dans le nom ; le dépôt GitHub a été renommé en `Ichigo35/RIP` (10:50) ; le dossier local s'appelle encore « Reboot » |
| Pas de code à ce stade, juste un plan | Utilisateur | « ne code rien » |
| Vocabulaire funéraire bienveillant : enterrer, tombe, épitaphe, autopsie, héritage, testament, veillée, renaissance | Claude | Mémorable, drôle sans être glauque |
| Signature « R.I.P. — Reprise Immédiate Possible » | Claude | Détourne le cliché du cimetière en promesse |
| 3 gestes : Ressusciter (droite), Laisser reposer (gauche), Déposer une fleur (haut) | Claude | Calqué sur Tinder, sans geste négatif |
| Match à double sens : le créateur choisit parmi ceux qui veulent reprendre | Claude | Personne ne prend un projet sans l'accord du créateur |
| 4 testaments : cofonder, transmettre, céder, libérer | Claude | Le repreneur sait d'avance ce qu'il peut obtenir |
| Veillée limitée à 14 jours | Claude | Contre le ghosting |
| Coffre ouvert seulement après le match, tombe horodatée | Claude | Contre la peur du vol d'idée |
| Périmètre v1 : projets numériques | Claude | Le plus simple à prouver (lien, code, captures) |
| App web installable (PWA) d'abord, stores en phase 3 | Claude, recommandation à valider | Une tombe se partage par un lien ; pas de validation des stores au MVP |
| Cloudflare Workers + Neon (+ R2, Durable Objects) | Règle de l'utilisateur (stack par défaut) | Jamais Vercel ni Supabase |
| Plan illustré en planches, très peu de texte | Règle de l'utilisateur (méthode « CITS ») | Validée sur un projet précédent |
| Prix : gratuit pour enterrer, Reboot+ 7 €/mois, 8 % sur les cessions, cimetières privés 99 à 490 €/mois | Claude, hypothèses à tester | Les créateurs remplissent le cimetière, ils ne paient pas |
| Étoile polaire : pactes signés par mois | Claude | Un match sans pacte ne ressuscite rien |
| Charte visuelle : granit clair, granit noir + dorure gravée, mauve chrysanthème (fleurs), vert pousse (résurrection) ; polices Gloock + Schibsted Grotesk | Claude | Inspirée des cimetières français à la Toussaint, loin des rendus génériques |
| Journal de bord pour une vidéo making-of | Utilisateur | Montrer toutes les étapes de la création |

### Étude de marché (pages ouvertes le 3 novembre 2026)

Aucun produit trouvé ne combine cimetière de projets + swipe + match avec le créateur. Les plus proches :
failedUps (startups mortes cherchant repreneur, sans swipe) et Buildr (swipe de cofondateurs, projets en
cours). Les autres vendent des projets : Dead Acquire, NanoAcquire, SideProjectors ; Solodoers confiait des
MVP à une équipe, à la main.

### Outils et technos utilisés

- Claude Code (modèle Opus 5.5, effort xhigh), skills `anthropic-skills:docs`, `frontend-design`, `artifact-diagramming`
- Claude Docs (document du plan, images insérées comme fichiers du document)
- WebSearch + un agent « web-fetch » pour vérifier les concurrents
- Icônes Lucide (`lucide-static@0.460.0`, licence ISC), polices Google Fonts (Gloock, Schibsted Grotesk)
- Node.js + Playwright piloté sur Google Chrome (capture ×2), `sips` pour le JPEG
- git, GitHub CLI (`gh`), dépôt public https://github.com/Ichigo35/Reboot

### Moments à garder pour la vidéo

- 10:49 : l'utilisateur change le nom en cours de route, de Reboot à RIP. Sur la couverture, le logo passe de « Reboot » à un grand « RIP » ; seules 5 planches sur 11 portaient le nom, les 6 autres sont restées telles quelles.

- Le premier rendu des planches avait des icônes géantes sur 3 planches (un sélecteur CSS `.mc svg` qui
  touchait aussi les icônes) : corrigé en `.mc > svg`.
- L'écran « Il revit ! » sortait clair au lieu de granit noir (un raccourci CSS `background` effaçait la
  texture) : corrigé.
- Sur la couverture, le tampon « Ressusciter » cachait le nom du projet : déplacé.
- Le document se remplissait section par section pendant que l'utilisateur le regardait.

### Décisions laissées à l'utilisateur

- Nom RIP décidé ; reste à vérifier domaine, marque et homonymes, et à décider si on renomme le dossier local.
- Langue : FR + EN dès le MVP (recommandé) ?
- PWA d'abord (recommandé) ou Flutter natif ?
- Fournir 2 ou 3 projets abandonnés personnels comme premières tombes.
- Lancer la phase suivante : page d'accueil + formulaire « Enterre ton projet » (validation sans coder).

### Sources brutes

- Conversation Claude Code : session `5e423446-877d-4d19-969d-1cb060ac37c5`, copie locale dans
  `.journal-brut/` (non versionnée : le dépôt est public).


---

## Phase 1 — Site web : page d'accueil + formulaire « Enterre ton projet » (2026-11-03)

### La demande (mots de l'utilisateur, 10:55)

> « Pour l'instant, je veux juste une version web, on verra plus tard pour smartphone. Tu peux y aller,
> rappelle toi de travailler par phase et de me demander de confirmer à chaque fois que tu finis une phase
> avant de poursuivre »

### Périmètre choisi (Claude)

La première étape du plan (« valider sans coder l'app ») devient un vrai petit site : une page d'accueil qui
explique l'idée, un formulaire pour enterrer un projet, un cimetière public alimenté par les vraies tombes,
et une liste d'attente pour les repreneurs. Pas encore de swipe ni de match (phase suivante).

### Chronologie

| Heure | Étape | Outils |
| --- | --- | --- |
| 10:55 | Vérification de l'environnement (Node 26, wrangler 4.156) | Bash |
| 10:55 | Maquette Stitch demandée (page d'accueil bureau, 10:55:51) : **la génération a expiré** et la liste des écrans est restée vide à 10:57 et à 11:00 (environ 5 minutes d'attente) ; le site est donc construit à partir de la charte déjà validée dans les planches | MCP Stitch |
| 10:55 | Création de la base (lancée en même temps que Stitch, 10:55:52) : projet Neon `rip` (région Singapour, Postgres 17), puis 2 tables `burials` (tombes) et `resurrectors` (repreneurs) avec contraintes | MCP Neon |
| 10:57 | Installation du projet `web/` : conflit de versions npm (wrangler 4.156 exige workers-types 5.x) corrigé | npm |
| 10:58 | API Worker (`web/src/index.ts`) : liste publique du cimetière, enterrement, inscription des repreneurs, anti-robots (champ piège, limite 6 envois par heure et par IP hachée, contrôle d'origine) | TypeScript, Cloudflare Workers, @neondatabase/serverless |
| 10:59 | Page (`web/public/` : index.html, style.css, app.js) : accueil, 4 étapes, 3 gestes, cimetière en direct, formulaire avec aperçu de la tombe en direct, inscription repreneurs | HTML/CSS/JS sans framework |
| 10:59 | Tests réels dans Chrome (bureau 1360 px et mobile 390 px) : validation, envoi, affichage de la tombe, inscription ; aucune erreur console, aucun débordement | Playwright |
| 11:00 | Déploiement : https://rip.ichigo35.workers.dev ; pose du secret `DATABASE_URL` **refusée par le garde-fou** (écriture de secret) → à lancer par l'utilisateur | wrangler |
| 11:02 | Correctif de contraste (texte blanc sur vert à 4,0:1) : vert des boutons foncé de `#3F8F3A` à `#2A7326` (≈ 5,8:1), redéploiement | détecteur impeccable, wrangler |
| 11:03 | L'utilisateur lance la commande du secret (11:03:18). Mon contrôle, parti 3 secondes plus tard, voyait encore une liste vide et l'API en erreur 1101 ; l'utilisateur l'a relancée (11:03:41) et la sortie affichée dit « Success! Uploaded secret DATABASE_URL » | wrangler |
| 11:04 | Test du site en ligne (parcours complet, bureau et mobile, 0 erreur), suppression des données de test, clôture de la phase | Playwright, Neon |

### Les choix faits

| Choix | Qui | Pourquoi |
| --- | --- | --- |
| Version web uniquement, smartphone plus tard | **Utilisateur** | Aller à l'essentiel |
| Travail par phases, confirmation de l'utilisateur à chaque fin de phase | **Utilisateur** | Garder la main |
| Première phase = site d'accueil + formulaire, sans swipe | Claude | Valider l'intérêt avant de coder le swipe |
| Cloudflare Workers (site + API dans un seul Worker) + Neon | Règle de l'utilisateur | Stack par défaut |
| Base Neon dédiée `rip`, région Singapour | Claude | Proche du Laos et de la Thaïlande, projet séparé des autres |
| HTML/CSS/JS sans framework | Claude | Un seul écran, chargement rapide, rien à maintenir |
| Tombe affichée publiquement seulement avec consentement ; e-mail jamais affiché | Claude | Vie privée |
| Aperçu de la tombe en direct pendant la saisie | Claude | Donne envie de finir le formulaire |
| Pas d'envoi d'e-mail pour l'instant | Claude | Pas de domaine ; l'e-mail est seulement collecté |
| Maquette Stitch abandonnée après dépassement de délai (~5 min) | Claude | Ne pas bloquer la phase ; la charte des planches fait office de maquette |
| Passage d'Opus 5.5 (effort élevé) à Sonnet 5.5 (effort moyen), à 10:48 | **Utilisateur** (commandes `/model` et `/effort`) | Modèle plus rapide pour la construction du site |

### Moments à garder pour la vidéo

- Stitch n'a jamais rendu la maquette : le site est parti directement de la charte des planches.
- Premier test sur mobile : le bloc « Ta tombe est creusée » s'affichait dès l'arrivée, car un `display:grid` écrasait l'attribut `hidden` ; trouvé grâce à la capture d'écran, corrigé en une ligne.
- Le garde-fou de sécurité a refusé que l'agent écrive le secret de la base sur Cloudflare : c'est l'utilisateur qui lance la commande.
- Les données de test (1 tombe, 1 repreneur) ont été supprimées de la base, deux fois (en local puis en ligne) ; elle est revenue à zéro.
- Le détecteur de qualité a trouvé un vrai défaut de contraste sur les boutons verts : corrigé en fonçant le vert du site.
- Le secret : mon premier contrôle est arrivé trop tôt (3 secondes après la commande) et a fait croire à un échec ; la commande relancée avec sa sortie visible a confirmé le succès. Leçon : laisser le temps à la commande, ou demander la sortie, avant de conclure.

### Résultat

- Site en ligne : https://rip.ichigo35.workers.dev (Worker `rip`), base Neon `rip` (`empty-lab-37729650`).
- Code : `web/` (`src/index.ts`, `public/`), commandes `npm run dev`, `npm run check`, `npm run deploy` (depuis `web/`).
- Secret `DATABASE_URL` sur le Worker (posé par l'utilisateur) ; copie locale dans `web/.dev.vars` (ignoré par git).
- Pas encore : e-mails envoyés, domaine propre, swipe, comptes.

### Outils et technos

Cloudflare Workers + assets statiques (`wrangler.jsonc`), Neon Postgres 17, `@neondatabase/serverless`,
TypeScript, Playwright + Chrome pour les tests, polices Gloock et Schibsted Grotesk.


---

## Phase 2 — Comptes, swipe, match (2026-11-05)

### La demande (mots de l'utilisateur, 08:53)

> « poursuis etape suivante »

Ce message vaut confirmation de la phase 1 et feu vert pour la phase 2.

### Périmètre choisi (Claude)

Celui proposé à la fin de la phase 1 : comptes, swipe sur les tombes, match. Le créateur choisit parmi les personnes qui veulent reprendre son projet ; le match annonce « Il revit ! ». La veillée (messagerie de 14 jours) reste pour la phase suivante.

### Chronologie

| Heure | Étape | Outils |
| --- | --- | --- |
| 08:53 | Feu vert de l'utilisateur | Claude Code |
| 08:54 | Relecture du journal, du plan (document Claude Docs), du code et de la base | Bash, Claude Docs, MCP Neon |
| 08:56 | Projet Stitch « RIP » retrouvé avec son design system. La liste des écrans était vide, mais cette liste n'est pas fiable (voir la correction en phase 3) | MCP Stitch |
| 08:57 | 3 maquettes lancées en parallèle (Cimetière, Mes tombes, Il revit !), **reçues 2 min 30 plus tard** | MCP Stitch |
| 09:00 | Relecture des maquettes : on garde la composition, on retire ce que Stitch a inventé | Claude |
| 09:02 | Migration de la base : tables `users`, `sessions`, `auth_attempts`, `swipes`, `matches`, colonne `burials.user_id` (`web/db/0002_comptes_swipe_match.sql`) | MCP Neon |
| 09:02 | API : comptes et sessions (`web/src/auth.ts`), pile, gestes, annulation, file du créateur, match atomique (`web/src/index.ts`) | TypeScript, Workers |
| 09:05 | Pages : `cimetiere`, `mes-tombes`, `reprises`, `profil`, socle commun `lib.js`, style `app.css`, en-têtes de sécurité `_headers`, accueil rebranché sur les comptes | HTML/CSS/JS sans framework |
| 09:11 | Test de l'API avec 4 puis 5 comptes (`web/tests/parcours.mjs`) : 82 contrôles, dont les abus | Node.js, wrangler dev |
| 09:12 | Parcours réel dans Chrome (bureau et iPhone émulé) : souris, clavier, doigt, 27 captures | Playwright |
| 09:14 | Corrections après relecture des captures (voir « Moments à garder ») | CSS, JS |
| 09:19 | Réponse propre si la base est injoignable ; 82 contrôles de nouveau au vert | TypeScript |
| 09:19 | Déploiement sur https://rip.ichigo35.workers.dev | wrangler |
| 09:20 | `burials.user_id` passe en `NOT NULL` (après le déploiement, pour ne pas casser l'ancien code encore en ligne) | MCP Neon |
| 09:20 | Parcours Chrome complet **sur le site en ligne** : aucun problème, base revenue à zéro | Playwright |
| 09:21 | Clôture : journal, règles, mémoire, archive, commit et push | git |

### Les choix faits

| Choix | Qui | Pourquoi |
| --- | --- | --- |
| Confirmation de la phase 1, feu vert phase 2 | **Utilisateur** | « poursuis etape suivante » |
| Périmètre : comptes + swipe + match, sans la veillée | Claude, proposé en fin de phase 1 | Boucler le cœur de l'app avant la messagerie |
| Connexion par e-mail + mot de passe (le plan prévoyait lien e-mail, GitHub ou Google) | Claude | Pas de domaine, donc pas d'envoi d'e-mail ; GitHub et Google demandent des clés que seul l'utilisateur peut créer. À revoir dès qu'un domaine existe |
| Mots de passe en PBKDF2, 100 000 itérations, même méthode que Leads Immo | Claude | Le maximum accepté par les Workers ; verrou après 10 échecs en 15 minutes |
| Session dans un cookie HttpOnly, seule son empreinte en base | Claude | Une fuite de la base ne donne pas accès aux comptes |
| Visite du cimetière sans compte, compte demandé au premier geste | Claude | Voir avant de s'engager ; le plan veut qu'une tombe s'ouvre sans friction |
| Compte demandé après le formulaire d'enterrement, pas avant | Claude | Rien de ce qui est saisi n'est perdu |
| Mot au créateur obligatoire pour ressusciter (10 caractères au moins) | Plan de la phase 0, appliqué par Claude | « Ressusciter = un mot au créateur » : le créateur choisit à partir de ce message |
| Une seule reprise à la fois par tombe, garantie par la base | Claude, d'après le plan | La tombe quitte le cimetière pendant la reprise ; deux acceptations simultanées ne peuvent pas passer |
| Accepter et décliner demandent une confirmation | Claude | Ces deux gestes sont définitifs pour l'instant |
| Annuler le dernier geste pendant 6 secondes, revoir les tombes au repos | Claude | Un mauvais swipe ne doit pas être définitif |
| E-mails jamais échangés au match, même si la messagerie n'existe pas encore | Claude | La promesse « ton e-mail reste privé » tient ; la veillée viendra à la place |
| Liste d'attente des repreneurs retirée de l'accueil, table conservée | Claude | Elle n'a plus d'objet une fois le cimetière ouvert ; rien n'est supprimé en base |
| Stitch utilisé cette fois, avec le design system du projet ; polices et couleurs du site conservées | Règle de l'utilisateur + Claude | Stitch ne propose pas Gloock ; la charte déjà en ligne reste la référence |
| Aucune fausse tombe dans le cimetière en ligne | Claude | Les fausses tombes sont un risque identifié au plan ; les premières tombes viendront de l'utilisateur |
| Reporté : filtres, quota de 20 swipes par jour, signalement, suppression de compte, connexion GitHub/Google, e-mails, Médium, captures sur les tombes | Claude | Hors du périmètre de la phase ; le signalement est à faire avant d'ouvrir au public |

### Moments à garder pour la vidéo

- **Stitch fonctionne enfin** : en phase 1 il avait expiré sans rien rendre ; cette fois, 3 écrans en 2 min 30. Maquettes dans `plan/stitch/`.
- Stitch a brodé : étoiles GitHub, « Crypte active, concessionnaire connecté », « Registre des défunts numériques », filigrane « REQUIESCAT ». Tout a été retiré, pour ne garder que la composition.
- **La protection a arrêté son propre test** : à force de relancer les essais, le site a refusé de nouveaux comptes (« Trop de comptes créés depuis cette connexion »). Le verrou marchait ; c'est le nettoyage du test qui visait la mauvaise adresse locale.
- Un des 82 contrôles était faux : il affirmait vérifier « plus de swipe sur une tombe en reprise » sans le tester. Repéré à la relecture et réécrit.
- L'icône de fleur de la phase 1 était illisible à grande taille : remplacée par la vraie icône Lucide.
- La pierre de derrière apparaissait coupée net quand on tirait la carte : corrigé.
- **Le vrai bug trouvé par la capture** : sur iPhone (écran utile de 664 px), une tombe normale cachait les boutons, et la carte captait le doigt, donc on ne pouvait plus faire défiler. Mise en page resserrée, boutons toujours visibles, défilement rendu quand la tombe dépasse l'écran.
- Signature visuelle : la pousse grandit sur la pierre quand on la tire vers « Ressusciter », puis elle sort de la pierre sur l'écran « Il revit ! ».

### Résultat

- En ligne : https://rip.ichigo35.workers.dev (accueil), `/cimetiere`, `/mes-tombes`, `/reprises`, `/profil`.
- Tests : 82 contrôles d'API au vert (`node tests/parcours.mjs` depuis `web/`, avec `npx wrangler dev` lancé) ; parcours complet dans Chrome, bureau et iPhone émulé, en local puis sur le site en ligne : aucune erreur console, aucun débordement. Pas encore essayé sur un vrai téléphone.
- Base : toutes les données de test supprimées (0 compte, 0 tombe).
- Captures pour la vidéo : `plan/captures/phase-2/`, maquettes : `plan/stitch/`.

### Limites connues à ce stade

- Pas de mot de passe oublié ni de vérification de l'adresse e-mail : il faut un domaine pour envoyer des e-mails.
- Aucune alerte hors du site : le créateur voit ses demandes en revenant (pastille sur Mes tombes), le repreneur découvre le match à sa prochaine visite.
- Après un match, les deux personnes ne peuvent pas encore se parler, et la reprise ne peut pas être annulée : la tombe reste hors du cimetière en attendant la veillée.

### Outils et technos

Cloudflare Workers + assets statiques, Neon Postgres 17, `@neondatabase/serverless`, WebCrypto (PBKDF2, SHA-256), TypeScript, HTML/CSS/JS sans framework, événements pointeur pour le swipe, MCP Stitch, Playwright + Chrome, skill `frontend-design`, icônes Lucide.

### Sources brutes

- Conversation Claude Code : session `41e86b63-a2e5-4410-b916-368a4be85f78`, copie locale dans `.journal-brut/`.


---

## Phase 3 — Veillée, signalement, modération (2026-11-05)

### La demande (mots de l'utilisateur, 09:23)

> « oui je confirme, passe phase 3, pas de domaine, c'est juste un MVP, je n'ai pas de projets abandonnees »

### Périmètre choisi

Celui proposé à la fin de la phase 2 et accepté : la veillée de 14 jours (messagerie) et le signalement. Claude y a ajouté deux choses sans lesquelles le parcours restait sans issue : conclure la reprise à deux, et une page de modération pour traiter les signalements.

### Chronologie

| Heure | Étape | Outils |
| --- | --- | --- |
| 09:23 | Confirmation de la phase 2, feu vert phase 3 | Claude Code |
| 09:26 | Maquettes demandées à Stitch : la veillée est reçue en 2 minutes, la modération expire et n'est pas relancée | MCP Stitch |
| 09:28 | Migration de la base : tables `messages` et `reports`, colonnes sur `matches`, `users`, `burials` (`web/db/0003_veillee_signalement.sql`) | MCP Neon |
| 09:30 | API : `web/src/vigil.ts`, `web/src/moderation.ts`, `web/src/http.ts`, branchement dans `index.ts` | TypeScript, Workers |
| 09:31 | Écrans : `veillee`, `moderation`, drapeau de signalement sur les tombes, pastilles de messages non lus, liens depuis Mes tombes et Reprises | HTML/CSS/JS sans framework |
| 09:34 | Test de l'API étendu aux veillées et à la modération | Node.js, wrangler dev |
| 09:36 | Parcours Chrome à deux personnes en parallèle, 17 captures, puis corrections | Playwright |
| 09:39 | Les 3 parcours rejoués en local : tout est au vert | Node.js, Playwright |
| 09:41 | Déploiement : **la tâche planifiée est refusée par Cloudflare** (limite gratuite atteinte) | wrangler |
| 09:43 | Expiration déplacée à la lecture des listes, nouveau déploiement sans erreur | TypeScript, wrangler |
| 09:44 | Parcours complet sur le site en ligne, expiration après 14 jours comprise : aucun problème, base revenue à zéro | Playwright |
| 09:45 | Clôture : journal, règles, mémoire, archive, commit et push | git |

### Les choix faits

| Choix | Qui | Pourquoi |
| --- | --- | --- |
| Confirmation de la phase 2, feu vert phase 3 | **Utilisateur** | « oui je confirme, passe phase 3 » |
| Pas de domaine, le site reste un MVP | **Utilisateur** | « c'est juste un MVP » ; conséquence : pas d'e-mails, donc pas de mot de passe oublié ni d'alertes |
| Pas de tombes de l'utilisateur | **Utilisateur** | « je n'ai pas de projets abandonnees » ; le cimetière reste vide |
| Messages relevés toutes les 5 secondes, stockés dans Neon, au lieu des Durable Objects du plan | Claude | Bien plus simple pour un MVP ; le relevé s'arrête quand l'onglet est masqué ou la veillée finie |
| Conclure la reprise à deux, sans contrat | Claude | Le pacte type doit être relu par un juriste (plan). Sans cette sortie, une reprise réussie retournerait au cimetière au bout de 14 jours |
| Chacun peut mettre fin à la veillée | Claude | Levait la limite de la phase 2 : une reprise ne pouvait pas être annulée |
| La conversation reste à relire après la fin, sans pouvoir écrire | Claude | Chacun garde la trace de ce qui s'est dit |
| Une tombe ressuscitée ne revient jamais au cimetière, les autres demandes sont déclinées | Claude | La file n'a plus d'objet |
| Administrateur attribué à la main en base, jamais d'après l'e-mail | Claude | Les e-mails ne sont pas vérifiés : n'importe qui pourrait s'inscrire avec celui de l'administrateur |
| Au 3e signalement ouvert, la tombe se retire seule ; « Classer » la remet | Claude | L'administrateur n'a aucune alerte : le site doit se protéger en son absence |
| La modération peut lire la conversation signalée, et le dialogue le dit | Claude | Impossible de juger sans la lire ; la personne qui signale doit le savoir |
| Bloquer un compte : session fermée, tombes retirées, veillées fermées ; une reprise conclue reste | Claude | Protéger l'autre personne sans lui retirer son projet |
| Expiration à la lecture des listes au lieu d'une tâche planifiée | Claude, après le refus de Cloudflare | Le compte gratuit a déjà ses 5 tâches planifiées, prises par d'autres projets. Pas de passage en payant, rien de touché ailleurs |
| Page de modération codée sans maquette | Claude | Stitch a expiré ; l'outil demande de ne pas relancer. Elle reprend la charte existante |
| Reporté : pacte type, coffre, Médium, filtres, quota de swipes, suppression de compte, images sur les tombes | Claude | Hors du périmètre de la phase |

### Moments à garder pour la vidéo

- **Deux navigateurs côte à côte** : Léa écrit, le message apparaît chez Karim sans recharger ; Karim conclut, puis Léa, et « Ressuscité ! » s'affiche des deux côtés.
- **La bougie se consume** : sa hauteur suit les jours restants ; à la fin elle s'éteint, ou laisse la place à la pousse si le projet est ressuscité.
- **Le déploiement refusé** : tous les tests étaient au vert, et c'est le déploiement qui a révélé que Cloudflare refusait la tâche planifiée. Sans lire la sortie de la commande, on aurait cru que tout allait bien : le site répondait et les parcours passaient, mais les veillées ne se seraient jamais éteintes.
- Une tentative d'injection de code dans un message s'affiche comme du simple texte.
- Le même piège qu'en phase 1 : un style général de l'accueil (`section`) ajoutait un grand vide autour de la conversation, repéré sur la capture.
- « Il revit ! » s'affichait par-dessus la veillée qu'on était déjà en train d'ouvrir : retiré dans ce cas.
- Le test a buté sur le garde-fou des 6 tombes par heure : c'était le test qui en créait trop.

### Correction sur la phase 2

En phase 2, ce journal disait que la génération Stitch de la phase 1 « n'avait rien laissé », parce que `list_screens` renvoyait une liste vide. C'était une conclusion trop rapide : cet outil renvoie aussi une liste vide alors que 4 écrans existent maintenant. On ne peut donc rien dire de ce qui s'est passé en phase 1. De la même façon, on ne sait pas si la maquette de modération a fini par se générer.

### Résultat

- En ligne : https://rip.ichigo35.workers.dev, nouvelles pages `/veillee?id=…` et `/moderation`.
- Tests : 160 contrôles d'API au vert ; parcours complets dans Chrome (bureau et iPhone émulé) en local puis sur le site en ligne : aucune erreur console, aucun débordement. Pas encore essayé sur un vrai téléphone.
- Base : toutes les données de test supprimées (0 compte, 0 tombe, 0 message, 0 signalement).
- Maquette : `plan/stitch/veillee.jpg` ; captures : `plan/captures/phase-3/`.

### Limites connues à ce stade

- Sans domaine : pas de mot de passe oublié, pas de vérification d'e-mail, pas d'alerte hors du site. Un mot de passe perdu, c'est un compte perdu.
- Une veillée expirée ne se ferme que lorsque quelqu'un consulte le cimetière ou ses listes ; d'ici là, on ne peut déjà plus y écrire.
- Conclure la reprise n'a aucune valeur de contrat.
- Les messages arrivent en 5 secondes au plus, pas instantanément. Un onglet ouvert toute une journée consomme environ 17 000 requêtes sur les 100 000 du plan gratuit : à revoir si le site grandit.
- Pas de suppression de compte, à ajouter avant une vraie ouverture au public (RGPD).

### Outils et technos

Cloudflare Workers + assets statiques, Neon Postgres 17 (transactions HTTP), TypeScript, HTML/CSS/JS sans framework, MCP Stitch, Playwright + Chrome (deux sessions en parallèle), icônes Lucide.

### Sources brutes

- Conversation Claude Code : session `41e86b63-a2e5-4410-b916-368a4be85f78` (même session que la phase 2), copie locale dans `.journal-brut/`.
