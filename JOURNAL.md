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
| 0b. Renommage en RIP | 2026-11-03 | 10:48 → 10:51 | ~2 min | Nom officiel « RIP », planches et document mis à jour |

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
| **Nom de l'app : « RIP »**, signature « Reprise Immédiate Possible » (le « R.I.P. » ponctué n'est plus utilisé) | **Utilisateur** (10:48 : « j'aime bien le nom RIP, Reprise Immédiate Possible, renomme l'app ainsi ou du moins RIP si c'est trop long ») | Court, mémorable, le sens est dans le nom ; le dépôt GitHub a été renommé en `Ichigo35/RIP` (10:50) ; le dossier local s'appelle encore « Reboot » |
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

- 10:48 : l'utilisateur change le nom en cours de route, de Reboot à RIP. Sur la couverture, le logo passe de « Reboot » à un grand « RIP » ; seules 5 planches sur 11 portaient le nom, les 6 autres sont restées telles quelles.

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
