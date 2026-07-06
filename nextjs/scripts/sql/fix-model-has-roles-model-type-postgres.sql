-- Fix Prisma P2022: column model_has_roles.model_type does not exist
--
-- Cause: Some databases were created with `migrate-minimal-mysql-to-postgres.js`, which
-- defined model_has_roles as (model_id, role_id) only. Prisma + Spatie expect
-- (role_id, model_id, model_type) with model_type = Laravel morph class name.
--
-- Symptom in production: `Invalid prisma.modelHasRole.findMany() invocation` /
-- `The column model_has_roles.model_type does not exist in the current database`.
--
-- Run on production Postgres (backup first):
--   psql "$DATABASE_URL" -f fix-model-has-roles-model-type-postgres.sql
--
-- If the primary key constraint is not named model_has_roles_pkey, find it:
--   SELECT conname FROM pg_constraint
--   WHERE conrelid = 'model_has_roles'::regclass AND contype = 'p';

BEGIN;

ALTER TABLE model_has_roles ADD COLUMN IF NOT EXISTS model_type VARCHAR(255);

UPDATE model_has_roles
SET model_type = 'App\Models\User'
WHERE model_type IS NULL OR TRIM(model_type) = '';

ALTER TABLE model_has_roles ALTER COLUMN model_type SET NOT NULL;

-- Drop whatever primary key exists (minimal migration used a different key shape).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'model_has_roles'::regclass AND contype = 'p'
  LOOP
    EXECUTE format('ALTER TABLE model_has_roles DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE model_has_roles
  ADD CONSTRAINT model_has_roles_pkey PRIMARY KEY (role_id, model_id, model_type);

CREATE INDEX IF NOT EXISTS model_has_roles_model_id_model_type_index
  ON model_has_roles (model_id, model_type);

COMMIT;
