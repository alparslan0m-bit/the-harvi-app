-- =============================================================
-- HARVI MAINTENANCE: Auto-Cleanup Old Data
-- 
-- STRATEGY: 
-- Keep data for 12 months (Rolling Window).
-- Delete anything older to respect 500MB Free Tier Limit.
-- 
-- SCHEDULE: Every Sunday at 3:00 AM (Low Traffic)
-- =============================================================

-- 1. Enable pg_cron (Required for scheduling)
-- NOTE: This might require Superuser permissions. If it fails, enable via Dashboard.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule the Cleanup Job
-- standard cron syntax: "0 3 * * 0" = At 03:00 on Sunday.
SELECT cron.schedule(
    'harvi-weekly-cleanup', -- usage name
    '0 3 * * 0',            -- schedule
    $$
    -- Transaction to ensure consistency
    BEGIN;
        -- ============================================================
        -- ⚠️ CRITICAL SAFETY WARNING ⚠️
        -- NEVER delete from 'subscriptions', 'payments', or 'users'.
        -- Those tables are small (1 row/user) and legally required.
        -- ============================================================

        -- A. Delete old Quiz Results (High Volume, Low Value)
        -- Only delete PRACTICE attempts. If you have "Exam" mode, maybe keep those?
        DELETE FROM public.quiz_results 
        WHERE created_at < NOW() - INTERVAL '1 year';

        -- B. Delete old Feedback (High Volume, Low Value)
        DELETE FROM public.feedback 
        WHERE created_at < NOW() - INTERVAL '1 year';
        
        -- C. (Future) Delete old Notification Logs if you have them
        -- DELETE FROM public.notifications WHERE created_at < NOW() - INTERVAL '3 months';

    COMMIT;
    $$
);

-- 3. Verify Job Created
-- Select * from cron.job;
