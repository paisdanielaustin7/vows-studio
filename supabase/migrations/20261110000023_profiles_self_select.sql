-- VOWS Studio — Migration 023: Self-Select RLS Policy on Profiles
-- Ensures every authenticated user can always read their own profiles row (id = auth.uid()),
-- including during AAL1 MFA verification and as an authoritative role/is_active fallback
-- in proxy.ts and getAuthenticatedUser() without weakening multi-user visibility policies.

DROP POLICY IF EXISTS profiles__select__self ON public.profiles;
CREATE POLICY profiles__select__self ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());
