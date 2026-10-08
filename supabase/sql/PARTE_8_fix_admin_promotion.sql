-- =============================================================================
-- PARTE 8 — Corrigir promoção a admin (trigger bloqueava SQL Editor)
--
-- O trigger prevent_role_self_escalation impedia QUALQUER mudança de role
-- quando auth.uid() não era admin — inclusive no SQL Editor (auth.uid() = NULL).
-- Resultado: UPDATE SET role = 'admin' parecia funcionar mas voltava a customer.
-- =============================================================================

CREATE OR REPLACE FUNCTION prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  -- SQL Editor / migrations (postgres)
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- Service role (API server, scripts locais)
  jwt_role := current_setting('request.jwt.claim.role', true);
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Usuário comum não pode alterar o próprio role
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT is_admin() THEN
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- Depois de rodar PARTE 8, promova o admin (TROQUE O E-MAIL):
-- =============================================================================

INSERT INTO public.profiles (id, name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'Admin'),
  'admin'
FROM auth.users u
WHERE lower(u.email) = lower('admin@gmail.com')
ON CONFLICT (id) DO UPDATE
SET role = 'admin';

-- Verificar (role deve ser 'admin'):
SELECT u.email, p.role, p.name
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE lower(u.email) = lower('admin@gmail.com');
