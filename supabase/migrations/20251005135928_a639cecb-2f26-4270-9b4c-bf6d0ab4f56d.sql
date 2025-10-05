-- Create storage buckets for school logos and student photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('school-logos', 'school-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('student-photos', 'student-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);

-- Create storage policies for school logos
CREATE POLICY "Anyone can view school logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-logos');

CREATE POLICY "Admins can upload school logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'school-logos' 
  AND has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Admins can update school logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'school-logos' 
  AND has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Admins can delete school logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'school-logos' 
  AND has_role(auth.uid(), 'admin'::user_role)
);

-- Create storage policies for student photos
CREATE POLICY "Authenticated users can view student photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-photos');

CREATE POLICY "Admins can upload student photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'student-photos' 
  AND has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Admins can update student photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'student-photos' 
  AND has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Admins can delete student photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'student-photos' 
  AND has_role(auth.uid(), 'admin'::user_role)
);