-- Extend user_accounts with subscription metadata
ALTER TABLE public.user_accounts
  ADD COLUMN IF NOT EXISTS billing_period TEXT,
  ADD COLUMN IF NOT EXISTS pro_until TIMESTAMPTZ;

-- Payments log
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  plan_period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies => only service role (edge functions) can write.

CREATE TRIGGER payments_set_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Update can_generate to also honor pro_until expiry
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