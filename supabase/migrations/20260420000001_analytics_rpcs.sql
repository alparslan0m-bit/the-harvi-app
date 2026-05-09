-- ============================================================================
-- AUDIT FIX #4 & #5: Analytics & Activity RPCs
-- Moves heavy aggregation from JavaScript into PostgreSQL.
--
-- FIX #4: get_analytics_summary
--   Before: Fetches ALL quiz_results rows (60K+ at scale) → 6MB egress
--   After:  Single RPC returning ~200 bytes of aggregated JSON
--
-- FIX #5: get_recent_activity
--   Before: 5 parallel queries (1 per table) = 5 round-trips
--   After:  1 unified RPC with UNION ALL
-- ============================================================================

-- ============================================================================
-- FIX #4: get_analytics_summary
-- Returns KPIs, score distribution, daily activity, and top lectures
-- All computed inside PostgreSQL — zero client-side aggregation needed
-- ============================================================================

CREATE OR REPLACE FUNCTION get_analytics_summary(p_days INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  start_date TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
BEGIN
  WITH
    -- Core KPIs
    kpis AS (
      SELECT
        COUNT(*)::INTEGER AS total_quizzes_taken,
        COALESCE(ROUND(AVG(score))::INTEGER, 0) AS average_score,
        CASE
          WHEN COUNT(*) > 0
          THEN ROUND(COUNT(*) FILTER (WHERE score >= 60) * 100.0 / COUNT(*))::INTEGER
          ELSE 0
        END AS pass_rate,
        COUNT(DISTINCT user_id)::INTEGER AS active_students
      FROM quiz_results
      WHERE created_at >= start_date
    ),
    -- Score distribution buckets
    distribution AS (
      SELECT json_agg(json_build_object('range', range, 'count', cnt)) AS data
      FROM (
        SELECT
          CASE
            WHEN bucket = 0 THEN '0-20%'
            WHEN bucket = 1 THEN '20-40%'
            WHEN bucket = 2 THEN '40-60%'
            WHEN bucket = 3 THEN '60-80%'
            ELSE '80-100%'
          END AS range,
          COALESCE(cnt, 0)::INTEGER AS cnt
        FROM generate_series(0, 4) AS bucket
        LEFT JOIN (
          SELECT
            LEAST(FLOOR(score / 20.01)::INTEGER, 4) AS bucket,
            COUNT(*)::INTEGER AS cnt
          FROM quiz_results
          WHERE created_at >= start_date
          GROUP BY 1
        ) counts USING (bucket)
        ORDER BY bucket
      ) sub
    ),
    -- Daily activity timeline
    activity AS (
      SELECT json_agg(json_build_object('date', d::DATE, 'quizzes', COALESCE(cnt, 0)) ORDER BY d) AS data
      FROM generate_series(start_date::DATE, CURRENT_DATE, '1 day'::INTERVAL) AS d
      LEFT JOIN (
        SELECT created_at::DATE AS day, COUNT(*)::INTEGER AS cnt
        FROM quiz_results
        WHERE created_at >= start_date
        GROUP BY 1
      ) counts ON counts.day = d::DATE
    ),
    -- Top 5 lectures by attempts — REFACTORED: Now uses O(1) lookup table
    top_lectures AS (
      SELECT json_agg(json_build_object('name', COALESCE(l.name, 'Unknown Lecture'), 'attempts', ls.total_attempts) ORDER BY ls.total_attempts DESC) AS data
      FROM lecture_statistics ls
      LEFT JOIN lectures l ON l.id = ls.lecture_id
      ORDER BY ls.total_attempts DESC
      LIMIT 5
    )
  SELECT json_build_object(
    'totalQuizzesTaken', k.total_quizzes_taken,
    'averageScore', k.average_score,
    'passRate', k.pass_rate,
    'activeStudents', k.active_students,
    'scoreDistribution', COALESCE(d.data, '[]'::JSON),
    'quizActivity', COALESCE(a.data, '[]'::JSON),
    'topLectures', COALESCE(tl.data, '[]'::JSON)
  ) INTO result
  FROM kpis k, distribution d, activity a, top_lectures tl;

  RETURN result;
END;
$$;

-- ============================================================================
-- FIX #5: get_recent_activity
-- Returns the 10 most recently created entities across all content tables
-- Replaces 5 parallel Supabase queries with 1 UNION ALL
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recent_activity()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(row_data ORDER BY created_at DESC)
  INTO result
  FROM (
    (
      SELECT json_build_object(
        'id', id, 'type', 'Year',
        'entityName', name,
        'createdAt', created_at,
        'href', '/admin?tab=content&level=modules&yearId=' || id
      ) AS row_data, created_at
      FROM years ORDER BY created_at DESC LIMIT 3
    )
    UNION ALL
    (
      SELECT json_build_object(
        'id', id, 'type', 'Module',
        'entityName', name,
        'createdAt', created_at,
        'href', '/admin?tab=content&level=subjects&moduleId=' || id
      ), created_at
      FROM modules ORDER BY created_at DESC LIMIT 3
    )
    UNION ALL
    (
      SELECT json_build_object(
        'id', id, 'type', 'Subject',
        'entityName', name,
        'createdAt', created_at,
        'href', '/admin?tab=content&level=lectures&subjectId=' || id
      ), created_at
      FROM subjects ORDER BY created_at DESC LIMIT 3
    )
    UNION ALL
    (
      SELECT json_build_object(
        'id', id, 'type', 'Lecture',
        'entityName', name,
        'createdAt', created_at,
        'href', '/admin?tab=questions&id=' || id || '&name=' || COALESCE(name, 'Lecture')
      ), created_at
      FROM lectures ORDER BY created_at DESC LIMIT 3
    )
    UNION ALL
    (
      SELECT json_build_object(
        'id', id, 'type', 'Question',
        'entityName', CASE WHEN text IS NOT NULL AND text != '' THEN LEFT(text, 40) || '...' ELSE 'Unnamed Question' END,
        'createdAt', created_at,
        'href', '/admin?tab=questions&id=' || lecture_id || '&name=Lecture'
      ), created_at
      FROM questions ORDER BY created_at DESC LIMIT 3
    )
  ) unified
  LIMIT 10;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$;
