
-- 1) PROFILES: add is_public and enforce via RLS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;
CREATE POLICY "Public or owner can view profiles"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (
    is_public = true
    OR EXISTS (
      SELECT 1 FROM public.generation_log g
      WHERE g.github_username = profiles.github_username
        AND g.user_id = auth.uid()
    )
  );

-- Sync is_public from user_accounts to all profiles owned by user (via generation_log)
CREATE OR REPLACE FUNCTION public.sync_profiles_is_public()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_public IS DISTINCT FROM OLD.is_public THEN
    UPDATE public.profiles p
    SET is_public = NEW.is_public
    WHERE p.github_username IN (
      SELECT DISTINCT github_username FROM public.generation_log
      WHERE user_id = NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_profiles_is_public() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_profiles_is_public_trg ON public.user_accounts;
CREATE TRIGGER sync_profiles_is_public_trg
  AFTER UPDATE OF is_public ON public.user_accounts
  FOR EACH ROW EXECUTE FUNCTION public.sync_profiles_is_public();

-- 2) USER_ACCOUNTS: prevent authenticated users from changing billing fields
CREATE OR REPLACE FUNCTION public.prevent_billing_column_updates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(auth.jwt() ->> 'role', '');
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.pro_until IS DISTINCT FROM OLD.pro_until
     OR NEW.billing_period IS DISTINCT FROM OLD.billing_period THEN
    RAISE EXCEPTION 'Not permitted to modify billing fields';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_billing_column_updates() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_billing_updates_trg ON public.user_accounts;
CREATE TRIGGER prevent_billing_updates_trg
  BEFORE UPDATE ON public.user_accounts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_billing_column_updates();

-- 3) Convert quota functions to SECURITY INVOKER (rely on RLS + explicit uid check)
CREATE OR REPLACE FUNCTION public.get_quota_status(p_user_id uuid)
 RETURNS TABLE(plan plan_tier, used_today integer, daily_limit integer)
 LANGUAGE plpgsql STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_plan public.plan_tier;
  pro_exp TIMESTAMPTZ;
  used INTEGER;
  effective_plan public.plan_tier;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT ua.plan, ua.pro_until INTO user_plan, pro_exp
  FROM public.user_accounts ua WHERE ua.user_id = p_user_id;
  IF user_plan IS NULL THEN user_plan := 'free'; END IF;
  IF user_plan = 'pro' AND (pro_exp IS NULL OR pro_exp > now()) THEN
    effective_plan := 'pro';
  ELSE
    effective_plan := 'free';
  END IF;
  SELECT COUNT(*) INTO used FROM public.generation_log
  WHERE user_id = p_user_id AND created_at >= date_trunc('day', now());
  RETURN QUERY SELECT effective_plan, used::INTEGER,
    CASE WHEN effective_plan = 'pro' THEN -1 ELSE 3 END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_generate(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_plan public.plan_tier;
  pro_exp TIMESTAMPTZ;
  used_today INTEGER;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT plan, pro_until INTO user_plan, pro_exp
  FROM public.user_accounts WHERE user_id = p_user_id;
  IF user_plan IS NULL THEN user_plan := 'free'; END IF;
  IF user_plan = 'pro' AND (pro_exp IS NULL OR pro_exp > now()) THEN
    RETURN TRUE;
  END IF;
  SELECT COUNT(*) INTO used_today FROM public.generation_log
  WHERE user_id = p_user_id AND created_at >= date_trunc('day', now());
  RETURN used_today < 3;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_quota_status(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_generate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quota_status(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_generate(uuid) TO authenticated, service_role;

-- 4) Revoke public execute on increment_view_count (moved to edge function)
REVOKE ALL ON FUNCTION public.increment_view_count(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_view_count(text) TO service_role;
