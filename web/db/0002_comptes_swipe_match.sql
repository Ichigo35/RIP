-- Phase 2 : comptes, swipe, match. Uniquement des ajouts : rien n'est supprimé.
-- La table resurrectors (liste d'attente de la phase 1) n'est plus utilisée mais reste en place.

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL UNIQUE CHECK (char_length(email) BETWEEN 5 AND 200 AND email = lower(email)),
  password_hash text NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 40),
  skills text NOT NULL DEFAULT '' CHECK (char_length(skills) <= 200),
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 300)
);

-- Le cookie contient le jeton ; la base n'en garde que l'empreinte.
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

-- Compteur anti brute-force : échecs de connexion et créations de compte.
CREATE TABLE auth_attempts (
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_attempts_key_idx ON auth_attempts (key, created_at);

-- Une tombe appartient désormais à un compte ; l'e-mail vit sur le compte.
ALTER TABLE burials ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE burials ALTER COLUMN email DROP NOT NULL;
CREATE INDEX burials_user_idx ON burials (user_id);
-- Lancé après le déploiement du nouveau code, la table étant vide : l'ancien code n'écrivait pas user_id.
ALTER TABLE burials ALTER COLUMN user_id SET NOT NULL;

-- Un geste par personne et par tombe. Pour « revive », c'est aussi la demande de reprise.
CREATE TABLE swipes (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  burial_id uuid NOT NULL REFERENCES burials(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('revive', 'rest', 'flower')),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 300),
  decision text CHECK (decision IN ('accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  PRIMARY KEY (user_id, burial_id)
);
CREATE INDEX swipes_burial_idx ON swipes (burial_id, action);

-- ended_at servira quand la veillée se termine sans pacte (la tombe retourne au cimetière).
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  burial_id uuid NOT NULL REFERENCES burials(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seen_by_reviver boolean NOT NULL DEFAULT false,
  ended_at timestamptz
);
-- Une tombe ne peut avoir qu'une reprise en cours : c'est la base qui le garantit.
CREATE UNIQUE INDEX matches_one_active_idx ON matches (burial_id) WHERE ended_at IS NULL;
CREATE INDEX matches_reviver_idx ON matches (reviver_id);
