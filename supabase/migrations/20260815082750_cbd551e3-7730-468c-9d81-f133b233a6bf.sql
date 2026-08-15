-- Lock down user_accounts: rows may only be created/removed by trusted server-side logic
REVOKE INSERT, DELETE ON public.user_accounts FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.user_accounts FROM anon;
GRANT SELECT, UPDATE ON public.user_accounts TO authenticated;
GRANT ALL ON public.user_accounts TO service_role;

DROP POLICY IF EXISTS "No client inserts on user_accounts" ON public.user_accounts;
CREATE POLICY "No client inserts on user_accounts"
ON public.user_accounts FOR INSERT TO anon, authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "No client deletes on user_accounts" ON public.user_accounts;
CREATE POLICY "No client deletes on user_accounts"
ON public.user_accounts FOR DELETE TO anon, authenticated
USING (false);