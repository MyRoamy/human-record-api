import { neon } from "@neondatabase/serverless";

/**
 * Returns a Neon SQL tagged template function.
 * Prefers HVAC_DATABASE_URL, then falls back to standard Vercel/Neon env vars.
 */
export function getSql() {
  const url =
    process.env.HVAC_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_UNPOOLED;

  if (!url) {
    throw new Error(
      "Missing database env var. Set HVAC_DATABASE_URL (recommended) or ensure DATABASE_URL / DATABASE_URL_UNPOOLED exists."
    );
  }

  // Neon serverless driver
  const sql = neon(url);

  return sql;
}
