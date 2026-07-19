
-- 1) Drop unused public URL columns from user_accounts
ALTER TABLE public.user_accounts DROP COLUMN IF EXISTS linkedin_url;
ALTER TABLE public.user_accounts DROP COLUMN IF EXISTS portfolio_url;

-- 2) Restrict EXECUTE on internal SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profiles_is_public() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_billing_column_updates() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_view_count(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
-- Keep set_profile_theme callable by authenticated (has internal ownership + pro checks)
REVOKE ALL ON FUNCTION public.set_profile_theme(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_profile_theme(text, text) TO authenticated;
-- Quota RPCs remain authenticated-only
REVOKE ALL ON FUNCTION public.can_generate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_generate(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_quota_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quota_status(uuid) TO authenticated;

-- 3) Explicitly block client writes to payments (RLS already denies; belt-and-suspenders)
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

-- Add explicit deny-write policies for clarity in policy set
DROP POLICY IF EXISTS "No client inserts on payments" ON public.payments;
CREATE POLICY "No client inserts on payments" ON public.payments
  FOR INSERT TO anon, authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No client updates on payments" ON public.payments;
CREATE POLICY "No client updates on payments" ON public.payments
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "No client deletes on payments" ON public.payments;
CREATE POLICY "No client deletes on payments" ON public.payments
  FOR DELETE TO anon, authenticated USING (false);
