
CREATE TABLE IF NOT EXISTS public.dashboard_calendar_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_calendar_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own dashboard prefs"
  ON public.dashboard_calendar_prefs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own dashboard prefs"
  ON public.dashboard_calendar_prefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own dashboard prefs"
  ON public.dashboard_calendar_prefs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own dashboard prefs"
  ON public.dashboard_calendar_prefs FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_dashboard_calendar_prefs_updated_at
  BEFORE UPDATE ON public.dashboard_calendar_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
