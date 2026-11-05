import type { Sql, User } from "./auth";
import { clean, invalid, json, UUID } from "./http";

const MAX_MESSAGE = 1000;
const MAX_PER_MINUTE = 20;

/* Un message garde ses retours à la ligne, contrairement aux champs d'une ligne. */
const messageText = (v: unknown) =>
  typeof v === "string" ? v.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_MESSAGE) : "";

/** L'état de la veillée et les messages arrivés après `after`. Seuls ses deux membres y accèdent. */
export async function vigil(sql: Sql, user: User, url: URL) {
  const id = url.searchParams.get("id") ?? "";
  const after = Number.parseInt(url.searchParams.get("after") ?? "0", 10) || 0;
  if (!UUID.test(id)) return json({ error: "Cette veillée n'existe pas." }, 404);
  const [rows, messages] = await Promise.all([
    sql`SELECT m.id, m.ended_at, m.end_reason, m.revived_at, m.ended_by = ${user.id} AS ended_by_me,
               m.creator_id = ${user.id} AS is_creator,
               greatest(ceil(extract(epoch FROM m.ends_at - now()) / 86400), 0)::int AS days_left,
               m.ended_at IS NULL AND (m.revived_at IS NOT NULL OR m.ends_at > now()) AS open,
               (CASE WHEN m.creator_id = ${user.id} THEN m.creator_sealed_at ELSE m.reviver_sealed_at END) IS NOT NULL AS sealed_by_me,
               (CASE WHEN m.creator_id = ${user.id} THEN m.reviver_sealed_at ELSE m.creator_sealed_at END) IS NOT NULL AS sealed_by_other,
               b.name AS tomb, b.year_start, b.year_end, b.epitaph, s.note,
               o.name AS other_name, o.skills AS other_skills, o.bio AS other_bio
        FROM matches m
        JOIN burials b ON b.id = m.burial_id
        JOIN users o ON o.id = CASE WHEN m.creator_id = ${user.id} THEN m.reviver_id ELSE m.creator_id END
        LEFT JOIN swipes s ON s.burial_id = m.burial_id AND s.user_id = m.reviver_id
        WHERE m.id = ${id} AND (m.creator_id = ${user.id} OR m.reviver_id = ${user.id})`,
    sql`SELECT x.id, x.body, x.created_at, x.sender_id = ${user.id} AS mine
        FROM messages x JOIN matches m ON m.id = x.match_id
        WHERE x.match_id = ${id} AND x.id > ${after} AND (m.creator_id = ${user.id} OR m.reviver_id = ${user.id})
        ORDER BY x.id LIMIT 200`,
  ]);
  if (!rows[0]) return json({ error: "Cette veillée n'existe pas." }, 404);
  return json({ vigil: rows[0], messages });
}

export async function sendMessage(sql: Sql, user: User, body: Record<string, unknown>) {
  const matchId = clean(body.matchId, 36);
  const text = messageText(body.body);
  if (!UUID.test(matchId)) return invalid();
  if (!text) return json({ error: "Écris d'abord ton message." }, 400);
  const rows = await sql`
    INSERT INTO messages (match_id, sender_id, body)
    SELECT m.id, ${user.id}::uuid, ${text}::text FROM matches m
    WHERE m.id = ${matchId} AND (m.creator_id = ${user.id} OR m.reviver_id = ${user.id})
      AND m.ended_at IS NULL AND (m.revived_at IS NOT NULL OR m.ends_at > now())
      AND (SELECT count(*) FROM messages x WHERE x.sender_id = ${user.id} AND x.created_at > now() - interval '1 minute') < ${MAX_PER_MINUTE}
    RETURNING id, body, created_at`;
  if (rows[0]) return json({ message: { ...rows[0], mine: true } }, 201);
  const recent = await sql`SELECT count(*)::int AS n FROM messages WHERE sender_id = ${user.id} AND created_at > now() - interval '1 minute'`;
  if (recent[0].n >= MAX_PER_MINUTE) return json({ error: "Tu écris très vite. Attends une minute avant d'envoyer la suite." }, 429);
  return json({ error: "Cette veillée est terminée." }, 409);
}

export async function markRead(sql: Sql, user: User, body: Record<string, unknown>) {
  const matchId = clean(body.matchId, 36);
  if (!UUID.test(matchId)) return invalid();
  await sql`
    UPDATE matches SET
      creator_read_at = CASE WHEN creator_id = ${user.id} THEN now() ELSE creator_read_at END,
      reviver_read_at = CASE WHEN reviver_id = ${user.id} THEN now() ELSE reviver_read_at END
    WHERE id = ${matchId} AND (creator_id = ${user.id} OR reviver_id = ${user.id})`;
  return json({ ok: true });
}

/** L'un des deux met fin à la veillée : la tombe retourne au cimetière. */
export async function endVigil(sql: Sql, user: User, body: Record<string, unknown>) {
  const matchId = clean(body.matchId, 36);
  if (!UUID.test(matchId)) return invalid();
  const rows = await sql`
    UPDATE matches SET ended_at = now(), end_reason = 'left', ended_by = ${user.id}
    WHERE id = ${matchId} AND (creator_id = ${user.id} OR reviver_id = ${user.id})
      AND ended_at IS NULL AND revived_at IS NULL
    RETURNING id`;
  return rows[0] ? json({ ok: true }) : json({ error: "Cette veillée est déjà terminée." }, 409);
}

/** Chacun conclut de son côté ; au second accord, la tombe est ressuscitée et la file se referme. */
export async function seal(sql: Sql, user: User, body: Record<string, unknown>) {
  const matchId = clean(body.matchId, 36);
  if (!UUID.test(matchId)) return invalid();
  const rows = await sql`
    UPDATE matches SET
      creator_sealed_at = CASE WHEN creator_id = ${user.id} THEN coalesce(creator_sealed_at, now()) ELSE creator_sealed_at END,
      reviver_sealed_at = CASE WHEN reviver_id = ${user.id} THEN coalesce(reviver_sealed_at, now()) ELSE reviver_sealed_at END,
      revived_at = CASE WHEN (creator_id = ${user.id} OR creator_sealed_at IS NOT NULL)
                         AND (reviver_id = ${user.id} OR reviver_sealed_at IS NOT NULL) THEN now() END
    WHERE id = ${matchId} AND (creator_id = ${user.id} OR reviver_id = ${user.id})
      AND ended_at IS NULL AND revived_at IS NULL AND ends_at > now()
    RETURNING burial_id, revived_at`;
  if (!rows[0]) return json({ error: "Cette veillée est terminée." }, 409);
  if (rows[0].revived_at) {
    await sql`UPDATE swipes SET decision = 'declined', decided_at = now()
              WHERE burial_id = ${rows[0].burial_id} AND action = 'revive' AND decision IS NULL`;
  }
  return json({ revived: !!rows[0].revived_at });
}

/**
 * Sans accord au bout de 14 jours, la bougie s'éteint. Lancé à la lecture des listes plutôt que par une
 * tâche planifiée : le compte Cloudflare gratuit a atteint sa limite de 5 tâches planifiées.
 */
export const expireVigils = (sql: Sql) => sql`
  UPDATE matches SET ended_at = now(), end_reason = 'expired'
  WHERE ended_at IS NULL AND revived_at IS NULL AND ends_at < now()`;
