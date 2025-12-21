// api/_db.js
import { neon } from "@neondatabase/serverless";

let sqlSingleton = null;

export function getSql() {
  if (sqlSingleton) return sqlSingleton;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing env var DATABASE_URL");

  sqlSingleton = neon(url);
  return sqlSingleton;
}
