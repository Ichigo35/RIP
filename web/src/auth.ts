import type { NeonQueryFunction } from "@neondatabase/serverless";

export type Sql = NeonQueryFunction<false, false>;
export type User = { id: string; email: string; name: string; skills: string; bio: string };

// 100 000 itérations : le maximum accepté par les Workers pour PBKDF2.
const ITERATIONS = 100_000;
const COOKIE = "rip_session";
const SESSION_DAYS = 30;
const MAX_FAILURES = 10;

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(await derive(password, salt, ITERATIONS))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iterations, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterations || !salt || !hash) return false;
  const a = await derive(password, unb64(salt), Number(iterations));
  const b = unb64(hash);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Même temps de calcul quand l'e-mail n'existe pas : la réponse ne révèle pas s'il a un compte.
export const DUMMY_HASH = `pbkdf2$${ITERATIONS}$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`;

async function sha256(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sessionToken(req: Request) {
  const cookies = req.headers.get("cookie") ?? "";
  return cookies.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? null;
}

const cookie = (value: string, maxAge: number) =>
  `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;

export async function currentUser(req: Request, sql: Sql): Promise<User | null> {
  const token = sessionToken(req);
  if (!token) return null;
  const rows = await sql`
    SELECT u.id, u.email, u.name, u.skills, u.bio FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${await sha256(token)} AND s.expires_at > now()`;
  return (rows[0] as User) ?? null;
}

/** Ouvre une session et renvoie l'en-tête Set-Cookie. */
export async function openSession(sql: Sql, userId: string) {
  const token = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" })[c] as string);
  await sql`
    WITH purge AS (DELETE FROM sessions WHERE expires_at < now())
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (${await sha256(token)}, ${userId}, now() + make_interval(days => ${SESSION_DAYS}))`;
  return cookie(token, SESSION_DAYS * 86400);
}

export async function closeSession(req: Request, sql: Sql) {
  const token = sessionToken(req);
  if (token) await sql`DELETE FROM sessions WHERE token_hash = ${await sha256(token)}`;
  return cookie("", 0);
}

export async function tooManyFailures(sql: Sql, keys: string[]) {
  const rows = await sql`
    SELECT key, count(*)::int AS n FROM auth_attempts
    WHERE key = ANY(${keys}) AND created_at > now() - interval '15 minutes' GROUP BY key`;
  return rows.some((r) => r.n >= MAX_FAILURES);
}

export async function recordFailure(sql: Sql, keys: string[]) {
  await sql`
    WITH purge AS (DELETE FROM auth_attempts WHERE created_at < now() - interval '1 day')
    INSERT INTO auth_attempts (key) SELECT unnest(${keys}::text[])`;
}
