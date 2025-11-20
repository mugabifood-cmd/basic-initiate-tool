-- Update handle_new_user function to support multiple class teacher assignments
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
    IF assignment_data ? 'subjectAssignments' AND jsonb_array_length(assignment_data->'subjectAssignments') > 0 THEN
      FOR subject_assignment IN SELECT * FROM jsonb_array_elements(assignment_data->'subjectAssignments')
      LOOP
        IF subject_assignment ? 'classes' AND jsonb_array_length(subject_assignment->'classes') > 0 THEN
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
        END IF;
      END LOOP;
    END IF;
    
    -- Insert class teacher assignment(s) - now supports both single object and array
    IF assignment_data ? 'classAssignment' THEN
      -- Check if it's an array
      IF jsonb_typeof(assignment_data->'classAssignment') = 'array' THEN
        -- Handle array of class assignments
        IF jsonb_array_length(assignment_data->'classAssignment') > 0 THEN
          FOR class_teacher_assignment IN SELECT * FROM jsonb_array_elements(assignment_data->'classAssignment')
          LOOP
            IF class_teacher_assignment ? 'className' AND class_teacher_assignment ? 'stream' THEN
              INSERT INTO public.teacher_assignments (
                teacher_id,
                assignment_type,
                class_name,
                stream
              ) VALUES (
                profile_id,
                'class_teacher',
                class_teacher_assignment->>'className',
                class_teacher_assignment->>'stream'
              );
            END IF;
          END LOOP;
        END IF;
      ELSIF jsonb_typeof(assignment_data->'classAssignment') = 'object' THEN
        -- Handle single class assignment object (backward compatibility)
        IF assignment_data->'classAssignment' ? 'className' AND assignment_data->'classAssignment' ? 'stream' THEN
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
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;