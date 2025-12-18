import { cors, withCors } from "./_cors.js";
import { db } from "./_db.js";

export default async function handler(req) {
  const pre = cors(req);
  if (pre) return pre;

  if (req.method !== "GET") {
    return withCors(new Response("Method not allowed", { status: 405 }));
  }

  const url = new URL(req.url);
  const questionId = url.searchParams.get("questionId");
  if (!questionId) return withCors(new Response("Missing questionId", { status: 400 }));

  const sql = db();
  const rows = await sql`
    select choice, count(*)::int as votes
    from answers
    where question_id = ${questionId}
    group by choice
    order by votes desc
  `;

  return withCors(Response.json({ rows }));
}
