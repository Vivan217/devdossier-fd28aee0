
-- 1) Drop overly permissive profiles policies (writes happen via edge function using service role)
DROP POLICY IF EXISTS "Authenticated users can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON public.profiles;

-- 2) Harden quota functions with auth.uid() guard
CREATE OR REPLACE FUNCTION public.get_quota_status(p_user_id uuid)
 RETURNS TABLE(plan plan_tier, used_today integer, daily_limit integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
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

  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;

  IF user_plan = 'pro' AND (pro_exp IS NULL OR pro_exp > now()) THEN
    effective_plan := 'pro';
  ELSE
    effective_plan := 'free';
  END IF;

  SELECT COUNT(*) INTO used
  FROM public.generation_log
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('day', now());

  RETURN QUERY SELECT effective_plan,
                       used::INTEGER,
                       CASE WHEN effective_plan = 'pro' THEN -1 ELSE 3 END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_generate(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
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

  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;

  IF user_plan = 'pro' AND (pro_exp IS NULL OR pro_exp > now()) THEN
    RETURN TRUE;
  END IF;

  SELECT COUNT(*) INTO used_today
  FROM public.generation_log
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('day', now());

  RETURN used_today < 3;
END;
$function$;

-- 3) Revoke EXECUTE on definer functions from public/anon roles
REVOKE ALL ON FUNCTION public.get_quota_status(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_generate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quota_status(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_generate(uuid) TO authenticated, service_role;

-- increment_view_count is intentionally publicly callable from the public profile page
-- (it updates view_count on profiles via SECURITY DEFINER). Keep anon execute.
