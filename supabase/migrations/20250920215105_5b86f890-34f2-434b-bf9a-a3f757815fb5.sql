-- Update the handle_new_user function to handle teacher assignments
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  profile_id uuid;
  assignment_data jsonb;
  subject_assignment jsonb;
  class_info jsonb;
BEGIN
  -- Insert profile and get the ID
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'teacher'::user_role)
  )
  RETURNING id INTO profile_id;
  
  -- Handle teacher assignments if they exist
  IF NEW.raw_user_meta_data ? 'assignments' AND NEW.raw_user_meta_data->>'role' = 'teacher' THEN
    assignment_data := NEW.raw_user_meta_data->'assignments';
    
    -- Insert subject assignments
    IF assignment_data ? 'subjectAssignments' THEN
      FOR subject_assignment IN SELECT * FROM jsonb_array_elements(assignment_data->'subjectAssignments')
      LOOP
        FOR class_info IN SELECT * FROM jsonb_array_elements(subject_assignment->'classes')
        LOOP
          INSERT INTO public.teacher_assignments (
            teacher_id,
            assignment_type,
            subject_id,
            class_name,
            stream
          ) VALUES (
            profile_id,
            'subject_teacher',
            (subject_assignment->>'subjectId')::uuid,
            class_info->>'className',
            class_info->>'stream'
          );
        END LOOP;
      END LOOP;
    END IF;
    
    -- Insert class assignment
    IF assignment_data ? 'classAssignment' AND assignment_data->'classAssignment' IS NOT NULL THEN
      INSERT INTO public.teacher_assignments (
        teacher_id,
        assignment_type,
        class_name,
        stream
      ) VALUES (
        profile_id,
        'class_teacher',
        assignment_data->'classAssignment'->>'className',
        assignment_data->'classAssignment'->>'stream'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;