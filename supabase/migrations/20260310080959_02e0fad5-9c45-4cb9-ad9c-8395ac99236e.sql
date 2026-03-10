
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS stamp_position_x numeric DEFAULT 85,
  ADD COLUMN IF NOT EXISTS stamp_position_y numeric DEFAULT 75,
  ADD COLUMN IF NOT EXISTS stamp_size numeric DEFAULT 120,
  ADD COLUMN IF NOT EXISTS stamp_opacity numeric DEFAULT 0.4;
