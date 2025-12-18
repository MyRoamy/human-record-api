import crypto from "crypto";
import { applyCors } from "./_cors.js";
import { getSql } from "./_db.js";

function sha256(x) {
  return crypto.createHash("sha256").update(x).digest("hex");
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { sessionId, timezone, userAgent } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const ipHash = ip ? sha256(ip) : null;

    const sql = getSql();
    await sql`
      insert into sessions (id, timezone, user_agent, ip_hash)
      values (${sessionId}, ${timezone || null}, ${userAgent || null}, ${ipHash})
      on conflict (id) do nothing
    `;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
