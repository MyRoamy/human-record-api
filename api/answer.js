// api/answer.js
import { applyCors } from "./_cors.js";
import { getSql, ensureSchema, ensureSession } from "./_db.js";

function norm(v) {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const sql = getSql();
    await ensureSchema(sql);

    const body = req.body || {};
    const sessionId = norm(body.sessionId);
    const questionId = norm(body.questionId);
    const choice = norm(body.choice);

    if (!sessionId || !questionId || !choice) {
      return res.status(400).json({ error: "Missing required fields (sessionId, questionId, choice)." });
    }

    // Ensure session exists (so FK doesn't fail)
    await ensureSession(
      sql,
      req,
      sessionId,
      null,
      norm(req.headers["user-agent"])
    );

    // Ensure question exists + active
    const q = await sql`
      select id
      from questions
      where id = ${questionId}::uuid
        and is_active = true
      limit 1
    `;
    if (!q.length) {
      return res.status(400).json({ error: "Invalid questionId (not found or inactive)." });
    }

    const id = crypto.randomUUID();

    await sql`
      insert into answers (id, session_id, question_id, choice)
      values (${id}::uuid, ${sessionId}::uuid, ${questionId}::uuid, ${choice})
    `;

    return res.status(200).json({ ok: true, id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
