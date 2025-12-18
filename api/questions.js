import { cors, withCors } from "./_cors.js";
import { db } from "./_db.js";

export default async function handler(req) {
  const pre = cors(req);
  if (pre) return pre;

  if (req.method !== "GET") {
    return withCors(new Response("Method not allowed", { status: 405 }));
  }

  const sql = db();
  const rows = await sql`
    select id, prompt, options
    from questions
    where is_active = true
    order by created_at asc
  `;

  return withCors(Response.json({ questions: rows }));
}
