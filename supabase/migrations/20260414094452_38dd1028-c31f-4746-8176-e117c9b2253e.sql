
-- 1. Create profile_schools junction table
CREATE TABLE public.profile_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'teacher',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, school_id)
);

ALTER TABLE public.profile_schools ENABLE ROW LEVEL SECURITY;

-- 2. Create security definer function for school membership checks
CREATE OR REPLACE FUNCTION public.user_belongs_to_school(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profile_schools ps
    JOIN public.profiles p ON p.id = ps.profile_id
    WHERE p.user_id = _user_id
      AND ps.school_id = _school_id
  )
$$;

-- Helper: get profile_id from user_id
CREATE OR REPLACE FUNCTION public.get_profile_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 3. RLS policies for profile_schools
CREATE POLICY "Users can view their own school memberships"
ON public.profile_schools FOR SELECT
TO authenticated
USING (profile_id = public.get_profile_id(auth.uid()));

CREATE POLICY "Admins can manage school memberships"
ON public.profile_schools FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profile_schools ps2
    JOIN public.profiles p ON p.id = ps2.profile_id
    WHERE p.user_id = auth.uid()
      AND ps2.school_id = profile_schools.school_id
      AND ps2.role = 'admin'
  )
);

CREATE POLICY "Users can insert their own membership"
ON public.profile_schools FOR INSERT
TO authenticated
WITH CHECK (profile_id = public.get_profile_id(auth.uid()));

-- 4. Add school_id to tables missing it
ALTER TABLE public.teacher_assignments ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.subject_submissions ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.report_cards ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profile_schools_profile ON public.profile_schools(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_schools_school ON public.profile_schools(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_school ON public.teacher_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_subject_submissions_school ON public.subject_submissions(school_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_school ON public.report_cards(school_id);
CREATE INDEX IF NOT EXISTS idx_signatures_school ON public.signatures(school_id);

-- 6. Trigger for updated_at
CREATE TRIGGER update_profile_schools_updated_at
BEFORE UPDATE ON public.profile_schools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
