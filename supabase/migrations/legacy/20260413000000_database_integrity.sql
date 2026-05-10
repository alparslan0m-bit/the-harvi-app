-- [Database Integrity] — O(1) Time complexity per insert, O(N) Space constraint indexing
-- Why: Native PostgreSQL constraints ensure invalid links or duplicate structural nodes
-- are rejected instantly at the database layer (Zero runtime latency overhead in the Node API).

-- 1. Strictly bound parent-child relationships (No Orphaned Waste Data)
ALTER TABLE lectures ALTER COLUMN subject_id SET NOT NULL;
ALTER TABLE subjects ALTER COLUMN module_id SET NOT NULL;
ALTER TABLE modules ALTER COLUMN year_id SET NOT NULL;

-- 2. Scoped uniqueness checks (No duplication of identical content when linking external apps)
-- Note: 'external_id' isn't sufficient security if another app injects duplicates with different ids.

-- Ensure only one Year can exist per name (e.g. only one "Year 1")
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_year_name') THEN
    ALTER TABLE years ADD CONSTRAINT unique_year_name UNIQUE (name);
  END IF;
END $$;

-- Ensure a specific Module name only exists once per Year
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_module_per_year') THEN
    ALTER TABLE modules ADD CONSTRAINT unique_module_per_year UNIQUE (name, year_id);
  END IF;
END $$;

-- Ensure a specific Subject name only exists once per Module
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_subject_per_module') THEN
    ALTER TABLE subjects ADD CONSTRAINT unique_subject_per_module UNIQUE (name, module_id);
  END IF;
END $$;

-- Ensure a specific Lecture name only exists once per Subject
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_lecture_per_subject') THEN
    ALTER TABLE lectures ADD CONSTRAINT unique_lecture_per_subject UNIQUE (name, subject_id);
  END IF;
END $$;
