// api/session.js
import { applyCors } from "./_cors.js";
import { getSql, ensureSchema, ensureSession } from "./_db.js";

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
    const sql = getSql();
    await ensureSchema(sql);

    const body = req.body || {};
    const sessionId = norm(body.sessionId) || crypto.randomUUID();

    await ensureSession(
      sql,
      req,
      sessionId,
      norm(body.timezone),
      norm(body.userAgent) || norm(req.headers["user-agent"])
    );

    return res.status(200).json({ ok: true, sessionId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
