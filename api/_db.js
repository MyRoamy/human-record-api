import { neon } from "@neondatabase/serverless";

export function db() {
  // Neon integration sets DATABASE_URL (or you can set it in Vercel env vars)
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL env var");
  return neon(url);
}
