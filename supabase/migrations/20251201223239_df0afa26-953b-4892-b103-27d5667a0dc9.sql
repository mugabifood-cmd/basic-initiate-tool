-- Drop the existing unique constraint that prevents multiple subjects per class
ALTER TABLE teacher_assignments 
DROP CONSTRAINT IF EXISTS teacher_assignments_teacher_id_assignment_type_class_name_s_key;

-- Add a new unique constraint that includes subject_id
-- This allows a teacher to teach multiple subjects in the same class
-- but prevents duplicate assignments of the same subject
ALTER TABLE teacher_assignments 
ADD CONSTRAINT teacher_assignments_unique_assignment 
UNIQUE (teacher_id, assignment_type, subject_id, class_name, stream);