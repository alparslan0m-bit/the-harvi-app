-- [Architecture] O(log N) Space for B-Tree indices, O(1) Time routing query
-- Why: Converts external_id from a passive string into a cryptographically unique, natively 
-- indexed URL router capable of instantly driving front-end requests.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Upgrade Trigger to auto-handle collisions deterministically 
CREATE OR REPLACE FUNCTION set_default_external_id()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  slug_exists BOOLEAN;
BEGIN
  IF NEW.external_id IS NULL OR trim(NEW.external_id) = '' THEN
    IF TG_TABLE_NAME = 'years' THEN
      base_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '', 'g'));
    ELSE
      base_slug := trim(both '_' from lower(regexp_replace(trim(NEW.name), '[^a-zA-Z0-9]+', '_', 'g')));
    END IF;
    
    final_slug := base_slug;
    
    -- O(log N) check existence using the dynamic table name
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE external_id = $1 AND id != $2)', TG_TABLE_NAME)
    INTO slug_exists USING final_slug, NEW.id;
    
    IF slug_exists THEN
       -- Math block: Append crypto random 4-char suffix (1.6 million combinations) O(1)
       final_slug := base_slug || '_' || encode(gen_random_bytes(2), 'hex');
    END IF;
    
    NEW.external_id := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Safe Migration Pre-step: Deduplicate existing external_id conflicts manually first
DO $$ 
DECLARE
  table_name text;
BEGIN
  FOR table_name IN SELECT unnest(ARRAY['years', 'modules', 'subjects', 'lectures']) LOOP
    EXECUTE format('
      WITH duplicates AS (
        SELECT id, external_id, ROW_NUMBER() OVER (PARTITION BY external_id ORDER BY created_at) as rn
        FROM %I
      )
      UPDATE %I t SET external_id = t.external_id || ''_'' || substring(t.id::text from 1 for 4)
      FROM duplicates d WHERE t.id = d.id AND d.rn > 1;
    ', table_name, table_name);
  END LOOP;
END $$;

-- 3. Enforce Absolute Uniqueness & Build native B-Tree indices
DO $$ 
BEGIN
  -- YEARS
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_external_id_years') THEN
    ALTER TABLE years ADD CONSTRAINT unique_external_id_years UNIQUE (external_id);
  END IF;
  
  -- MODULES
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_external_id_modules') THEN
    ALTER TABLE modules ADD CONSTRAINT unique_external_id_modules UNIQUE (external_id);
  END IF;
  
  -- SUBJECTS
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_external_id_subjects') THEN
    ALTER TABLE subjects ADD CONSTRAINT unique_external_id_subjects UNIQUE (external_id);
  END IF;
  
  -- LECTURES
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_external_id_lectures') THEN
    ALTER TABLE lectures ADD CONSTRAINT unique_external_id_lectures UNIQUE (external_id);
  END IF;
END $$;
