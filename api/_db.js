import { neon } from "@neondatabase/serverless";

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

  return neon(url);
}
