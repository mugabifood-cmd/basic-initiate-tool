
-- Insert fee structure for S.1 class
INSERT INTO fee_structures (school_id, class_name, academic_year, term, amount, billing_type, description)
VALUES ('191fa1c5-a585-4013-9ade-273b920e8e2f', 'S.1', '2025', 'ONE', 500000, 'per_term', 'S.1 Term 1 fees')
ON CONFLICT DO NOTHING;

-- Insert payments for student Sesko
INSERT INTO student_payments (student_id, school_id, academic_year, term, amount, payment_method, payment_date, reference_number, notes)
VALUES 
  ('41b3bb00-b0bb-4e2b-a01a-cf829cd54fa6', '191fa1c5-a585-4013-9ade-273b920e8e2f', '2025', 'ONE', 200000, 'cash', '2025-02-15', 'PAY001', 'First payment'),
  ('41b3bb00-b0bb-4e2b-a01a-cf829cd54fa6', '191fa1c5-a585-4013-9ade-273b920e8e2f', '2025', 'ONE', 50000, 'bank', '2025-03-01', 'PAY002', 'Second payment');

-- Insert half bursary for the student
INSERT INTO student_bursaries (student_id, bursary_type, custom_percentage, notes)
VALUES ('41b3bb00-b0bb-4e2b-a01a-cf829cd54fa6', 'half', 0, 'Half bursary scholarship')
ON CONFLICT (student_id) DO UPDATE SET bursary_type = 'half', custom_percentage = 0, notes = 'Half bursary scholarship';
