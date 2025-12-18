import { cors, withCors } from "./_cors.js";
import { db } from "./_db.js";

export default async function handler(req) {
  const pre = cors(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return withCors(new Response("Method not allowed", { status: 405 }));
  }

  const body = await req.json().catch(() => ({}));
  const { sessionId, questionId, choice } = body;

  if (!sessionId || !questionId || !choice) {
    return withCors(new Response("Missing fields", { status: 400 }));
  }

  const sql = db();

  // dedupe per session/question
  const existing = await sql`
    select 1
    from answers
    where session_id = ${sessionId} and question_id = ${questionId}
    limit 1
  `;
  if (existing.length) return withCors(Response.json({ ok: true, deduped: true }));

  await sql`
    insert into answers (session_id, question_id, choice)
    values (${sessionId}, ${questionId}, ${choice})
  `;

  return withCors(Response.json({ ok: true }));
}
