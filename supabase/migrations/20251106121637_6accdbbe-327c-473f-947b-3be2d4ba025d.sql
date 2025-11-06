-- Drop existing RLS policies for subject_submissions to update them
DROP POLICY IF EXISTS "Teachers can insert their submissions" ON subject_submissions;
DROP POLICY IF EXISTS "Teachers can update their pending submissions" ON subject_submissions;

-- Create a function to check if a teacher is assigned to a subject and class
CREATE OR REPLACE FUNCTION public.teacher_assigned_to_subject_class(
  _teacher_id uuid,
  _subject_id uuid,
  _class_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM teacher_assignments ta
    JOIN classes c ON c.id = _class_id
    WHERE ta.teacher_id = _teacher_id
      AND ta.subject_id = _subject_id
      AND ta.class_name = c.name
      AND ta.stream = c.stream
      AND ta.assignment_type = 'subject_teacher'
  )
$$;

-- Create new INSERT policy with assignment validation
CREATE POLICY "Teachers can insert submissions for assigned subjects and classes"
ON subject_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT profiles.user_id
    FROM profiles
    WHERE profiles.id = subject_submissions.teacher_id
  )
  AND
  public.teacher_assigned_to_subject_class(
    subject_submissions.teacher_id,
    subject_submissions.subject_id,
    subject_submissions.class_id
  )
);

-- Create new UPDATE policy with assignment validation
CREATE POLICY "Teachers can update pending submissions for assigned subjects"
ON subject_submissions
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT profiles.user_id
    FROM profiles
    WHERE profiles.id = subject_submissions.teacher_id
  )
  AND status = 'pending'
  AND
  public.teacher_assigned_to_subject_class(
    subject_submissions.teacher_id,
    subject_submissions.subject_id,
    subject_submissions.class_id
  )
);