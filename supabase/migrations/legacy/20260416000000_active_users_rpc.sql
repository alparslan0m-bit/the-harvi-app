-- Migration: Add RPC for O(1) Dashboard Active Users Computation
-- Resolves the O(N) memory footprint leak by pushing Set counting to the SQL engine

CREATE OR REPLACE FUNCTION get_active_users_today()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT user_id)::INTEGER
  FROM public.quiz_results
  WHERE created_at >= CURRENT_DATE;
$$;
