-- =========================================================
-- Helper: check if a user belongs to the school that owns a class
-- =========================================================
CREATE OR REPLACE FUNCTION public.user_belongs_to_class(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.profile_schools ps ON ps.school_id = c.school_id
    JOIN public.profiles p ON p.id = ps.profile_id
    WHERE c.id = _class_id
      AND p.user_id = _user_id
  )
$$;

-- Helper: check if user shares a school with another profile
CREATE OR REPLACE FUNCTION public.user_shares_school_with_profile(_user_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profile_schools ps_self
    JOIN public.profiles p_self ON p_self.id = ps_self.profile_id
    JOIN public.profile_schools ps_other ON ps_other.school_id = ps_self.school_id
    WHERE p_self.user_id = _user_id
      AND ps_other.profile_id = _profile_id
  )
$$;

-- =========================================================
-- STUDENTS
-- =========================================================
DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view students" ON public.students;

CREATE POLICY "School members can view students"
ON public.students FOR SELECT TO authenticated
USING (public.user_belongs_to_school(auth.uid(), school_id));

CREATE POLICY "School admins can manage students"
ON public.students FOR ALL TO authenticated
USING (public.user_is_school_admin(auth.uid(), school_id))
WITH CHECK (public.user_is_school_admin(auth.uid(), school_id));

-- =========================================================
-- CLASSES
-- =========================================================
DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;
DROP POLICY IF EXISTS "Anyone can view classes" ON public.classes;

CREATE POLICY "School members can view classes"
ON public.classes FOR SELECT TO authenticated
USING (public.user_belongs_to_school(auth.uid(), school_id));

CREATE POLICY "School admins can manage classes"
ON public.classes FOR ALL TO authenticated
USING (public.user_is_school_admin(auth.uid(), school_id))
WITH CHECK (public.user_is_school_admin(auth.uid(), school_id));

-- =========================================================
-- SUBJECTS
-- =========================================================
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
DROP POLICY IF EXISTS "Anyone can view subjects" ON public.subjects;

CREATE POLICY "School members can view subjects"
ON public.subjects FOR SELECT TO authenticated
USING (public.user_belongs_to_school(auth.uid(), school_id));

CREATE POLICY "School admins can manage subjects"
ON public.subjects FOR ALL TO authenticated
USING (public.user_is_school_admin(auth.uid(), school_id))
WITH CHECK (public.user_is_school_admin(auth.uid(), school_id));

-- =========================================================
-- REPORT_CARDS
-- =========================================================
DROP POLICY IF EXISTS "Admins can manage report cards" ON public.report_cards;
DROP POLICY IF EXISTS "Authenticated users can view report cards" ON public.report_cards;

CREATE POLICY "School members can view report cards"
ON public.report_cards FOR SELECT TO authenticated
USING (school_id IS NOT NULL AND public.user_belongs_to_school(auth.uid(), school_id));

CREATE POLICY "School admins can manage report cards"
ON public.report_cards FOR ALL TO authenticated
USING (school_id IS NOT NULL AND public.user_is_school_admin(auth.uid(), school_id))
WITH CHECK (school_id IS NOT NULL AND public.user_is_school_admin(auth.uid(), school_id));

-- =========================================================
-- TEACHER_ASSIGNMENTS
-- =========================================================
DROP POLICY IF EXISTS "Admins can manage all teacher assignments" ON public.teacher_assignments;
DROP POLICY IF EXISTS "Teachers can view their own assignments" ON public.teacher_assignments;

CREATE POLICY "Teachers can view own assignments"
ON public.teacher_assignments FOR SELECT TO authenticated
USING (
  auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = teacher_assignments.teacher_id)
);

CREATE POLICY "School admins can view assignments"
ON public.teacher_assignments FOR SELECT TO authenticated
USING (school_id IS NOT NULL AND public.user_is_school_admin(auth.uid(), school_id));

CREATE POLICY "School admins can manage assignments"
ON public.teacher_assignments FOR ALL TO authenticated
USING (school_id IS NOT NULL AND public.user_is_school_admin(auth.uid(), school_id))
WITH CHECK (school_id IS NOT NULL AND public.user_is_school_admin(auth.uid(), school_id));

-- =========================================================
-- SUBJECT_SUBMISSIONS
-- =========================================================
DROP POLICY IF EXISTS "Admins can manage all submissions" ON public.subject_submissions;

