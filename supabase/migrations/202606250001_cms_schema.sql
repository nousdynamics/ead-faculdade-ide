-- CMS collections (JSON documents, one row per collection)
CREATE TABLE IF NOT EXISTS public.cms_collections (
  name text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cms_collections IS 'Coleções CMS (courses, professors, etc.)';

CREATE TABLE IF NOT EXISTS public.cms_account (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  username text NOT NULL,
  password_hash text,
  email text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guide_leads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_slug text NOT NULL,
  course_title text NOT NULL DEFAULT '',
  nome text NOT NULL,
  email text NOT NULL,
  telefone text NOT NULL,
  consent boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guide_leads_course_slug_idx ON public.guide_leads (course_slug);
CREATE INDEX IF NOT EXISTS guide_leads_created_at_idx ON public.guide_leads (created_at DESC);

CREATE TABLE IF NOT EXISTS public.app_meta (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_meta ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cms-media',
  'cms-media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'cms_media_public_read'
  ) THEN
    CREATE POLICY cms_media_public_read
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'cms-media');
  END IF;
END $$;

INSERT INTO public.app_meta (key, value)
VALUES ('storage_provider', '{"target": "supabase", "migrated_from": "vercel_blob"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
