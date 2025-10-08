-- Create table for storing grade-based comments
CREATE TABLE public.grade_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grade text NOT NULL UNIQUE,
  headteacher_comment text NOT NULL,
  class_teacher_comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grade_comments ENABLE ROW LEVEL SECURITY;

-- Admins can manage grade comments
CREATE POLICY "Admins can manage grade comments"
ON public.grade_comments
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Authenticated users can view grade comments
CREATE POLICY "Authenticated users can view grade comments"
ON public.grade_comments
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_grade_comments_updated_at
BEFORE UPDATE ON public.grade_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default comments for common grades
INSERT INTO public.grade_comments (grade, headteacher_comment, class_teacher_comment) VALUES
('A', 'Excellent performance. Keep up the outstanding work!', 'Outstanding achievement. Continue with this exemplary effort.'),
('B', 'Very good performance. Continue working hard!', 'Very good work. Maintain this strong performance.'),
('C', 'Good performance. Keep striving for improvement!', 'Good effort. Continue to work towards excellence.'),
('D', 'Fair performance. More effort is needed.', 'Fair work. Additional effort required for improvement.'),
('E', 'Below average. Significant improvement needed.', 'Needs improvement. Please seek additional support.'),
('F', 'Unsatisfactory. Immediate attention required.', 'Poor performance. Urgent intervention needed.');