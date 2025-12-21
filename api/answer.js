// api/answer.js
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
    const questionId = norm(body.questionId);
    const choice = norm(body.choice);

    if (!sessionId || !questionId || !choice) {
      return res.status(400).json({ error: "Missing required fields (sessionId, questionId, choice)." });
    }

    const sql = getSql();

    // Ensure session exists (in case /api/session wasn't called for some reason)
    await sql`
      insert into sessions (id)
      values (${sessionId})
      on conflict (id) do nothing
    `;

    await sql`
      insert into answers (session_id, question_id, choice)
      values (${sessionId}, ${questionId}, ${choice})
    `;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
