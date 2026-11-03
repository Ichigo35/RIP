import { neon } from "@neondatabase/serverless";

interface Env {
  DATABASE_URL: string;
}

const CAUSES = ["no_time", "no_money", "partner_left", "missing_skill", "no_market", "motivation", "competitor", "technical", "life_change"] as const;
const WILLS = ["cofound", "handover", "sell", "release"] as const;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

async function hashIp(ip: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`rip:${ip}`));
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return !origin || new URL(origin).host === new URL(req.url).host;
}

async function readBody(req: Request) {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return null;
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const sql = neon(env.DATABASE_URL);

    if (req.method === "GET" && url.pathname === "/api/graveyard") {
      const [rows, counts] = await Promise.all([
        sql`SELECT name, year_start, year_end, epitaph, cause, will, legacy, missing
            FROM burials WHERE consent ORDER BY created_at DESC LIMIT 12`,
        sql`SELECT (SELECT count(*) FROM burials)::int AS burials, (SELECT count(*) FROM resurrectors)::int AS resurrectors`,
      ]);
      return json({ tombs: rows, ...counts[0] });
    }

    if (req.method !== "POST") return json({ error: "not_found" }, 404);
    if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);

    const body = await readBody(req);
    if (!body) return json({ error: "Requête invalide." }, 400);
    if (clean(body.website, 50)) return json({ ok: true }); // piège à robots : on fait semblant

    const ipHash = await hashIp(req.headers.get("cf-connecting-ip") ?? "local");
    const recent = await sql`
      SELECT (SELECT count(*) FROM burials WHERE ip_hash = ${ipHash} AND created_at > now() - interval '1 hour')
           + (SELECT count(*) FROM resurrectors WHERE ip_hash = ${ipHash} AND created_at > now() - interval '1 hour') AS n`;
    if (Number(recent[0].n) >= 6) return json({ error: "Trop de demandes, réessaie dans une heure." }, 429);

    const email = clean(body.email, 200).toLowerCase();
    if (!EMAIL.test(email)) return json({ error: "Cet e-mail n'a pas l'air valide.", field: "email" }, 400);

    if (url.pathname === "/api/burials") {
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
        INSERT INTO burials (name, year_start, year_end, epitaph, cause, legacy, missing, will, email, consent, ip_hash)
        VALUES (${name}, ${yearStart}, ${yearEnd}, ${epitaph}, ${cause}, ${clean(body.legacy, 600)}, ${clean(body.missing, 300)},
                ${will}, ${email}, ${body.consent === true}, ${ipHash})`;
      return json({ ok: true }, 201);
    }

    if (url.pathname === "/api/resurrectors") {
      await sql`
        INSERT INTO resurrectors (email, skills, ip_hash) VALUES (${email}, ${clean(body.skills, 200)}, ${ipHash})
        ON CONFLICT (email) DO UPDATE SET skills = EXCLUDED.skills`;
      return json({ ok: true }, 201);
    }

    return json({ error: "not_found" }, 404);
  },
} satisfies ExportedHandler<Env>;
