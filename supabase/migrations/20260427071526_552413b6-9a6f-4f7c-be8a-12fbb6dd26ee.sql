
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  github_username TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  public_repos INTEGER DEFAULT 0,
  total_stars INTEGER DEFAULT 0,
  top_languages JSONB DEFAULT '[]'::jsonb,
  top_repos JSONB DEFAULT '[]'::jsonb,
  ai_summary TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Public showcase: anyone can read
CREATE POLICY "Profiles are publicly viewable"
  ON public.profiles FOR SELECT
  USING (true);

-- Anyone can create a profile (MVP, no auth)
CREATE POLICY "Anyone can create profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- Anyone can update (to refresh data + bump views)
CREATE POLICY "Anyone can update profiles"
  ON public.profiles FOR UPDATE
  USING (true);

-- Atomic view increment function
CREATE OR REPLACE FUNCTION public.increment_view_count(p_username TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.profiles
  SET view_count = view_count + 1
  WHERE github_username = p_username
  RETURNING view_count INTO new_count;
  RETURN new_count;
END;
$$;

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
