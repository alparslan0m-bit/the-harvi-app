-- 20260501000004_indexes.sql
BEGIN;

-- Used in check_content_access: free_subjects lookup
CREATE INDEX IF NOT EXISTS idx_free_subjects_subject
    ON public.free_subjects(subject_id);

-- Used in check_content_access: free_modules lookup via subjects→lectures
CREATE INDEX IF NOT EXISTS idx_free_modules_module
    ON public.free_modules(module_id);

-- Used in check_content_access: purchases lookup
CREATE INDEX IF NOT EXISTS idx_purchases_user_module_status
    ON public.purchases(user_id, module_id, status)
    WHERE status = 'active';   -- Partial index — only active rows indexed

-- Used in check_content_access: lecture → subject join
CREATE INDEX IF NOT EXISTS idx_lectures_subject_id
    ON public.lectures(subject_id);

-- Used in check_content_access: subject → module join
CREATE INDEX IF NOT EXISTS idx_subjects_module_id
    ON public.subjects(module_id);

-- Used in purchases self-read policy
CREATE INDEX IF NOT EXISTS idx_purchases_user_id
    ON public.purchases(user_id);

-- Used in module_prices read
CREATE INDEX IF NOT EXISTS idx_module_prices_active
    ON public.module_prices(module_id)
    WHERE is_active = true;

-- Used in get_module_access_map
CREATE INDEX IF NOT EXISTS idx_purchases_user_status
    ON public.purchases(user_id, status)
    WHERE status = 'active';

COMMIT;
