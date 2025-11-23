-- Add shared term dates and requirements to classes table
ALTER TABLE public.classes
ADD COLUMN term_ended_on date,
ADD COLUMN next_term_begins date,
ADD COLUMN general_requirements text;

-- Add comment to explain these fields
COMMENT ON COLUMN public.classes.term_ended_on IS 'Shared term end date for all students in this class';
COMMENT ON COLUMN public.classes.next_term_begins IS 'Shared next term start date for all students in this class';
COMMENT ON COLUMN public.classes.general_requirements IS 'Shared general requirements for all students in this class';