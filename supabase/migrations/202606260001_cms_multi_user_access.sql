-- Contas CMS multi-usuário com níveis de acesso
CREATE TABLE IF NOT EXISTS public.cms_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  access_level text NOT NULL DEFAULT 'basic'
    CHECK (access_level IN ('super_admin', 'admin', 'basic')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cms_users_access_level_idx ON public.cms_users (access_level);
CREATE INDEX IF NOT EXISTS cms_users_email_lower_idx ON public.cms_users (lower(email));

ALTER TABLE public.cms_users ENABLE ROW LEVEL SECURITY;

-- Migra conta legada (cms_account id=1) → cms_users
INSERT INTO public.cms_users (email, password_hash, access_level)
SELECT
  lower(trim(COALESCE(NULLIF(a.email, ''), a.username))),
  COALESCE(a.password_hash, ''),
  CASE
    WHEN lower(trim(COALESCE(NULLIF(a.email, ''), a.username))) = 'nousdynamicslta@gmail.com'
      THEN 'super_admin'
    ELSE 'admin'
  END
FROM public.cms_account a
WHERE a.id = 1
  AND COALESCE(a.password_hash, '') <> ''
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  access_level = EXCLUDED.access_level,
  updated_at = now();

COMMENT ON TABLE public.cms_users IS 'Usuários do painel CMS (equipe interna)';
