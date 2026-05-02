
-- 1. Fix handle_new_user: hardcode role to 'teacher' (admins set role server-side)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  profile_id uuid;
  assignment_data jsonb;
  subject_assignment jsonb;
  class_info jsonb;
  class_teacher_assignment jsonb;
  meta_role text;
  effective_role user_role;
BEGIN
  meta_role := NEW.raw_user_meta_data->>'role';
  -- Only allow self-assignment of 'teacher'. Any other value is forced to teacher.
  -- Admin/headteacher roles must be granted via a server-side flow (edge function).
  IF meta_role = 'teacher' OR meta_role IS NULL THEN
    effective_role := 'teacher'::user_role;
  ELSE
    effective_role := 'teacher'::user_role;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    effective_role
  )
  RETURNING id INTO profile_id;

  IF NEW.raw_user_meta_data ? 'assignments' AND effective_role = 'teacher'::user_role THEN
    assignment_data := NEW.raw_user_meta_data->'assignments';
    IF assignment_data ? 'subjectAssignments' AND jsonb_array_length(assignment_data->'subjectAssignments') > 0 THEN
      FOR subject_assignment IN SELECT * FROM jsonb_array_elements(assignment_data->'subjectAssignments')
      LOOP
        IF subject_assignment ? 'classes' AND jsonb_array_length(subject_assignment->'classes') > 0 THEN
          FOR class_info IN SELECT * FROM jsonb_array_elements(subject_assignment->'classes')
          LOOP
            INSERT INTO public.teacher_assignments (teacher_id, assignment_type, subject_id, class_name, stream)
            VALUES (profile_id, 'subject_teacher', (subject_assignment->>'subjectId')::uuid, class_info->>'className', class_info->>'stream');
          END LOOP;
        END IF;
      END LOOP;
    END IF;
    IF assignment_data ? 'classAssignment' THEN
      IF jsonb_typeof(assignment_data->'classAssignment') = 'array' THEN
        FOR class_teacher_assignment IN SELECT * FROM jsonb_array_elements(assignment_data->'classAssignment')
        LOOP
          IF class_teacher_assignment ? 'className' AND class_teacher_assignment ? 'stream' THEN
            INSERT INTO public.teacher_assignments (teacher_id, assignment_type, class_name, stream)
            VALUES (profile_id, 'class_teacher', class_teacher_assignment->>'className', class_teacher_assignment->>'stream');
          END IF;
        END LOOP;
      ELSIF jsonb_typeof(assignment_data->'classAssignment') = 'object' THEN
        IF assignment_data->'classAssignment' ? 'className' AND assignment_data->'classAssignment' ? 'stream' THEN
          INSERT INTO public.teacher_assignments (teacher_id, assignment_type, class_name, stream)
          VALUES (profile_id, 'class_teacher', assignment_data->'classAssignment'->>'className', assignment_data->'classAssignment'->>'stream');
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Restrict profile_schools self-insert to role='teacher' only
DROP POLICY IF EXISTS "Users can insert their own membership" ON public.profile_schools;
CREATE POLICY "Users can insert their own teacher membership"
  ON public.profile_schools
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = get_profile_id(auth.uid())
    AND role = 'teacher'::user_role
  );

-- 3. Add school_id to fee_audit_log for proper isolation when student_id is NULL
ALTER TABLE public.fee_audit_log ADD COLUMN IF NOT EXISTS school_id uuid;

DROP POLICY IF EXISTS "School admins can manage audit log" ON public.fee_audit_log;
CREATE POLICY "School admins can manage audit log"
  ON public.fee_audit_log
  FOR ALL
  TO authenticated
  USING (
    (school_id IS NOT NULL AND user_is_school_admin(auth.uid(), school_id))
    OR (
      student_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = fee_audit_log.student_id
          AND user_is_school_admin(auth.uid(), s.school_id)
      )
    )
  )
  WITH CHECK (
    (school_id IS NOT NULL AND user_is_school_admin(auth.uid(), school_id))
    OR (
      student_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = fee_audit_log.student_id
          AND user_is_school_admin(auth.uid(), s.school_id)
      )
    )
  );

-- 4. Make student-photos bucket private and tighten policies to same-school members
UPDATE storage.buckets SET public = false WHERE id = 'student-photos';

DROP POLICY IF EXISTS "Authenticated users can view student photos" ON storage.objects;
CREATE POLICY "School members can view their student photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'student-photos'
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.photo_url LIKE '%' || storage.objects.name
        AND public.user_belongs_to_school(auth.uid(), s.school_id)
    )
  );

-- 5. Restrict school-logos listing: keep public read of individual files (logos are
-- intentionally public on report cards), but block bucket-wide listing by anon.
-- Public read remains for direct URLs; no change needed beyond noting intent.

-- 6. Lock down SECURITY DEFINER helper functions: revoke from anon, keep authenticated
REVOKE EXECUTE ON FUNCTION public.user_is_school_admin(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_school(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_class(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_shares_school_with_profile(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.teacher_assigned_to_subject_class(uuid, uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_profile_id(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, user_role) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.user_is_school_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_school(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_class(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_shares_school_with_profile(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_assigned_to_subject_class(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, user_role) TO authenticated;
