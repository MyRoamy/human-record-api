// api/questions.js
import { applyCors } from "./_cors.js";
import { getSql } from "./_db.js";

function norm(v) {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

function coerceOptions(options) {
  // If DB returns JSONB properly, this may already be an array.
  if (Array.isArray(options)) return options;

  // Sometimes libraries return jsonb as object or string. Handle both.
  if (typeof options === "string") {
    const t = options.trim();
    if (!t) return [];
    try {
      const parsed = JSON.parse(t);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // If it's some other object type, try JSON stringify+parse safely
  if (typeof options === "object") {
    try {
      const parsed = JSON.parse(JSON.stringify(options));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sql = getSql();

    const category = norm(req.query?.category) || "hvac";

    const rows = await sql`
      select id, prompt, options, category, sort_order, is_active
      from questions
      where is_active = true
        and category = ${category}
      order by sort_order asc, created_at asc
    `;

    const questions = (rows || []).map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: coerceOptions(q.options),
      category: q.category,
      sort_order: q.sort_order
    }));

    return res.status(200).json({ ok: true, questions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
