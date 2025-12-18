import crypto from "crypto";
import { cors, withCors } from "./_cors.js";
import { db } from "./_db.js";

function sha256(x) {
  return crypto.createHash("sha256").update(x).digest("hex");
}

export default async function handler(req) {
  const pre = cors(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return withCors(new Response("Method not allowed", { status: 405 }));
  }

  const body = await req.json().catch(() => ({}));
  const { sessionId, timezone, userAgent } = body;

  if (!sessionId) return withCors(new Response("Missing sessionId", { status: 400 }));

  // privacy: only store hashed IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const ipHash = ip ? sha256(ip) : null;

  const sql = db();
  await sql`
    insert into sessions (id, timezone, user_agent, ip_hash)
    values (${sessionId}, ${timezone || null}, ${userAgent || null}, ${ipHash})
    on conflict (id) do nothing
  `;

  return withCors(Response.json({ ok: true }));
}
