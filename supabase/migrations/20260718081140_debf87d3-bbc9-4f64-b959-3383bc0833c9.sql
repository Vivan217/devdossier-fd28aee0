
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'default';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_theme_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_theme_check
  CHECK (theme IN ('default','aurora','terminal','minimal'));

CREATE OR REPLACE FUNCTION public.set_profile_theme(p_username text, p_theme text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
  user_plan public.plan_tier;
  pro_exp timestamptz;
  effective_pro boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_theme NOT IN ('default','aurora','terminal','minimal') THEN
    RAISE EXCEPTION 'Invalid theme';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.generation_log
    WHERE user_id = auth.uid() AND github_username = p_username
  ) INTO is_owner;

  IF NOT is_owner THEN
    RAISE EXCEPTION 'Not your profile';
  END IF;

  IF p_theme <> 'default' THEN
    SELECT plan, pro_until INTO user_plan, pro_exp
    FROM public.user_accounts WHERE user_id = auth.uid();
    effective_pro := (user_plan = 'pro' AND (pro_exp IS NULL OR pro_exp > now()));
    IF NOT effective_pro THEN
      RAISE EXCEPTION 'Pro plan required for this theme';
    END IF;
  END IF;

  UPDATE public.profiles
  SET theme = p_theme, updated_at = now()
  WHERE github_username = p_username;

  RETURN p_theme;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_profile_theme(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_profile_theme(text, text) TO authenticated;