CREATE POLICY "School admins can manage submissions"
ON public.subject_submissions FOR ALL TO authenticated
USING (school_id IS NOT NULL AND public.user_is_school_admin(auth.uid(), school_id))
WITH CHECK (school_id IS NOT NULL AND public.user_is_school_admin(auth.uid(), school_id));

-- =========================================================
-- FEE_STRUCTURES
-- =========================================================
DROP POLICY IF EXISTS "Admins can manage fee structures" ON public.fee_structures;
DROP POLICY IF EXISTS "Authenticated users can view fee structures" ON public.fee_structures;

CREATE POLICY "School members can view fee structures"
ON public.fee_structures FOR SELECT TO authenticated
USING (public.user_belongs_to_school(auth.uid(), school_id));

CREATE POLICY "School admins can manage fee structures"
ON public.fee_structures FOR ALL TO authenticated
USING (public.user_is_school_admin(auth.uid(), school_id))
WITH CHECK (public.user_is_school_admin(auth.uid(), school_id));

-- =========================================================
-- STUDENT_PAYMENTS
-- =========================================================
DROP POLICY IF EXISTS "Admins can manage student payments" ON public.student_payments;
DROP POLICY IF EXISTS "Authenticated users can view student payments" ON public.student_payments;

CREATE POLICY "School members can view student payments"
ON public.student_payments FOR SELECT TO authenticated
USING (public.user_belongs_to_school(auth.uid(), school_id));

CREATE POLICY "School admins can manage student payments"
ON public.student_payments FOR ALL TO authenticated
USING (public.user_is_school_admin(auth.uid(), school_id))
WITH CHECK (public.user_is_school_admin(auth.uid(), school_id));

-- =========================================================
-- STUDENT_BURSARIES (scoped via student -> school)
-- =========================================================
DROP POLICY IF EXISTS "Admins can manage student bursaries" ON public.student_bursaries;
DROP POLICY IF EXISTS "Authenticated users can view student bursaries" ON public.student_bursaries;

CREATE POLICY "School members can view bursaries"
ON public.student_bursaries FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_bursaries.student_id
      AND public.user_belongs_to_school(auth.uid(), s.school_id)
  )
);

CREATE POLICY "School admins can manage bursaries"
ON public.student_bursaries FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_bursaries.student_id
      AND public.user_is_school_admin(auth.uid(), s.school_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_bursaries.student_id
      AND public.user_is_school_admin(auth.uid(), s.school_id)
  )
);

-- =========================================================
-- FEE_AUDIT_LOG (scoped via student -> school)
-- =========================================================
DROP POLICY IF EXISTS "Admins can manage fee audit log" ON public.fee_audit_log;
DROP POLICY IF EXISTS "Admins can view fee audit log" ON public.fee_audit_log;

CREATE POLICY "School admins can manage audit log"
ON public.fee_audit_log FOR ALL TO authenticated
USING (
  student_id IS NULL OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = fee_audit_log.student_id
      AND public.user_is_school_admin(auth.uid(), s.school_id)
  )
)
WITH CHECK (
  student_id IS NULL OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = fee_audit_log.student_id
      AND public.user_is_school_admin(auth.uid(), s.school_id)
  )
);

-- =========================================================
-- CLASS_STUDENTS (scoped via class -> school)
-- =========================================================
DROP POLICY IF EXISTS "Admins can manage class students" ON public.class_students;
DROP POLICY IF EXISTS "Authenticated users can view class students" ON public.class_students;

CREATE POLICY "School members can view class students"
ON public.class_students FOR SELECT TO authenticated
USING (public.user_belongs_to_class(auth.uid(), class_id));

CREATE POLICY "School admins can manage class students"
ON public.class_students FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_students.class_id
      AND public.user_is_school_admin(auth.uid(), c.school_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_students.class_id
      AND public.user_is_school_admin(auth.uid(), c.school_id)
  )
);

-- =========================================================
-- PROFILES — restrict admin visibility to shared-school members
-- =========================================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

CREATE POLICY "School admins can view shared profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::user_role)
  AND public.user_shares_school_with_profile(auth.uid(), id)
);

CREATE POLICY "School admins can update shared profiles"
ON public.profiles FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::user_role)
  AND public.user_shares_school_with_profile(auth.uid(), id)
);

CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));