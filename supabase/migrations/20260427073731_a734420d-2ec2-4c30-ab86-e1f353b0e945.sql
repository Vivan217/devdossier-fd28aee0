
-- 1) Plan enum
CREATE TYPE public.plan_tier AS ENUM ('free', 'pro');

-- 2) user_accounts table (plan info per auth user)
CREATE TABLE public.user_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.plan_tier NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own account"
  ON public.user_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update their own account"
  ON public.user_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger: create user_accounts row on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_accounts (user_id, plan)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger for user_accounts
CREATE TRIGGER update_user_accounts_updated_at
  BEFORE UPDATE ON public.user_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3) generation_log
CREATE TABLE public.generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_generation_log_user_day
  ON public.generation_log (user_id, created_at);

ALTER TABLE public.generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own generation log"
  ON public.generation_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own generation log"
  ON public.generation_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4) can_generate helper (security definer to bypass RLS for the check)
CREATE OR REPLACE FUNCTION public.can_generate(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan public.plan_tier;
  used_today INTEGER;
BEGIN
  SELECT plan INTO user_plan FROM public.user_accounts WHERE user_id = p_user_id;
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;

  IF user_plan = 'pro' THEN
    RETURN TRUE;
  END IF;

  SELECT COUNT(*) INTO used_today
  FROM public.generation_log
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('day', now());

  RETURN used_today < 3;
END;
$$;

-- 5) Function to read today's usage info
CREATE OR REPLACE FUNCTION public.get_quota_status(p_user_id UUID)
RETURNS TABLE(plan public.plan_tier, used_today INTEGER, daily_limit INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan public.plan_tier;
  used INTEGER;
BEGIN
  SELECT ua.plan INTO user_plan FROM public.user_accounts ua WHERE ua.user_id = p_user_id;
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;

  SELECT COUNT(*) INTO used
  FROM public.generation_log
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('day', now());

  RETURN QUERY SELECT user_plan,
                       used::INTEGER,
                       CASE WHEN user_plan = 'pro' THEN -1 ELSE 3 END;
END;
$$;

-- 6) Tighten profiles (GitHub dossiers) write policies — require auth
DROP POLICY IF EXISTS "Anyone can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;

CREATE POLICY "Authenticated users can create profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (true);
