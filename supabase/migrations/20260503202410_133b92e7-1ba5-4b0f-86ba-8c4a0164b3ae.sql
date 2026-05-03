-- 1. Enforce one school per account: unique profile_id in profile_schools
-- First, deduplicate any existing rows (keep oldest)
DELETE FROM public.profile_schools ps
WHERE ps.id NOT IN (
  SELECT DISTINCT ON (profile_id) id
  FROM public.profile_schools
  ORDER BY profile_id, created_at ASC
);

ALTER TABLE public.profile_schools
  DROP CONSTRAINT IF EXISTS profile_schools_profile_unique;

ALTER TABLE public.profile_schools
  ADD CONSTRAINT profile_schools_profile_unique UNIQUE (profile_id);

-- 2. Add report card font setting on schools
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS report_font_family text NOT NULL DEFAULT 'Arial, sans-serif';