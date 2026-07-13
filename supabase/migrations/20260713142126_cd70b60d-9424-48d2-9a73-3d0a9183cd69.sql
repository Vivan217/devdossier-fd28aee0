-- Restrict user-editable columns and enforce billing changes via service_role only
DROP POLICY IF EXISTS "Users update their own account" ON public.user_accounts;

CREATE POLICY "Users update their own account non-billing"
ON public.user_accounts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure the billing-protection trigger exists (defense-in-depth alongside the policy)
DROP TRIGGER IF EXISTS prevent_billing_updates_trg ON public.user_accounts;
CREATE TRIGGER prevent_billing_updates_trg
BEFORE UPDATE ON public.user_accounts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_billing_column_updates();