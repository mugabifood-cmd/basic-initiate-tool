-- Create teacher assignments table
CREATE TABLE public.teacher_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('subject_teacher', 'class_teacher')),
  subject_id UUID NULL, -- Only for subject teachers
  class_name TEXT NULL, -- S1, S2, S3, S4
  stream TEXT NULL, -- East, West, All
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_subject_teacher CHECK (
    (assignment_type = 'subject_teacher' AND subject_id IS NOT NULL AND class_name IS NOT NULL AND stream IS NOT NULL) OR
    (assignment_type = 'class_teacher' AND subject_id IS NULL AND class_name IS NOT NULL AND stream IS NOT NULL)
  ),
  
  -- Prevent duplicate assignments
  UNIQUE(teacher_id, assignment_type, subject_id, class_name, stream),
  UNIQUE(teacher_id, assignment_type, class_name, stream) -- For class teachers (one per class/stream)
);

-- Enable Row Level Security
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all teacher assignments" 
ON public.teacher_assignments 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Teachers can view their own assignments" 
ON public.teacher_assignments 
FOR SELECT 
USING (auth.uid() IN (
  SELECT profiles.user_id 
  FROM profiles 
  WHERE profiles.id = teacher_assignments.teacher_id
));

-- Add foreign key constraints
ALTER TABLE public.teacher_assignments 
ADD CONSTRAINT fk_teacher_assignments_teacher 
FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.teacher_assignments 
ADD CONSTRAINT fk_teacher_assignments_subject 
FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_teacher_assignments_updated_at
BEFORE UPDATE ON public.teacher_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();