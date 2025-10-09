-- Create grade_boundaries table
CREATE TABLE public.grade_boundaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grade TEXT NOT NULL UNIQUE,
  min_score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_score_range CHECK (min_score >= 0 AND max_score <= 100 AND min_score < max_score)
);

-- Enable RLS
ALTER TABLE public.grade_boundaries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage grade boundaries"
  ON public.grade_boundaries
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Authenticated users can view grade boundaries"
  ON public.grade_boundaries
  FOR SELECT
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_grade_boundaries_updated_at
  BEFORE UPDATE ON public.grade_boundaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default grade boundaries
INSERT INTO public.grade_boundaries (grade, min_score, max_score) VALUES
  ('A', 90, 100),
  ('B', 80, 89),
  ('C', 70, 79),
  ('D', 60, 69),
  ('E', 50, 59),
  ('F', 0, 49);