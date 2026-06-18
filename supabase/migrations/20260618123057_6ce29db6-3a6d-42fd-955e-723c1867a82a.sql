
ALTER TABLE public.user_accounts
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT;

CREATE POLICY "Users delete their own generation log"
  ON public.generation_log
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
