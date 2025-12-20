export function applyCors(req, res) {
  const raw = process.env.WEB_ORIGINS || process.env.WEB_ORIGIN || "*";
  const allowed = raw === "*" ? "*" : raw.split(",").map(s => s.trim()).filter(Boolean);

  const requestOrigin = req.headers.origin;

  let originToSet = "*";
  if (allowed !== "*" && requestOrigin) {
    if (allowed.includes(requestOrigin)) originToSet = requestOrigin;
    else originToSet = allowed[0] || "null";
  }

  res.setHeader("Access-Control-Allow-Origin", originToSet);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
