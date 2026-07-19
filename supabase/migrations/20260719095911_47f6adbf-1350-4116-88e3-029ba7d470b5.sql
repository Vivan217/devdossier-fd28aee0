REVOKE EXECUTE ON FUNCTION public.set_profile_theme(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_theme(text, text) TO service_role;