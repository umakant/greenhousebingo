-- Compliance Operating System module tables (idempotent patterns applied via ensure-compliance-schema.js)

CREATE TABLE IF NOT EXISTS compliance_frameworks (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  progress_pct INT NOT NULL DEFAULT 0,
  audit_ready_pct INT NOT NULL DEFAULT 0,
  enabled_at TIMESTAMP(3) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS compliance_frameworks_org_code ON compliance_frameworks(organization_id, code);
