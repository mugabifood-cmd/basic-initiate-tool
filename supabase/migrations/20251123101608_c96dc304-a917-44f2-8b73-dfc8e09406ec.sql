-- Allow teachers to delete their own submissions
CREATE POLICY "Teachers can delete their own submissions"
ON public.subject_submissions
FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id 
    FROM profiles 
    WHERE id = subject_submissions.teacher_id
  )
);