-- Allow anonymous users to view subjects for signup form
DROP POLICY IF EXISTS "Authenticated users can view subjects" ON public.subjects;
CREATE POLICY "Anyone can view subjects" 
ON public.subjects 
FOR SELECT 
USING (true);

-- Allow anonymous users to view classes for signup form  
DROP POLICY IF EXISTS "Authenticated users can view classes" ON public.classes;
CREATE POLICY "Anyone can view classes" 
ON public.classes 
FOR SELECT 
USING (true);