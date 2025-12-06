-- Create signatures table for storing teacher and headteacher signatures
CREATE TABLE public.signatures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  signature_type text NOT NULL CHECK (signature_type IN ('class_teacher', 'headteacher')),
  signature_data text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(profile_id, signature_type)
);

-- For headteacher signature without a specific profile (global signature)
-- We'll use profile_id = NULL for headteacher when no specific headteacher profile exists
ALTER TABLE public.signatures ALTER COLUMN profile_id DROP NOT NULL;

-- Enable RLS
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- Teachers can view and manage their own signatures
CREATE POLICY "Users can view their own signatures"
ON public.signatures
FOR SELECT
USING (
  profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert their own signatures"
ON public.signatures
FOR INSERT
WITH CHECK (
  profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their own signatures"
ON public.signatures
FOR UPDATE
USING (
  profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete their own signatures"
ON public.signatures
FOR DELETE
USING (
  profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Admins can manage all signatures including headteacher signature
CREATE POLICY "Admins can manage all signatures"
ON public.signatures
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Everyone can view headteacher signature for report cards
CREATE POLICY "Anyone can view headteacher signature"
ON public.signatures
FOR SELECT
USING (signature_type = 'headteacher' AND profile_id IS NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_signatures_updated_at
BEFORE UPDATE ON public.signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();