
-- Fee structures: defines how much each class/level should pay
CREATE TABLE public.fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_name text NOT NULL,
  stream text,
  academic_year text NOT NULL,
  term text,
  billing_type text NOT NULL DEFAULT 'per_term' CHECK (billing_type IN ('per_term', 'per_year', 'monthly')),
  amount numeric NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fee structures" ON public.fee_structures FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Authenticated users can view fee structures" ON public.fee_structures FOR SELECT TO authenticated USING (true);

-- Student bursaries: bursary/scholarship config per student
CREATE TABLE public.student_bursaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  bursary_type text NOT NULL DEFAULT 'none' CHECK (bursary_type IN ('none', 'full', 'half', 'custom')),
  custom_percentage numeric DEFAULT 0 CHECK (custom_percentage >= 0 AND custom_percentage <= 100),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id)
);

ALTER TABLE public.student_bursaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage student bursaries" ON public.student_bursaries FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Authenticated users can view student bursaries" ON public.student_bursaries FOR SELECT TO authenticated USING (true);

-- Student payments: records all payments
CREATE TABLE public.student_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  term text,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank', 'mobile_money', 'online')),
  reference_number text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  recorded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.student_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage student payments" ON public.student_payments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Authenticated users can view student payments" ON public.student_payments FOR SELECT TO authenticated USING (true);

-- Fee audit log: tracks all financial changes
CREATE TABLE public.fee_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  description text NOT NULL,
  old_value text,
  new_value text,
  performed_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.fee_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fee audit log" ON public.fee_audit_log FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can view fee audit log" ON public.fee_audit_log FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));

-- Triggers for updated_at
CREATE TRIGGER update_fee_structures_updated_at BEFORE UPDATE ON public.fee_structures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_bursaries_updated_at BEFORE UPDATE ON public.student_bursaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_payments_updated_at BEFORE UPDATE ON public.student_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
