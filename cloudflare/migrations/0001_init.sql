-- Schema do CMS no D1. Espelha as tabelas usadas pelo código em supabase/migrations.
-- cms_account e user_profiles são legado sem uso e ficam só no backup.

CREATE TABLE cms_collections (
  name TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE cms_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'basic'
    CHECK (access_level IN ('super_admin', 'admin', 'basic')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE guide_leads (
  id TEXT PRIMARY KEY,
  course_slug TEXT NOT NULL,
  course_title TEXT NOT NULL DEFAULT '',
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  consent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX guide_leads_course_slug_idx ON guide_leads (course_slug);
CREATE INDEX guide_leads_created_at_idx ON guide_leads (created_at);
