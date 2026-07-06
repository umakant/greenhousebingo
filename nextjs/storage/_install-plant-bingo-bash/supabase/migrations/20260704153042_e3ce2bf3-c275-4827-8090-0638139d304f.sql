
-- 1) Remove client-callable SECURITY DEFINER helper. Signup will rely on the
--    unique constraint on profiles.username instead.
DROP FUNCTION IF EXISTS public.username_available(text);

-- 2) Revoke EXECUTE on public.has_role from anon/authenticated. Keep it available
--    to service_role (and to postgres/definer contexts). No current RLS policy
--    depends on the authenticated grant.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.account_type) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.account_type) TO service_role;

-- 3) Tighten permissive INSERT policy on host_inquiries. Public submissions
--    still allowed, but only when the required fields are present.
DROP POLICY IF EXISTS "Anyone can submit a host inquiry" ON public.host_inquiries;
CREATE POLICY "Anyone can submit a valid host inquiry"
  ON public.host_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    name IS NOT NULL AND length(btrim(name)) > 0
    AND email IS NOT NULL AND length(btrim(email)) > 0
    AND facility_name IS NOT NULL AND length(btrim(facility_name)) > 0
    AND facility_type IS NOT NULL AND length(btrim(facility_type)) > 0
    AND city IS NOT NULL AND length(btrim(city)) > 0
    AND state IS NOT NULL AND length(btrim(state)) > 0
  );
