-- =============================================================================
-- get_user_stats_overview: single RPC returning weekly activity, subject mastery,
-- and recent results for the authenticated user.
-- Replaces the unlimited quiz_results fetch with server-side aggregation.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_stats_overview(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result JSON;
  week_start DATE;
BEGIN
  -- Auth guard: only the user themselves can call this
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Start of the current week (Saturday)
  week_start := date_trunc('week', CURRENT_DATE + INTERVAL '2 days')::DATE - INTERVAL '2 days';

  SELECT json_build_object(
    'weekly_activity', (
      SELECT COALESCE(json_agg(row_to_json(wa) ORDER BY wa.dow), '[]'::JSON)
      FROM (
        SELECT
          EXTRACT(DOW FROM created_at)::INTEGER AS dow,
          COUNT(*)::INTEGER AS count
        FROM public.quiz_results
        WHERE user_id = p_user_id
          AND created_at >= week_start
        GROUP BY 1
      ) wa
    ),
    'subject_mastery', (
      SELECT COALESCE(json_agg(row_to_json(lm) ORDER BY lm.mastery DESC), '[]'::JSON)
      FROM (
        SELECT
          l.name AS subject,
          ROUND(AVG(qr.score))::INTEGER AS mastery,
          COUNT(*)::INTEGER AS attempts
        FROM public.quiz_results qr
        JOIN public.lectures l ON l.id = qr.lecture_id
        WHERE qr.user_id = p_user_id
        GROUP BY qr.lecture_id, l.name
      ) lm
    ),
    'recent_results', (
      SELECT COALESCE(json_agg(row_to_json(rr)), '[]'::JSON)
      FROM (
        SELECT
          qr.id,
          qr.user_id,
          qr.lecture_id,
          l.name AS lecture_name,
          qr.score,
          qr.total_questions,
          qr.correct_answers,
          qr.created_at
        FROM public.quiz_results qr
        JOIN public.lectures l ON l.id = qr.lecture_id
        WHERE qr.user_id = p_user_id
        ORDER BY qr.created_at DESC
        LIMIT 10
      ) rr
    )
  ) INTO result;

  RETURN result;
END;
$$;
