
-- Fix search_path on trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- The increment_view_count function is intentionally callable by anon/auth users
-- because this is a public showcase MVP without authentication. View tracking
-- needs to work for unauthenticated visitors. This is by design.
COMMENT ON FUNCTION public.increment_view_count(TEXT) IS
  'Public view counter for DevDossier profiles. Intentionally callable by anon role for the public showcase MVP.';
