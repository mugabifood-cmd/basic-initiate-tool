ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS active_term text NOT NULL DEFAULT 'Term 1',
  ADD COLUMN IF NOT EXISTS active_academic_year text NOT NULL DEFAULT (EXTRACT(YEAR FROM now())::text);