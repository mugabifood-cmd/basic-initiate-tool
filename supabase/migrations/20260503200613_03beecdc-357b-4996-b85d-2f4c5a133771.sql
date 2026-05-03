UPDATE public.report_cards rc
SET school_id = c.school_id
FROM public.classes c
WHERE rc.class_id = c.id AND rc.school_id IS NULL;