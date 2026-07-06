-- Fix Prisma P2022: column model_has_roles.model_type does not exist (MySQL / MariaDB)
--
-- Same root cause as fix-model-has-roles-model-type-postgres.sql: table missing model_type.
--
-- Backup first, then run (example):
--   mysql -h HOST -u USER -p DATABASE < fix-model-has-roles-model-type-mysql.sql
--
-- If ADD COLUMN fails with "Duplicate column", skip to PRIMARY KEY section only if needed.

ALTER TABLE model_has_roles
  ADD COLUMN model_type VARCHAR(255) NULL COMMENT 'Spatie morph type, e.g. App\\Models\\User' AFTER model_id;

UPDATE model_has_roles
SET model_type = 'App\\Models\\User'
WHERE model_type IS NULL OR TRIM(model_type) = '';

ALTER TABLE model_has_roles
  MODIFY model_type VARCHAR(255) NOT NULL;

ALTER TABLE model_has_roles DROP PRIMARY KEY;

ALTER TABLE model_has_roles
  ADD PRIMARY KEY (role_id, model_id, model_type);

CREATE INDEX model_has_roles_model_id_model_type_index
  ON model_has_roles (model_id, model_type);
