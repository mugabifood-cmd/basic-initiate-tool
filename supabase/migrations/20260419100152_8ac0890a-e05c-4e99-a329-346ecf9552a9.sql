
-- Helper function to check if user is admin of a given school (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_is_school_admin(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profile_schools ps
    JOIN public.profiles p ON p.id = ps.profile_id
    WHERE p.user_id = _user_id
      AND ps.school_id = _school_id
      AND ps.role = 'admin'::user_role
  )
$$;

-- Drop the recursive policy and recreate using the helper
DROP POLICY IF EXISTS "Admins can manage school memberships" ON public.profile_schools;

CREATE POLICY "School admins can manage memberships"
ON public.profile_schools
FOR ALL
TO authenticated
USING (public.user_is_school_admin(auth.uid(), school_id))
WITH CHECK (public.user_is_school_admin(auth.uid(), school_id));
