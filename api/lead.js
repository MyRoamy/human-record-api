// api/lead.js
import { applyCors } from "./_cors.js";
import { getSql } from "./_db.js";

function norm(s) {
  if (s === undefined || s === null) return null;
  const t = String(s).trim();
  return t.length ? t : null;
}

function digitsOnly(v) {
  return (v || "").toString().replace(/\D/g, "");
}

function safeJson(v) {
  if (v === undefined || v === null) return null;
  // Allow object/array directly
  if (typeof v === "object") return v;
  // Allow JSON string
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      return { raw: t };
    }
  }
  // Fallback
  return { raw: String(v) };
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const sql = getSql();

    const sessionId = norm(body.sessionId);
    const serviceType = norm(body.service_type);
    const urgency = norm(body.urgency);
    const zip = norm(body.zip);

    const consent = body.consent === true;

    // Minimum required for a lead
    if (!sessionId || !serviceType || !urgency || !zip) {
      return res.status(400).json({
        error: "Missing required fields (sessionId, service_type, urgency, zip)."
      });
    }

    // Contact fields
    const fullName = norm(body.full_name);
    const email = norm(body.email);

    // Store digits-only (recommended). If you pass formatted, we strip it here.
    const phoneDigits = digitsOnly(body.phone);
    const phone = phoneDigits ? phoneDigits : null;

    const hasContact = !!(fullName || phone || email);
    if (hasContact && !consent) {
      return res.status(400).json({ error: "Consent must be true to store contact details." });
    }

    // Diagnostic JSON payload (answers / summary of questionnaire)
    const diagnostic = safeJson(body.diagnostic);

    const lead = await sql`
      insert into leads (
        session_id, source, service_type, urgency, issue_summary, budget_range,
        address1, address2, city, state, zip,
        full_name, phone, email, preferred_contact, consent,
        diagnostic
      )
      values (
        ${sessionId},
        ${norm(body.source) || "webflow"},
        ${serviceType},
        ${urgency},
        ${norm(body.issue_summary)},
        ${norm(body.budget_range)},
        ${norm(body.address1)},
        ${norm(body.address2)},
        ${norm(body.city)},
        ${norm(body.state)},
        ${zip},
        ${fullName},
        ${phone},
        ${email},
        ${norm(body.preferred_contact) || "call"},
        ${consent},
        ${diagnostic}
      )
      returning id, created_at, status
    `;

    return res.status(200).json({ ok: true, lead: lead[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
