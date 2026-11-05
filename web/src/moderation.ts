import type { Sql, User } from "./auth";
import { clean, invalid, json, UUID } from "./http";

const REASONS: Record<string, string[]> = {
  tomb: ["offensive", "fake", "stolen", "other"],
  person: ["harassment", "scam", "other"],
};
// Au 3e signalement ouvert, une tombe se retire seule en attendant la modération.
const AUTO_HIDE_AT = 3;

export async function report(sql: Sql, user: User, body: Record<string, unknown>) {
  const kind = clean(body.kind, 10);
  const reason = clean(body.reason, 20);
  const details = clean(body.details, 500);
  if (!REASONS[kind]?.includes(reason)) return json({ error: "Choisis un motif." }, 400);

  if (kind === "person") {
    const matchId = clean(body.matchId, 36);
    if (!UUID.test(matchId)) return invalid();
    await sql`
      INSERT INTO reports (reporter_id, kind, burial_id, match_id, reason, details)
      SELECT ${user.id}::uuid, 'person', m.burial_id, m.id, ${reason}::text, ${details}::text FROM matches m
      WHERE m.id = ${matchId} AND (m.creator_id = ${user.id} OR m.reviver_id = ${user.id})
      ON CONFLICT DO NOTHING`;
    return json({ ok: true }, 201);
  }

  const tombId = clean(body.tombId, 36);
  if (!UUID.test(tombId)) return invalid();
  await sql`
    INSERT INTO reports (reporter_id, kind, burial_id, reason, details)
    SELECT ${user.id}::uuid, 'tomb', b.id, ${reason}::text, ${details}::text FROM burials b
    WHERE b.id = ${tombId} AND b.consent AND b.hidden_at IS NULL AND b.user_id <> ${user.id}
    ON CONFLICT DO NOTHING`;
  await sql`
    UPDATE burials SET hidden_at = now() WHERE id = ${tombId} AND hidden_at IS NULL
      AND (SELECT count(*) FROM reports r WHERE r.burial_id = ${tombId} AND r.kind = 'tomb' AND r.resolved_at IS NULL) >= ${AUTO_HIDE_AT}`;
  // La tombe signalée ne se représente plus à la personne qui l'a signalée.
  await sql`
    INSERT INTO swipes (user_id, burial_id, action)
    SELECT ${user.id}::uuid, b.id, 'rest' FROM burials b WHERE b.id = ${tombId} AND b.user_id <> ${user.id}
    ON CONFLICT DO NOTHING`;
  return json({ ok: true }, 201);
}

export async function openReports(sql: Sql) {
  const reports = await sql`
    SELECT r.id, r.kind, r.reason, r.details, r.created_at, r.match_id,
           b.name AS tomb, b.epitaph, b.legacy, b.hidden_at IS NOT NULL AS hidden,
           u.name AS reporter, c.name AS creator, t.name AS target
    FROM reports r
    JOIN burials b ON b.id = r.burial_id
    JOIN users u ON u.id = r.reporter_id
    JOIN users c ON c.id = b.user_id
    LEFT JOIN matches m ON m.id = r.match_id
    LEFT JOIN users t ON t.id = CASE WHEN m.creator_id = r.reporter_id THEN m.reviver_id ELSE m.creator_id END
    WHERE r.resolved_at IS NULL ORDER BY r.created_at LIMIT 50`;
  const matchIds = reports.flatMap((r) => (r.match_id ? [r.match_id as string] : []));
  const messages = matchIds.length
    ? await sql`
        SELECT x.match_id, x.body, x.created_at, s.name AS sender FROM messages x JOIN users s ON s.id = x.sender_id
        WHERE x.match_id = ANY(${matchIds}::uuid[]) ORDER BY x.id DESC LIMIT 300`
    : [];
  return json({
    reports: reports.map((r) => ({
      ...r,
      messages: messages.filter((x) => x.match_id === r.match_id).slice(0, 30).reverse(),
    })),
  });
}

/** Retirer la tombe, bloquer le compte visé, ou classer sans suite (ce qui remet une tombe retirée toute seule). */
export async function resolve(sql: Sql, body: Record<string, unknown>) {
  const reportId = clean(body.reportId, 36);
  const action = clean(body.action, 10);
  if (!UUID.test(reportId) || !["remove", "ban", "dismiss"].includes(action)) return invalid();
  const rows = await sql`
    SELECT r.kind, r.burial_id, r.reporter_id, b.user_id AS creator_id, m.creator_id AS match_creator, m.reviver_id AS match_reviver
    FROM reports r JOIN burials b ON b.id = r.burial_id LEFT JOIN matches m ON m.id = r.match_id
    WHERE r.id = ${reportId} AND r.resolved_at IS NULL`;
  const r = rows[0];
  if (!r) return json({ error: "Ce signalement est déjà traité." }, 409);

  if (action === "remove") {
    if (r.kind !== "tomb") return invalid();
    await sql.transaction([
      sql`UPDATE burials SET hidden_at = coalesce(hidden_at, now()) WHERE id = ${r.burial_id}`,
      sql`UPDATE reports SET resolved_at = now(), resolution = 'removed' WHERE burial_id = ${r.burial_id} AND kind = 'tomb' AND resolved_at IS NULL`,
    ]);
    return json({ ok: true });
  }

  if (action === "dismiss") {
    if (r.kind === "person") {
      await sql`UPDATE reports SET resolved_at = now(), resolution = 'dismissed' WHERE id = ${reportId}`;
      return json({ ok: true });
    }
    await sql.transaction([
      sql`UPDATE burials SET hidden_at = NULL WHERE id = ${r.burial_id}`,
      sql`UPDATE reports SET resolved_at = now(), resolution = 'dismissed' WHERE burial_id = ${r.burial_id} AND kind = 'tomb' AND resolved_at IS NULL`,
    ]);
    return json({ ok: true });
  }

  const target = r.kind === "tomb" ? r.creator_id : r.match_creator === r.reporter_id ? r.match_reviver : r.match_creator;
  const banned = await sql`UPDATE users SET banned_at = now() WHERE id = ${target} AND NOT is_admin AND banned_at IS NULL RETURNING id`;
  if (!banned[0]) return json({ error: "Ce compte ne peut pas être bloqué." }, 409);
  await sql.transaction([
    sql`DELETE FROM sessions WHERE user_id = ${target}`,
    sql`UPDATE burials SET hidden_at = coalesce(hidden_at, now()) WHERE user_id = ${target}`,
    sql`UPDATE matches SET ended_at = now(), end_reason = 'banned'
        WHERE (creator_id = ${target} OR reviver_id = ${target}) AND ended_at IS NULL AND revived_at IS NULL`,
    sql`UPDATE reports SET resolved_at = now(), resolution = 'banned'
        WHERE resolved_at IS NULL AND (id = ${reportId} OR (kind = 'tomb' AND burial_id IN (SELECT id FROM burials WHERE user_id = ${target})))`,
  ]);
  return json({ ok: true });
}
