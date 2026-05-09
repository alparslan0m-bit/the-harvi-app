-- Adds missing order_index columns to the hierarchy tables
BEGIN;

ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS question_order INTEGER DEFAULT 0;

COMMIT;
