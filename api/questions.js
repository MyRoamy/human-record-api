import { applyCors } from "./_cors.js";
import { getSql } from "./_db.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const sql = getSql();
    const rows = await sql`
      select id, prompt, options
      from questions
      where is_active = true
      order by created_at asc
    `;
    return res.status(200).json({ questions: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
