-- Create table for comment templates based on percentage ranges
CREATE TABLE IF NOT EXISTS public.comment_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_percentage integer NOT NULL,
  max_percentage integer NOT NULL,
  class_teacher_comment text NOT NULL,
  headteacher_comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT valid_percentage_range CHECK (min_percentage >= 0 AND max_percentage <= 100 AND min_percentage < max_percentage)
);

-- Enable RLS
ALTER TABLE public.comment_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage comment templates"
  ON public.comment_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Authenticated users can view comment templates"
  ON public.comment_templates
  FOR SELECT
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_comment_templates_updated_at
  BEFORE UPDATE ON public.comment_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default comment templates based on the images
INSERT INTO public.comment_templates (min_percentage, max_percentage, class_teacher_comment, headteacher_comment) VALUES
  (80, 100, 'Excellent performance! Keep up the outstanding work.', 'Congratulations on your excellent academic achievement. You are a role model to others.'),
  (70, 79, 'Good work shown. Continue to strive for excellence.', 'Well done on your good performance. Continue working hard to achieve even better results.'),
  (60, 69, 'Satisfactory performance. There is room for improvement.', 'Your performance is satisfactory. I encourage you to put in more effort to reach your full potential.'),
  (50, 59, 'Fair performance. More effort needed to improve.', 'Your performance needs improvement. Please seek help from your teachers and work harder next term.'),
  (0, 49, 'Poor performance. Serious improvement needed.', 'Your performance is concerning. Please meet with your teachers and parents to develop an improvement plan.');