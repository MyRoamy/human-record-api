// api/questions.js
import { applyCors } from "./_cors.js";
import { getSql, ensureSchema, ensureHVACSeed } from "./_db.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const sql = getSql();
    await ensureSchema(sql);
    await ensureHVACSeed(sql);

    const category = (req.query?.category || "general").toString();

    const questions = await sql`
      select id, prompt, options, category, sort_order, is_active
      from questions
      where is_active = true
        and category = ${category}
      order by sort_order asc, created_at asc
    `;

    return res.status(200).json({ ok: true, questions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
