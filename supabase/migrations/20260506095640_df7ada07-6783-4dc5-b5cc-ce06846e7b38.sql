-- Create student_subjects table to assign subjects per student
CREATE TABLE IF NOT EXISTS public.student_subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  school_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_student_subjects_student ON public.student_subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_subject ON public.student_subjects(subject_id);

ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School admins can manage student subjects"
ON public.student_subjects
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.students s
  WHERE s.id = student_subjects.student_id
    AND public.user_is_school_admin(auth.uid(), s.school_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.students s
  WHERE s.id = student_subjects.student_id
    AND public.user_is_school_admin(auth.uid(), s.school_id)
));

CREATE POLICY "School members can view student subjects"
ON public.student_subjects
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.students s
  WHERE s.id = student_subjects.student_id
    AND public.user_belongs_to_school(auth.uid(), s.school_id)
));