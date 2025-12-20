import { applyCors } from "./_cors.js";
import { getSql } from "./_db.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { sessionId, questionId, choice } = req.body || {};
    if (!sessionId || !questionId || !choice) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const sql = getSql();

    // Dedupe per session per question
    const existing = await sql`
      select 1
      from answers
      where session_id = ${sessionId} and question_id = ${questionId}
      limit 1
    `;
    if (existing.length) return res.status(200).json({ ok: true, deduped: true });

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
