-- Níveis de acesso: basic (somente leitura) e super_admin (gestão total).
-- Apenas nousdynamicslta@gmail.com pode ser super_admin e alterar níveis.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS access_level text NOT NULL DEFAULT 'basic';

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_access_level_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_access_level_check
  CHECK (access_level IN ('basic', 'super_admin'));

UPDATE public.user_profiles p
SET access_level = 'super_admin', updated_at = now()
FROM auth.users u
WHERE u.id = p.id AND lower(u.email) = lower('nousdynamicslta@gmail.com');

UPDATE public.user_profiles
SET access_level = 'basic', updated_at = now()
WHERE access_level IS DISTINCT FROM 'super_admin'
  OR access_level = 'basic';

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles p
    INNER JOIN auth.users u ON u.id = p.id
    WHERE p.id = auth.uid()
      AND p.access_level = 'super_admin'
      AND lower(u.email) = lower('nousdynamicslta@gmail.com')
  );
$$;

CREATE OR REPLACE FUNCTION public.resolve_access_level_for_email(user_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(coalesce(user_email, '')) = lower('nousdynamicslta@gmail.com') THEN 'super_admin'
    ELSE 'basic'
  END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, access_level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    public.resolve_access_level_for_email(NEW.email)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    access_level = public.resolve_access_level_for_email(NEW.email),
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS user_profiles_select_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_insert_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;

CREATE POLICY user_profiles_select_own
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_super_admin());

CREATE POLICY user_profiles_insert_own
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND access_level = 'basic');

CREATE POLICY user_profiles_update_super_admin
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (
    public.is_super_admin()
    AND (
      access_level = 'basic'
      OR (
        access_level = 'super_admin'
        AND EXISTS (
          SELECT 1 FROM auth.users u
          WHERE u.id = user_profiles.id
            AND lower(u.email) = lower('nousdynamicslta@gmail.com')
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.list_users_for_admin()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  phone text,
  access_level text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    p.full_name,
    p.phone,
    p.access_level,
    p.created_at
  FROM auth.users u
  INNER JOIN public.user_profiles p ON p.id = u.id
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_access_level(
  target_user_id uuid,
  new_level text
)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_email text;
  updated public.user_profiles;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF new_level NOT IN ('basic', 'super_admin') THEN
    RAISE EXCEPTION 'Nível de acesso inválido';
  END IF;

  SELECT u.email INTO target_email
  FROM auth.users u
  WHERE u.id = target_user_id;

  IF target_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  IF new_level = 'super_admin' AND lower(target_email) <> lower('nousdynamicslta@gmail.com') THEN
    RAISE EXCEPTION 'Somente nousdynamicslta@gmail.com pode ser super admin';
  END IF;

  UPDATE public.user_profiles p
  SET access_level = new_level, updated_at = now()
  WHERE p.id = target_user_id
  RETURNING p.* INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;

  RETURN updated;
END;
$$;

REVOKE ALL ON FUNCTION public.list_users_for_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_user_access_level(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_users_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_access_level(uuid, text) TO authenticated;
