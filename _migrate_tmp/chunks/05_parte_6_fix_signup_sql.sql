-- =============================================================================
-- PARTE 6 — Corrigir cadastro (trigger profiles + permissões)
-- Rode no SQL Editor se o cadastro retorna 400
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    'customer'
  )
  ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'handle_new_user error: %', SQLERRM;
    RAISE;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Permissões para o Auth criar perfis via trigger
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;
GRANT INSERT ON public.profiles TO postgres, supabase_auth_admin;

-- Garante INSERT apenas via trigger (não pelo cliente)
REVOKE INSERT ON public.profiles FROM authenticated, anon;

-- Policy explícita para o service role / auth admin inserir perfis
DROP POLICY IF EXISTS "profiles_insert_service" ON public.profiles;
CREATE POLICY "profiles_insert_service"
  ON public.profiles
  FOR INSERT
  TO supabase_auth_admin
  WITH CHECK (true);
