# Reboot — règles du projet

App où l'on « enterre » ses projets abandonnés pour que d'autres les ressuscitent : swipe façon Tinder sur
des pierres tombales, match à double sens avec le créateur, veillée de 14 jours, pacte de reprise.
Signature : « R.I.P. — Reprise Immédiate Possible ».

- Dépôt : https://github.com/Ichigo35/Reboot (**public** : jamais de secret, de jeton ni de transcript brut)
- Plan illustré (Claude Docs) : https://claude.ai/artifact/VxLnkZkt7tsi8bz63LzUcM
- Planches du plan : `plan/build.mjs` → `plan/out/reboot-*.jpg` (`node plan/build.mjs [nom…]`)

## Journal de bord : obligatoire, pour la vidéo making-of

L'utilisateur fera une vidéo de toutes les étapes de création de l'app. Donc, **à chaque étape** :
1. Ajouter une ligne dans `JOURNAL.md` (phase en cours) : heure, durée, ce qui a été fait, outils/technos.
   Horodatages tirés de la conversation : `~/.claude/projects/-Users-jimnytcha-Dembs-lab-Reboot/<session>.jsonl`
   (champ `timestamp` en UTC, convertir en UTC+7).
2. Noter chaque choix dans le tableau « Les choix faits » avec **qui** l'a fait (utilisateur, Claude,
   règle de l'utilisateur) et pourquoi, y compris les choix refusés ou changés en route.
3. Noter les moments utiles à la vidéo (bugs, retours, avant/après) et les liens vers les livrables
   (captures, déploiements, commits).

**À chaque fin de phase**, sans redemander :
- finaliser la phase dans `JOURNAL.md` (durée totale, résultat) et la ligne de la « Vue d'ensemble » ;
- mettre à jour la section « Avancement » ci-dessous, la mémoire `reboot-projet` et la section « Projet
  Reboot » de `~/.claude/CLAUDE.md` ;
- copier la conversation dans `.journal-brut/` (non versionné) :
  `cp ~/.claude/projects/-Users-jimnytcha-Dembs-lab-Reboot/<session>.jsonl .journal-brut/<date>_session-<id8>.jsonl` ;
- commit + push sur `origin main`.

## Façon de travailler

- Par phases : terminer une phase, s'arrêter, attendre que l'utilisateur dise de continuer.
- Stack : Cloudflare (Workers, R2, Durable Objects, `wrangler`) + Neon. Jamais Vercel ni Supabase.
- UI/UX : maquettes avec MCP Stitch avant de coder un écran (règle globale) ; charte du plan à reprendre :
  granit clair `#E4E4DF`, granit noir `#232428` + dorure `#C9A65A`, mauve chrysanthème `#8A2D78` (fleurs),
  vert pousse `#3F8F3A` (résurrection) ; polices Gloock (titres) + Schibsted Grotesk (texte).
- Toujours répondre en français.

## Avancement

- **Phase 0 — Idée et plan illustré** : terminée le 2026-11-03 (~24 min). Concept, étude de marché (6 concurrents,
  aucun ne combine cimetière + swipe + match), plan en 11 planches, journal de bord, dépôt GitHub.
- **Décisions en attente** (utilisateur) : nom Reboot, langue FR + EN, PWA d'abord ou Flutter, 2-3 projets
  personnels comme premières tombes, feu vert pour la phase suivante (page d'accueil + formulaire « Enterre ton
  projet », validation sans coder).
