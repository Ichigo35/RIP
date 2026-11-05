# RIP — règles du projet (ex-Reboot)

App où l'on « enterre » ses projets abandonnés pour que d'autres les ressuscitent : swipe façon Tinder sur
des pierres tombales, match à double sens avec le créateur, veillée de 14 jours, pacte de reprise.
Nom officiel : **RIP** = « Reprise Immédiate Possible » (choisi par l'utilisateur le 2026-11-03 ; le dépôt GitHub est devenu `Ichigo35/RIP`, le dossier local s'appelle encore « Reboot »).

- Dépôt : https://github.com/Ichigo35/RIP (**public** : jamais de secret, de jeton ni de transcript brut)
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
- Chaque fin de phase : demander à l'utilisateur de confirmer avant de continuer (demandé le 2026-11-03).
- Stack : Cloudflare (Workers, R2, Durable Objects, `wrangler`) + Neon. Jamais Vercel ni Supabase.
- UI/UX : maquettes avec MCP Stitch avant de coder un écran (règle globale) ; charte du plan à reprendre :
  granit clair `#E4E4DF`, granit noir `#232428` + dorure `#C9A65A`, mauve chrysanthème `#8A2D78` (fleurs),
  vert pousse `#3F8F3A` (résurrection) ; polices Gloock (titres) + Schibsted Grotesk (texte).
- Toujours répondre en français.

## Avancement

- **Nom** : RIP depuis le 2026-11-03 (avant : Reboot).
- **Phase 0 — Idée et plan illustré** : terminée le 2026-11-03 (~19 min). Concept, étude de marché (6 concurrents,
  aucun ne combine cimetière + swipe + match), plan en 11 planches, journal de bord, dépôt GitHub.
- **Phase 1 — Site web (accueil + formulaire « Enterre ton projet »)** : terminée le 2026-11-03 (~9 min). En ligne : https://rip.ichigo35.workers.dev (Worker `rip`, base Neon `rip` / `empty-lab-37729650`, code dans `web/`). Version web uniquement pour l'instant (smartphone plus tard, décision de l'utilisateur). Déploiement : `cd web && npm run deploy` ; secret `DATABASE_URL` à poser par l'utilisateur (`! … wrangler secret put`), l'agent n'a pas le droit. Test local : `web/.dev.vars` (ignoré par git) + `npx wrangler dev`. Données de test à supprimer après chaque essai (emails `@example.com`).
- **Phase 2 — Comptes, swipe, match** : terminée et confirmée le 2026-11-05 (~30 min). En ligne : `/cimetiere` (swipe souris, clavier, doigt ; visite sans compte), `/mes-tombes` (file du créateur, accepter ou décliner), `/reprises`, `/profil`, écran « Il revit ! ». Comptes par e-mail + mot de passe (`web/src/auth.ts`, PBKDF2 100 000 itérations, verrou après 10 échecs) ; API dans `web/src/index.ts` ; socle front `web/public/lib.js`, style `app.css` ; migration `web/db/0002_comptes_swipe_match.sql`. Maquettes Stitch : projet `12452121658687960461`, images dans `plan/stitch/` (`list_screens` renvoie vide même quand des écrans existent : ne rien en conclure).
- **Phase 4 — Tombes d'exemple, suppression de compte** : terminée le 2026-11-05 (~14 min), **en attente de la confirmation de l'utilisateur**. 5 tombes `is_example`, tenues par le compte système `gardien@rip.invalid` (connexion impossible), marquées partout, hors chiffres publics, toujours après les vraies tombes ; « Ressusciter » n'y crée aucune demande. Suppression de compte dans `/profil`, avec mot de passe. Migration `web/db/0004_exemples.sql`.
- **Phase 3 — Veillée, signalement, modération** : terminée et confirmée le 2026-11-05 (~24 min). `/veillee?id=…` : conversation de 14 jours (messages relevés toutes les 5 s, `web/src/vigil.ts`), bougie qui se consume, conclure à deux (tombe Ressuscitée, sans contrat), mettre fin. `/moderation` (`web/src/moderation.ts`) : signalements de tombes et de personnes, retirer, bloquer, classer ; retrait automatique au 3e signalement ouvert. Migration `web/db/0003_veillee_signalement.sql`.
- **Administrateur** : `users.is_admin`, posé à la main en base. Le compte de l'utilisateur l'est depuis le 2026-11-05 : c'est un vrai compte, les tests ne suppriment que les `@example.com`.
- **Pas de tâche planifiée** : le compte Cloudflare gratuit a atteint sa limite de 5 ; les veillées expirées se ferment à la lecture des listes (`LISTS` dans `index.ts`). `npm run deploy` peut échouer après avoir mis le code en ligne : toujours lire la fin de sa sortie.
- **Tests** : `npx wrangler dev` puis `node tests/parcours.mjs` depuis `web/` (182 contrôles, nettoie ses données `@example.com`) ; parcours réels : `web/tests/chrome-parcours.mjs` et `chrome-veillee.mjs` (`BASE=<url> node <script> <dossier-captures>`). La base locale et la base en ligne sont la même : ne jamais insérer de données que l'ancien code afficherait mal avant d'avoir déployé. Le verrou anti brute-force compte aussi les essais locaux : si les inscriptions ou connexions de test sont refusées, vider les lignes `auth_attempts` de test.
- **Pas de domaine** (décision de l'utilisateur, 2026-11-05 : « c'est juste un MVP ») : pas de mot de passe oublié, pas de vérification d'e-mail, pas d'alerte hors du site.
- **Décisions en attente** (utilisateur) : confirmation de fin de phase 4, essai sur un vrai téléphone, renommer ou non le dossier local, langue FR + EN (le site est en français pour l'instant), suite à donner (pacte type, Médium, filtres).
