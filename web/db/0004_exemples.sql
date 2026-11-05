-- Phase 4 : tombes d'exemple, tenues par un compte système qui ne peut pas se connecter.
-- Les comptes en @rip.invalid et les tombes d'exemple n'entrent dans aucun chiffre public.

ALTER TABLE burials ADD COLUMN is_example boolean NOT NULL DEFAULT false;

INSERT INTO users (email, password_hash, name) VALUES ('gardien@rip.invalid', 'disabled', 'Le gardien');

INSERT INTO burials (name, year_start, year_end, epitaph, cause, legacy, missing, will, consent, ip_hash, user_id, is_example)
SELECT t.name, t.year_start, t.year_end, t.epitaph, t.cause, t.legacy, t.missing, t.will, true, 'exemple', u.id, true
FROM users u, (VALUES
  ('Mangetout', 2023, 2025, 'Il voulait que plus rien ne finisse à la poubelle.', 'no_time', 'App Flutter terminée à 80 %, 340 inscrits, nom de domaine.', 'Dev mobile, marketing', 'cofound'),
  ('Pixel Paddock', 2024, 2025, 'Mort à 80 %, il ne lui manquait qu''un artiste.', 'missing_skill', 'Jeu Godot jouable, 12 niveaux, musique originale.', 'Graphiste pixel art', 'cofound'),
  ('Covoit'' du Mardi', 2022, 2024, 'Il a transporté 200 étudiants, puis son associé a eu son diplôme.', 'partner_left', 'Site en ligne, 1 200 comptes, une communauté locale active.', 'Dev web, animation de communauté', 'handover'),
  ('La Facture qui Chante', 2021, 2023, 'Il facturait tout, sauf son propre temps.', 'no_market', 'Logiciel en ligne, 40 clients payants, code Laravel.', 'Commercial', 'sell'),
  ('Balcon Vert', 2023, 2024, 'Il arrosait les balcons, pas ses finances.', 'no_money', 'App iOS, fiches de 150 plantes, photos libres de droits.', 'Dev iOS, botaniste', 'release')
) AS t(name, year_start, year_end, epitaph, cause, legacy, missing, will)
WHERE u.email = 'gardien@rip.invalid';
