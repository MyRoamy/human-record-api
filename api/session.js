// api/session.js
import { applyCors } from "./_cors.js";
import { getSql } from "./_db.js";

function norm(v) {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const sessionId = norm(body.sessionId);
    if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

    const sql = getSql();

    await sql`
      insert into sessions (id, timezone, user_agent)
      values (${sessionId}, ${norm(body.timezone)}, ${norm(body.userAgent)})
      on conflict (id) do update
      set timezone = coalesce(excluded.timezone, sessions.timezone),
          user_agent = coalesce(excluded.user_agent, sessions.user_agent)
    `;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
