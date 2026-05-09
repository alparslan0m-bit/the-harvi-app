-- [Data Integrity] — O(1) Time complexity per insert, O(1) Space 
-- Why: Pushing deterministic slug generation directly to a Postgres Trigger ensures
-- zero-redundancy across different codebase areas (no repeated logic in Next.js Server Actions),
-- handles external CSV/API links perfectly, and definitively asserts NOT NULL guarantees.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create a pure utility function to automatically determine missing external_ids natively
CREATE OR REPLACE FUNCTION set_default_external_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.external_id IS NULL OR trim(NEW.external_id) = '' THEN
    IF TG_TABLE_NAME = 'years' THEN
      -- Style exact match: 'Year 6' -> 'year6'
      NEW.external_id := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '', 'g'));
    ELSE
      -- Style exact match: 'Anatomy of the heart' -> 'anatomy_of_the_heart'
      NEW.external_id := trim(both '_' from lower(regexp_replace(trim(NEW.name), '[^a-zA-Z0-9]+', '_', 'g')));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Bind the O(1) trigger to fire BEFORE INSERT or UPDATE to universally block nulls 
DROP TRIGGER IF EXISTS ensure_external_id_years ON years;
CREATE TRIGGER ensure_external_id_years BEFORE INSERT OR UPDATE ON years FOR EACH ROW EXECUTE FUNCTION set_default_external_id();

DROP TRIGGER IF EXISTS ensure_external_id_modules ON modules;
CREATE TRIGGER ensure_external_id_modules BEFORE INSERT OR UPDATE ON modules FOR EACH ROW EXECUTE FUNCTION set_default_external_id();

DROP TRIGGER IF EXISTS ensure_external_id_subjects ON subjects;
CREATE TRIGGER ensure_external_id_subjects BEFORE INSERT OR UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION set_default_external_id();

DROP TRIGGER IF EXISTS ensure_external_id_lectures ON lectures;
CREATE TRIGGER ensure_external_id_lectures BEFORE INSERT OR UPDATE ON lectures FOR EACH ROW EXECUTE FUNCTION set_default_external_id();

-- 3. Close the validation gap with definitive native checks
ALTER TABLE years ALTER COLUMN external_id SET NOT NULL;
ALTER TABLE modules ALTER COLUMN external_id SET NOT NULL;
ALTER TABLE subjects ALTER COLUMN external_id SET NOT NULL;
ALTER TABLE lectures ALTER COLUMN external_id SET NOT NULL;
