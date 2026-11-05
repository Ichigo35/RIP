-- Phase 3 : veillée de 14 jours, signalement et modération. Uniquement des ajouts.

-- Administrateur : attribué à la main, jamais d'après l'e-mail, qui n'est pas vérifié.
ALTER TABLE users ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN banned_at timestamptz;

-- Retrait par la modération, distinct de consent : le créateur ne peut pas republier une tombe retirée.
ALTER TABLE burials ADD COLUMN hidden_at timestamptz;

ALTER TABLE matches ADD COLUMN ends_at timestamptz NOT NULL DEFAULT now() + interval '14 days';
ALTER TABLE matches ADD COLUMN end_reason text CHECK (end_reason IN ('expired', 'left', 'banned'));
ALTER TABLE matches ADD COLUMN ended_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN creator_read_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE matches ADD COLUMN reviver_read_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE matches ADD COLUMN creator_sealed_at timestamptz;
ALTER TABLE matches ADD COLUMN reviver_sealed_at timestamptz;
-- Rempli quand les deux ont conclu : la tombe est ressuscitée, la bougie ne s'éteint plus.
ALTER TABLE matches ADD COLUMN revived_at timestamptz;
CREATE INDEX matches_creator_idx ON matches (creator_id);
CREATE INDEX matches_expiring_idx ON matches (ends_at) WHERE ended_at IS NULL AND revived_at IS NULL;

CREATE TABLE messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_match_idx ON messages (match_id, id);

-- kind = tomb : une tombe du cimetière. kind = person : l'autre personne d'une veillée (match_id rempli).
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('tomb', 'person')),
  burial_id uuid NOT NULL REFERENCES burials(id) ON DELETE CASCADE,
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('offensive', 'fake', 'stolen', 'harassment', 'scam', 'other')),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 500),
  resolved_at timestamptz,
  resolution text CHECK (resolution IN ('removed', 'banned', 'dismissed'))
);
CREATE UNIQUE INDEX reports_tomb_once_idx ON reports (reporter_id, burial_id) WHERE kind = 'tomb';
CREATE UNIQUE INDEX reports_person_once_idx ON reports (reporter_id, match_id) WHERE kind = 'person';
CREATE INDEX reports_open_idx ON reports (created_at) WHERE resolved_at IS NULL;
