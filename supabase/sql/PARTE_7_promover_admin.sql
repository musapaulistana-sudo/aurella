-- =============================================================================
-- PARTE 7 — Promover usuário a admin (TROQUE O E-MAIL)
-- PRÉ-REQUISITO: rode PARTE_8_fix_admin_promotion.sql se role voltar a customer
-- =============================================================================

INSERT INTO public.profiles (id, name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'Admin'),
  'admin'
FROM auth.users u
WHERE lower(u.email) = lower('teste@gmail.com')
ON CONFLICT (id) DO UPDATE
SET role = 'admin';

-- Verificar:
-- SELECT p.id, u.email, p.name, p.role
-- FROM public.profiles p
-- JOIN auth.users u ON u.id = p.id
-- WHERE lower(u.email) = lower('teste@gmail.com');
