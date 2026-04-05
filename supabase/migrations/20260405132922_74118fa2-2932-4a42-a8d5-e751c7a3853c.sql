ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS a_level_template_id integer NOT NULL DEFAULT 1;

ALTER TABLE public.schools
ADD CONSTRAINT schools_a_level_template_id_check
CHECK (a_level_template_id BETWEEN 1 AND 4);

ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS academic_level text;

UPDATE public.students s
SET academic_level = CASE
  WHEN upper(replace(replace(coalesce(c.name, ''), '.', ''), ' ', '')) ~ 'S[56]' THEN 'a-level'
  ELSE 'o-level'
END
FROM public.class_students cs
JOIN public.classes c ON c.id = cs.class_id
WHERE cs.student_id = s.id
  AND (s.academic_level IS NULL OR s.academic_level NOT IN ('o-level', 'a-level'));

UPDATE public.students
SET academic_level = 'o-level'
WHERE academic_level IS NULL;

ALTER TABLE public.students
ALTER COLUMN academic_level SET NOT NULL;

ALTER TABLE public.students
ADD CONSTRAINT students_academic_level_check
CHECK (academic_level IN ('o-level', 'a-level'));