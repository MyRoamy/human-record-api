// api/results.js
import { applyCors } from "./_cors.js";
import { getSql, ensureSchema } from "./_db.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const sql = getSql();
    await ensureSchema(sql);

    const questionId = (req.query?.questionId || "").toString().trim();
    if (!questionId) return res.status(400).json({ error: "Missing questionId" });

    const rows = await sql`
      select choice, count(*)::int as votes
      from answers
      where question_id = ${questionId}::uuid
      group by choice
      order by votes desc, choice asc
    `;

    return res.status(200).json({ ok: true, rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
