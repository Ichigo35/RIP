import { neon } from "@neondatabase/serverless";
import {
  closeSession, currentUser, DUMMY_HASH, hashPassword, openSession, recordFailure, tooManyFailures, verifyPassword,
  type Sql, type User,
} from "./auth";

interface Env {
  DATABASE_URL: string;
}

const CAUSES = ["no_time", "no_money", "partner_left", "missing_skill", "no_market", "motivation", "competitor", "technical", "life_change"] as const;
const WILLS = ["cofound", "handover", "sell", "release"] as const;
const ACTIONS = ["revive", "rest", "flower"] as const;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_PASSWORD = 10;
const MIN_NOTE = 10;

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

async function hashIp(ip: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`rip:${ip}`));
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return !origin || origin === new URL(req.url).origin;
}

async function readBody(req: Request) {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return null;
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const notAvailable = () => json({ error: "Cette tombe n'est plus disponible." }, 409);

/* ---------- lectures ---------- */

async function graveyard(sql: Sql) {
  const [rows, counts] = await Promise.all([
    sql`SELECT b.name, b.year_start, b.year_end, b.epitaph, b.cause, b.will, b.legacy, b.missing,
               EXISTS (SELECT 1 FROM matches m WHERE m.burial_id = b.id AND m.ended_at IS NULL) AS revived
        FROM burials b WHERE b.consent ORDER BY b.created_at DESC LIMIT 12`,
    sql`SELECT (SELECT count(*) FROM burials)::int AS burials, (SELECT count(*) FROM users)::int AS users`,
  ]);
  return json({ tombs: rows, ...counts[0] });
}

/** Les tombes qu'il reste à visiter ; sans compte, toutes les tombes publiques disponibles. */
async function deck(sql: Sql, user: User | null) {
  const me = user?.id ?? null;
  const rows = await sql`
    SELECT b.id, b.name, b.year_start, b.year_end, b.epitaph, b.cause, b.will, b.legacy, b.missing,
           (SELECT count(*) FROM swipes f WHERE f.burial_id = b.id AND f.action = 'flower')::int AS flowers,
           count(*) OVER ()::int AS total
    FROM burials b
    WHERE b.consent AND b.user_id IS NOT NULL
      AND (${me}::uuid IS NULL OR b.user_id <> ${me}::uuid)
      AND NOT EXISTS (SELECT 1 FROM swipes s WHERE s.burial_id = b.id AND s.user_id = ${me}::uuid)
      AND NOT EXISTS (SELECT 1 FROM matches m WHERE m.burial_id = b.id AND m.ended_at IS NULL)
    ORDER BY b.created_at DESC LIMIT 20`;
  const rested = me ? await sql`SELECT count(*)::int AS n FROM swipes WHERE user_id = ${me} AND action = 'rest'` : [{ n: 0 }];
  return json({ tombs: rows, total: rows[0]?.total ?? 0, rested: rested[0].n });
}

async function myTombs(sql: Sql, user: User) {
  const [tombs, requests] = await Promise.all([
    sql`SELECT b.id, b.name, b.year_start, b.year_end, b.epitaph, b.will, b.consent AS visible,
               (SELECT count(*) FROM swipes f WHERE f.burial_id = b.id AND f.action = 'flower')::int AS flowers,
               m.id AS match_id, u.name AS reviver_name
        FROM burials b
        LEFT JOIN matches m ON m.burial_id = b.id AND m.ended_at IS NULL
        LEFT JOIN users u ON u.id = m.reviver_id
        WHERE b.user_id = ${user.id} ORDER BY b.created_at DESC`,
    sql`SELECT s.burial_id, s.note, s.created_at, u.id AS user_id, u.name, u.skills, u.bio
        FROM swipes s JOIN burials b ON b.id = s.burial_id JOIN users u ON u.id = s.user_id
        WHERE b.user_id = ${user.id} AND s.action = 'revive' AND s.decision IS NULL ORDER BY s.created_at`,
  ]);
  return json({ tombs: tombs.map((t) => ({ ...t, requests: requests.filter((r) => r.burial_id === t.id) })) });
}

async function reprises(sql: Sql, user: User) {
  const rows = await sql`
    SELECT b.id, b.name, b.year_start, b.year_end, b.epitaph, s.action, s.note, s.decision,
           m.id AS match_id, c.name AS creator_name,
           EXISTS (SELECT 1 FROM matches o WHERE o.burial_id = b.id AND o.ended_at IS NULL) AS taken
    FROM swipes s JOIN burials b ON b.id = s.burial_id
    LEFT JOIN matches m ON m.burial_id = b.id AND m.reviver_id = ${user.id} AND m.ended_at IS NULL
    LEFT JOIN users c ON c.id = m.creator_id
    WHERE s.user_id = ${user.id} AND s.action <> 'rest' ORDER BY s.created_at DESC`;
  return json({ items: rows });
}

async function session(sql: Sql, user: User) {
  const rows = await sql`
    SELECT (SELECT count(*) FROM swipes s JOIN burials b ON b.id = s.burial_id
            WHERE b.user_id = ${user.id} AND s.action = 'revive' AND s.decision IS NULL
              AND NOT EXISTS (SELECT 1 FROM matches m WHERE m.burial_id = b.id AND m.ended_at IS NULL))::int AS requests,
           (SELECT json_build_object('id', m.id, 'tomb', b.name, 'creator', c.name) FROM matches m
            JOIN burials b ON b.id = m.burial_id JOIN users c ON c.id = m.creator_id
            WHERE m.reviver_id = ${user.id} AND NOT m.seen_by_reviver AND m.ended_at IS NULL
            ORDER BY m.created_at LIMIT 1) AS unseen_match`;
  const { email, name, skills, bio } = user;
  return json({ user: { email, name, skills, bio }, ...rows[0] });
}

/* ---------- comptes ---------- */

async function signup(sql: Sql, body: Record<string, unknown>, ipHash: string) {
  const name = clean(body.name, 40);
  const email = clean(body.email, 200).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (name.length < 2) return json({ error: "Indique ton prénom ou ton pseudo.", field: "name" }, 400);
  if (!EMAIL.test(email)) return json({ error: "Cet e-mail n'a pas l'air valide.", field: "email" }, 400);
  if (password.length < MIN_PASSWORD) return json({ error: `Le mot de passe doit faire au moins ${MIN_PASSWORD} caractères.`, field: "password" }, 400);
  if (password.length > 200) return json({ error: "Mot de passe trop long (200 caractères au plus).", field: "password" }, 400);

  const key = `signup:${ipHash}`;
  if (await tooManyFailures(sql, [key])) return json({ error: "Trop de comptes créés depuis cette connexion. Réessaie dans 15 minutes." }, 429);

  const rows = await sql`
    INSERT INTO users (email, password_hash, name) VALUES (${email}, ${await hashPassword(password)}, ${name})
    ON CONFLICT (email) DO NOTHING RETURNING id`;
  if (!rows[0]) return json({ error: "Cet e-mail a déjà un compte. Connecte-toi.", field: "email" }, 409);
  await recordFailure(sql, [key]);
  return json({ ok: true }, 201, { "set-cookie": await openSession(sql, rows[0].id) });
}

async function login(sql: Sql, body: Record<string, unknown>, ipHash: string) {
  const email = clean(body.email, 200).toLowerCase();
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  const keys = [`login:${email}`, `ip:${ipHash}`];
  if (await tooManyFailures(sql, keys)) return json({ error: "Trop d'essais. Réessaie dans 15 minutes." }, 429);

  const rows = await sql`SELECT id, password_hash FROM users WHERE email = ${email}`;
  const valid = await verifyPassword(password, rows[0]?.password_hash ?? DUMMY_HASH);
  if (!rows[0] || !valid) {
    await recordFailure(sql, keys);
    return json({ error: "E-mail ou mot de passe incorrect." }, 401);
  }
  return json({ ok: true }, 200, { "set-cookie": await openSession(sql, rows[0].id) });
}

/* ---------- gestes et décisions ---------- */

async function bury(sql: Sql, user: User, body: Record<string, unknown>, ipHash: string) {
  const recent = await sql`SELECT count(*)::int AS n FROM burials WHERE ip_hash = ${ipHash} AND created_at > now() - interval '1 hour'`;
  if (recent[0].n >= 6) return json({ error: "Trop de demandes, réessaie dans une heure." }, 429);

  const name = clean(body.name, 60);
  const epitaph = clean(body.epitaph, 120);
  const cause = clean(body.cause, 20);
  const will = clean(body.will, 20);
  const ys = Number.parseInt(String(body.yearStart ?? ""), 10);
  const ye = Number.parseInt(String(body.yearEnd ?? ""), 10);
  if (name.length < 2) return json({ error: "Donne un nom à ton projet.", field: "name" }, 400);
  if (epitaph.length < 5) return json({ error: "L'épitaphe doit faire au moins 5 caractères.", field: "epitaph" }, 400);
  if (!(CAUSES as readonly string[]).includes(cause)) return json({ error: "Choisis une cause du décès.", field: "cause" }, 400);
  if (!(WILLS as readonly string[]).includes(will)) return json({ error: "Choisis un testament.", field: "will" }, 400);
  const yearStart = Number.isInteger(ys) && ys >= 1990 && ys <= 2100 ? ys : null;
  const yearEnd = Number.isInteger(ye) && ye >= 1990 && ye <= 2100 ? ye : null;
  if (yearStart && yearEnd && yearEnd < yearStart) return json({ error: "L'année d'arrêt précède l'année de départ.", field: "yearEnd" }, 400);
  await sql`
    INSERT INTO burials (name, year_start, year_end, epitaph, cause, legacy, missing, will, consent, ip_hash, user_id)
    VALUES (${name}, ${yearStart}, ${yearEnd}, ${epitaph}, ${cause}, ${clean(body.legacy, 600)}, ${clean(body.missing, 300)},
            ${will}, ${body.consent === true}, ${ipHash}, ${user.id})`;
  return json({ ok: true }, 201);
}

async function swipe(sql: Sql, user: User, body: Record<string, unknown>) {
  const tombId = clean(body.tombId, 36);
  const action = clean(body.action, 10);
  if (!UUID.test(tombId) || !(ACTIONS as readonly string[]).includes(action)) return json({ error: "Requête invalide." }, 400);
  const note = action === "revive" ? clean(body.note, 300) : "";
  if (action === "revive" && note.length < MIN_NOTE) {
    return json({ error: `Écris au moins ${MIN_NOTE} caractères au créateur.`, field: "note" }, 400);
  }
  const skills = clean(body.skills, 200);
  const rows = await sql`
    INSERT INTO swipes (user_id, burial_id, action, note)
    SELECT ${user.id}::uuid, b.id, ${action}::text, ${note}::text FROM burials b
    WHERE b.id = ${tombId} AND b.consent AND b.user_id <> ${user.id}
      AND NOT EXISTS (SELECT 1 FROM matches m WHERE m.burial_id = b.id AND m.ended_at IS NULL)
    ON CONFLICT (user_id, burial_id) DO UPDATE SET action = EXCLUDED.action, note = EXCLUDED.note, created_at = now()
    WHERE swipes.decision IS NULL
    RETURNING burial_id`;
  if (!rows[0]) return notAvailable();
  if (action === "revive" && skills && !user.skills) await sql`UPDATE users SET skills = ${skills} WHERE id = ${user.id}`;
  return json({ ok: true }, 201);
}

async function undoSwipe(sql: Sql, user: User, body: Record<string, unknown>) {
  const tombId = clean(body.tombId, 36);
  if (!UUID.test(tombId)) return json({ error: "Requête invalide." }, 400);
  const rows = await sql`DELETE FROM swipes WHERE user_id = ${user.id} AND burial_id = ${tombId} AND decision IS NULL RETURNING burial_id`;
  return rows[0] ? json({ ok: true }) : json({ error: "Ce geste ne peut plus être annulé." }, 409);
}

/** Le créateur accepte (match) ou décline une demande. Accepter tient en une seule requête atomique. */
async function decide(sql: Sql, user: User, body: Record<string, unknown>) {
  const tombId = clean(body.tombId, 36);
  const reviverId = clean(body.userId, 36);
  const decision = clean(body.decision, 10);
  if (!UUID.test(tombId) || !UUID.test(reviverId) || !["accept", "decline"].includes(decision)) return json({ error: "Requête invalide." }, 400);

  if (decision === "decline") {
    const rows = await sql`
      UPDATE swipes s SET decision = 'declined', decided_at = now() FROM burials b
      WHERE b.id = s.burial_id AND b.user_id = ${user.id} AND s.burial_id = ${tombId} AND s.user_id = ${reviverId}
        AND s.action = 'revive' AND s.decision IS NULL
      RETURNING s.burial_id`;
    return rows[0] ? json({ ok: true }) : json({ error: "Cette demande n'est plus disponible." }, 409);
  }

  const rows = await sql`
    WITH request AS (
      SELECT s.burial_id, s.user_id FROM swipes s JOIN burials b ON b.id = s.burial_id
      WHERE b.user_id = ${user.id} AND s.burial_id = ${tombId} AND s.user_id = ${reviverId}
        AND s.action = 'revive' AND s.decision IS NULL
    ), created AS (
      INSERT INTO matches (burial_id, creator_id, reviver_id)
      SELECT burial_id, ${user.id}::uuid, user_id FROM request
      ON CONFLICT (burial_id) WHERE ended_at IS NULL DO NOTHING
      RETURNING id
    ), accepted AS (
      UPDATE swipes SET decision = 'accepted', decided_at = now()
      WHERE burial_id = ${tombId} AND user_id = ${reviverId} AND EXISTS (SELECT 1 FROM created)
    )
    SELECT c.id, b.name AS tomb, u.name AS reviver FROM created c, burials b, users u
    WHERE b.id = ${tombId} AND u.id = ${reviverId}`;
  return rows[0] ? json({ match: rows[0] }, 201) : json({ error: "Cette demande n'est plus disponible." }, 409);
}

async function saveProfile(sql: Sql, user: User, body: Record<string, unknown>) {
  const name = clean(body.name, 40);
  if (name.length < 2) return json({ error: "Indique ton prénom ou ton pseudo.", field: "name" }, 400);
  await sql`UPDATE users SET name = ${name}, skills = ${clean(body.skills, 200)}, bio = ${clean(body.bio, 300)} WHERE id = ${user.id}`;
  return json({ ok: true });
}

async function route(req: Request, env: Env): Promise<Response> {
  const path = new URL(req.url).pathname;
  const sql = neon(env.DATABASE_URL);

  if (req.method === "GET") {
    if (path === "/api/graveyard") return graveyard(sql);
    const user = await currentUser(req, sql);
    if (path === "/api/deck") return deck(sql, user);
    if (path === "/api/me") return user ? session(sql, user) : json({ user: null });
    if (!user) return json({ error: "Connecte-toi d'abord." }, 401);
    if (path === "/api/my-tombs") return myTombs(sql, user);
    if (path === "/api/reprises") return reprises(sql, user);
    return json({ error: "not_found" }, 404);
  }

  if (req.method !== "POST") return json({ error: "not_found" }, 404);
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);

  const body = await readBody(req);
  if (!body) return json({ error: "Requête invalide." }, 400);
  if (clean(body.website, 50)) return json({ ok: true }); // piège à robots : on fait semblant

  const ipHash = await hashIp(req.headers.get("cf-connecting-ip") ?? "local");
  if (path === "/api/signup") return signup(sql, body, ipHash);
  if (path === "/api/login") return login(sql, body, ipHash);
  if (path === "/api/logout") return json({ ok: true }, 200, { "set-cookie": await closeSession(req, sql) });

  const user = await currentUser(req, sql);
  if (!user) return json({ error: "Connecte-toi d'abord." }, 401);

  if (path === "/api/burials") return bury(sql, user, body, ipHash);
  if (path === "/api/swipes") return swipe(sql, user, body);
  if (path === "/api/swipes/undo") return undoSwipe(sql, user, body);
  if (path === "/api/swipes/reset") {
    await sql`DELETE FROM swipes WHERE user_id = ${user.id} AND action = 'rest'`;
    return json({ ok: true });
  }
  if (path === "/api/requests/decide") return decide(sql, user, body);
  if (path === "/api/profile") return saveProfile(sql, user, body);
  if (path === "/api/tombs/visibility") {
    const tombId = clean(body.tombId, 36);
    if (!UUID.test(tombId)) return json({ error: "Requête invalide." }, 400);
    const rows = await sql`UPDATE burials SET consent = ${body.visible === true} WHERE id = ${tombId} AND user_id = ${user.id} RETURNING id`;
    return rows[0] ? json({ ok: true }) : notAvailable();
  }
  if (path === "/api/matches/seen") {
    const matchId = clean(body.matchId, 36);
    if (!UUID.test(matchId)) return json({ error: "Requête invalide." }, 400);
    await sql`UPDATE matches SET seen_by_reviver = true WHERE id = ${matchId} AND reviver_id = ${user.id}`;
    return json({ ok: true });
  }

  return json({ error: "not_found" }, 404);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    try {
      return await route(req, env);
    } catch (e) {
      console.error(e);
      return json({ error: "Le cimetière est momentanément inaccessible. Réessaie dans un instant." }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
