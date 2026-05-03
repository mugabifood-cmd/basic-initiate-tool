UPDATE public.subject_submissions ss
SET school_id = c.school_id
FROM public.classes c
WHERE ss.class_id = c.id
  AND ss.school_id IS NULL;

UPDATE public.teacher_assignments ta
SET school_id = c.school_id
FROM public.classes c
WHERE ta.school_id IS NULL
  AND ta.class_name = c.name
  AND ta.stream = c.stream;