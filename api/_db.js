// api/_db.js
import postgres from "postgres";

let _sql;

/**
 * Grabs caller IP from common proxy headers. (Best-effort)
 */
function getIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  const xr = req.headers["x-real-ip"];
  if (typeof xr === "string" && xr.length) return xr.trim();
  return null;
}

/**
 * Simple stable hash without extra dependencies.
 * (Not cryptographically perfect, but good enough for IP bucketing/logging)
 */
function hashString(s) {
  if (!s) return null;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return "fnv1a_" + (h >>> 0).toString(16);
}

export function getSql() {
  if (_sql) return _sql;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing env DATABASE_URL");

  // Neon + serverless friendly settings
  _sql = postgres(url, {
    ssl: "require",
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15
  });

  return _sql;
}

/**
 * Creates tables/columns if missing (idempotent).
 * Call this at the top of each route.
 */
export async function ensureSchema(sql) {
  // Core tables (no extensions needed)
  await sql`
    create table if not exists sessions (
      id uuid primary key,
      created_at timestamptz not null default now(),
      timezone text,
      user_agent text,
      ip_hash text
    );
  `;

  await sql`
    create table if not exists questions (
      id uuid primary key,
      prompt text not null,
      options jsonb not null,
      is_active boolean not null default true,
      category text not null default 'general',
      sort_order int not null default 0,
      created_at timestamptz not null default now()
    );
  `;

  // Unique prompt constraint (safe)
  await sql`
    do $$
    begin
      if not exists (
        select 1 from pg_constraint where conname = 'questions_prompt_unique'
      ) then
        alter table questions add constraint questions_prompt_unique unique (prompt);
      end if;
    end $$;
  `;

  await sql`
    create index if not exists questions_category_sort_idx
    on questions(category, sort_order);
  `;

  await sql`
    create table if not exists answers (
      id uuid primary key,
      session_id uuid not null references sessions(id) on delete cascade,
      question_id uuid not null references questions(id) on delete cascade,
      choice text not null,
      created_at timestamptz not null default now()
    );
  `;

  await sql`create index if not exists answers_question_idx on answers(question_id);`;
  await sql`create index if not exists answers_session_idx on answers(session_id);`;
  await sql`create index if not exists answers_created_idx on answers(created_at);`;

  await sql`
    create table if not exists leads (
      id uuid primary key,
      session_id uuid references sessions(id) on delete set null,

      created_at timestamptz not null default now(),
      status text not null default 'new',
      source text not null default 'webflow',

      service_type text not null,
      urgency text not null,
      issue_summary text,
      budget_range text,

      address1 text,
      address2 text,
      city text,
      state text,
      zip text,

      full_name text,
      phone text,
      email text,
      preferred_contact text,
      consent boolean not null default false

      -- diagnostic gets added below via ALTER (to be safe)
    );
  `;

  await sql`create index if not exists leads_created_idx on leads(created_at desc);`;
  await sql`create index if not exists leads_status_idx on leads(status);`;
  await sql`create index if not exists leads_zip_idx on leads(zip);`;
  await sql`create index if not exists leads_state_idx on leads(state);`;

  // Add diagnostic jsonb if missing (your lead.js inserts it)
  await sql`
    alter table leads
    add column if not exists diagnostic jsonb;
  `;
}

/**
 * Ensures a session exists (idempotent insert).
 */
export async function ensureSession(sql, req, sessionId, timezone, userAgent) {
  const ip = getIp(req);
  const ipHash = hashString(ip);

  await sql`
    insert into sessions (id, timezone, user_agent, ip_hash)
    values (${sessionId}::uuid, ${timezone || null}, ${userAgent || null}, ${ipHash})
    on conflict (id) do update
    set timezone = excluded.timezone,
        user_agent = excluded.user_agent
  `;
}

/**
 * Seeds HVAC questions if questions table is empty (or no hvac category exists).
 */
export async function ensureHVACSeed(sql) {
  const r = await sql`
    select count(*)::int as n
    from questions
    where category = 'hvac' and is_active = true;
  `;
  const n = r?.[0]?.n ?? 0;
  if (n > 0) return;

  const hvac = [
    {
      sort_order: 10,
      prompt: "What’s the main reason you’re here today?",
      options: ["AC not cooling","Heat not working","High energy bills","Bad airflow","Strange noise/smell","Routine maintenance","New system / quote","Other"]
    },
    {
      sort_order: 20,
      prompt: "How urgent is it?",
      options: ["Emergency (today)","Within 24 hours","This week","This month","Just planning"]
    },
    {
      sort_order: 30,
      prompt: "Approximate age of your HVAC system?",
      options: ["0-5 years","6-10 years","11-15 years","15+ years","Not sure"]
    },
    {
      sort_order: 40,
      prompt: "What best describes your home?",
      options: ["Single-family","Townhome","Condo","Apartment","Other"]
    },
    {
      sort_order: 50,
      prompt: "Have you experienced any of these recently?",
      options: ["System stopped completely","Short cycling","Uneven temperatures","Weak airflow","Water leak","None of these"]
    },
    {
      sort_order: 60,
      prompt: "What matters most in a contractor?",
      options: ["Fast response","Best price","Top-rated/trust","Warranty","Financing options","Communication"]
    },
    {
      sort_order: 70,
      prompt: "What budget range are you planning for?",
      options: ["Under $250","$250-$750","$750-$2,000","$2,000-$6,000","$6,000+","Not sure"]
    }
  ];

  for (const q of hvac) {
    await sql`
      insert into questions (id, category, sort_order, prompt, options, is_active)
      values (
        ${crypto.randomUUID()}::uuid,
        'hvac',
        ${q.sort_order},
        ${q.prompt},
        ${JSON.stringify(q.options)}::jsonb,
        true
      )
      on conflict (prompt) do update
      set category = excluded.category,
          sort_order = excluded.sort_order,
          options = excluded.options,
          is_active = excluded.is_active
    `;
  }
}
