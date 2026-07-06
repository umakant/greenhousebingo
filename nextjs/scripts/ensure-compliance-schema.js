/* eslint-disable no-console */
/**
 * Ensures Compliance module tables exist (idempotent).
 * Usage: npm run db:ensure:compliance
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { Client } = require("pg");

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS compliance_frameworks (
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
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS compliance_frameworks_org_code ON compliance_frameworks(organization_id, code);`,
  `CREATE INDEX IF NOT EXISTS compliance_frameworks_org_status ON compliance_frameworks(organization_id, status);`,

  `CREATE TABLE IF NOT EXISTS compliance_controls (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    framework_id BIGINT NULL,
    control_code VARCHAR(64) NOT NULL,
    title VARCHAR(512) NOT NULL,
    description TEXT NULL,
    category VARCHAR(128) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'not_started',
    owner_user_id BIGINT NULL,
    due_date DATE NULL,
    last_reviewed_at TIMESTAMP(3) NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NULL
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_controls_org_status ON compliance_controls(organization_id, status);`,
  `CREATE INDEX IF NOT EXISTS compliance_controls_framework ON compliance_controls(framework_id);`,

  `CREATE TABLE IF NOT EXISTS compliance_control_mappings (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    framework_id BIGINT NOT NULL,
    control_id BIGINT NOT NULL,
    mapped_control_code VARCHAR(64) NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS compliance_control_mappings_fw_ctrl ON compliance_control_mappings(framework_id, control_id);`,

  `CREATE TABLE IF NOT EXISTS compliance_evidence (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    control_id BIGINT NULL,
    title VARCHAR(512) NOT NULL,
    evidence_type VARCHAR(64) NOT NULL DEFAULT 'document',
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    source_module VARCHAR(64) NULL,
    source_record_id BIGINT NULL,
    collected_at TIMESTAMP(3) NULL,
    expires_at TIMESTAMP(3) NULL,
    file_url VARCHAR(2048) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NULL
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_evidence_org_status ON compliance_evidence(organization_id, status);`,

  `CREATE TABLE IF NOT EXISTS compliance_policies (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    title VARCHAR(512) NOT NULL,
    version VARCHAR(32) NOT NULL DEFAULT '1.0',
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    owner_user_id BIGINT NULL,
    published_at TIMESTAMP(3) NULL,
    review_due_at TIMESTAMP(3) NULL,
    content TEXT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NULL
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_policies_org_status ON compliance_policies(organization_id, status);`,

  `CREATE TABLE IF NOT EXISTS compliance_documents (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    title VARCHAR(512) NOT NULL,
    doc_type VARCHAR(64) NOT NULL DEFAULT 'general',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    source_module VARCHAR(64) NULL,
    source_record_id BIGINT NULL,
    file_url VARCHAR(2048) NULL,
    uploaded_by_id BIGINT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NULL
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_documents_org_status ON compliance_documents(organization_id, status);`,

  `CREATE TABLE IF NOT EXISTS compliance_monitors (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    monitor_type VARCHAR(64) NOT NULL DEFAULT 'automated',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    schedule VARCHAR(128) NULL,
    last_run_at TIMESTAMP(3) NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NULL
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_monitors_org_status ON compliance_monitors(organization_id, status);`,

  `CREATE TABLE IF NOT EXISTS compliance_monitor_results (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    monitor_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pass',
    summary TEXT NULL,
    details JSONB NULL,
    ran_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_monitor_results_org ON compliance_monitor_results(organization_id, ran_at);`,

  `CREATE TABLE IF NOT EXISTS compliance_risks (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    title VARCHAR(512) NOT NULL,
    description TEXT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'medium',
    likelihood VARCHAR(32) NOT NULL DEFAULT 'possible',
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    owner_user_id BIGINT NULL,
    due_date DATE NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NULL
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_risks_org_status ON compliance_risks(organization_id, status);`,

  `CREATE TABLE IF NOT EXISTS compliance_vendor_reviews (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    vendor_id BIGINT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    review_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    risk_tier VARCHAR(32) NOT NULL DEFAULT 'medium',
    due_date DATE NULL,
    completed_at TIMESTAMP(3) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NULL
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_vendor_reviews_org ON compliance_vendor_reviews(organization_id, review_status);`,

  `CREATE TABLE IF NOT EXISTS compliance_access_reviews (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    scope VARCHAR(255) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    due_date DATE NULL,
    completed_at TIMESTAMP(3) NULL,
    reviewer_user_id BIGINT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NULL
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_access_reviews_org ON compliance_access_reviews(organization_id, status);`,

  `CREATE TABLE IF NOT EXISTS compliance_vulnerabilities (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    title VARCHAR(512) NOT NULL,
    cve_id VARCHAR(64) NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'medium',
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    asset_name VARCHAR(255) NULL,
    discovered_at TIMESTAMP(3) NULL,
    remediated_at TIMESTAMP(3) NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NULL
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_vulnerabilities_org ON compliance_vulnerabilities(organization_id, status);`,

  `CREATE TABLE IF NOT EXISTS compliance_audits (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    framework_id BIGINT NULL,
    name VARCHAR(255) NOT NULL,
    audit_type VARCHAR(64) NOT NULL DEFAULT 'internal',
    status VARCHAR(32) NOT NULL DEFAULT 'planned',
    auditor_name VARCHAR(255) NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NULL
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_audits_org ON compliance_audits(organization_id, status);`,

  `CREATE TABLE IF NOT EXISTS compliance_tasks (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    title VARCHAR(512) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    priority VARCHAR(32) NOT NULL DEFAULT 'medium',
    due_date DATE NULL,
    assignee_user_id BIGINT NULL,
    entity_type VARCHAR(64) NULL,
    entity_id BIGINT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NULL
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_tasks_org ON compliance_tasks(organization_id, status);`,

  `CREATE TABLE IF NOT EXISTS compliance_integrations (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    provider VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'disconnected',
    last_sync_at TIMESTAMP(3) NULL,
    config JSONB NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS compliance_integrations_org_provider ON compliance_integrations(organization_id, provider);`,

  `CREATE TABLE IF NOT EXISTS compliance_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NULL,
    entity_id BIGINT NULL,
    actor_user_id BIGINT NULL,
    actor_name VARCHAR(255) NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_activity_logs_org ON compliance_activity_logs(organization_id, created_at);`,

  `CREATE TABLE IF NOT EXISTS compliance_notifications (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    title VARCHAR(512) NOT NULL,
    body TEXT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'info',
    link VARCHAR(512) NULL,
    read_at TIMESTAMP(3) NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_notifications_org ON compliance_notifications(organization_id, created_at);`,

  `CREATE TABLE IF NOT EXISTS compliance_trust_center (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL UNIQUE,
    published BOOLEAN NOT NULL DEFAULT false,
    public_slug VARCHAR(128) NULL,
    public_url VARCHAR(512) NULL,
    auditor_portal_enabled BOOLEAN NOT NULL DEFAULT false,
    active_auditors INT NOT NULL DEFAULT 0,
    sections JSONB NULL,
    last_updated_at TIMESTAMP(3) NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NULL
  );`,

  `CREATE TABLE IF NOT EXISTS compliance_comments (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id BIGINT NOT NULL,
    body TEXT NOT NULL,
    author_user_id BIGINT NULL,
    author_name VARCHAR(255) NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_comments_entity ON compliance_comments(organization_id, entity_type, entity_id);`,

  `CREATE TABLE IF NOT EXISTS compliance_attachments (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id BIGINT NOT NULL,
    file_name VARCHAR(512) NOT NULL,
    file_url VARCHAR(2048) NOT NULL,
    mime_type VARCHAR(128) NULL,
    uploaded_by_id BIGINT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_attachments_entity ON compliance_attachments(organization_id, entity_type, entity_id);`,

  `CREATE TABLE IF NOT EXISTS compliance_policy_acknowledgements (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    policy_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    version VARCHAR(32) NOT NULL DEFAULT '1.0',
    acknowledged_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS compliance_policy_ack_unique ON compliance_policy_acknowledgements(policy_id, user_id, version);`,
  `CREATE INDEX IF NOT EXISTS compliance_policy_ack_org ON compliance_policy_acknowledgements(organization_id);`,

  `CREATE TABLE IF NOT EXISTS compliance_control_remediations (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    control_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    summary TEXT NULL,
    created_by BIGINT NULL,
    resolved_at TIMESTAMP(3) NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_control_remediations_org ON compliance_control_remediations(organization_id, control_id);`,

  `CREATE TABLE IF NOT EXISTS compliance_auditor_invites (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    audit_id BIGINT NULL,
    token VARCHAR(128) NOT NULL UNIQUE,
    auditor_name VARCHAR(255) NOT NULL,
    auditor_email VARCHAR(255) NULL,
    expires_at TIMESTAMP(3) NULL,
    revoked_at TIMESTAMP(3) NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS compliance_auditor_invites_org ON compliance_auditor_invites(organization_id);`,
  `CREATE INDEX IF NOT EXISTS compliance_auditor_invites_audit ON compliance_auditor_invites(audit_id);`,
];

const ALTER_STATEMENTS = [
  `ALTER TABLE compliance_frameworks ADD COLUMN IF NOT EXISTS owner_user_id BIGINT NULL;`,
  `ALTER TABLE compliance_frameworks ADD COLUMN IF NOT EXISTS icon_url VARCHAR(2048) NULL;`,
  `ALTER TABLE compliance_controls ADD COLUMN IF NOT EXISTS test_schedule VARCHAR(128) NULL;`,
  `ALTER TABLE compliance_controls ADD COLUMN IF NOT EXISTS next_test_at TIMESTAMP(3) NULL;`,
  `ALTER TABLE compliance_controls ADD COLUMN IF NOT EXISTS evidence_required BOOLEAN NOT NULL DEFAULT true;`,
  `ALTER TABLE compliance_controls ADD COLUMN IF NOT EXISTS relations JSONB NULL;`,
  `ALTER TABLE compliance_evidence ADD COLUMN IF NOT EXISTS auditor_visible BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE compliance_evidence ADD COLUMN IF NOT EXISTS approved_by BIGINT NULL;`,
  `ALTER TABLE compliance_evidence ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP(3) NULL;`,
  `ALTER TABLE compliance_evidence ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP(3) NULL;`,
  `ALTER TABLE compliance_evidence ADD COLUMN IF NOT EXISTS requested_by BIGINT NULL;`,
  `ALTER TABLE compliance_policies ADD COLUMN IF NOT EXISTS approved_by BIGINT NULL;`,
  `ALTER TABLE compliance_policies ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP(3) NULL;`,
  `ALTER TABLE compliance_policies ADD COLUMN IF NOT EXISTS acknowledgement_required BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE compliance_documents ADD COLUMN IF NOT EXISTS version VARCHAR(32) NOT NULL DEFAULT '1.0';`,
  `ALTER TABLE compliance_documents ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP(3) NULL;`,
  `ALTER TABLE compliance_documents ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP(3) NULL;`,
  `ALTER TABLE compliance_documents ADD COLUMN IF NOT EXISTS auditor_visible BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE compliance_documents ADD COLUMN IF NOT EXISTS version_notes TEXT NULL;`,
  `ALTER TABLE compliance_monitors ADD COLUMN IF NOT EXISTS category VARCHAR(64) NULL;`,
  `ALTER TABLE compliance_monitors ADD COLUMN IF NOT EXISTS owner_user_id BIGINT NULL;`,
  `ALTER TABLE compliance_monitors ADD COLUMN IF NOT EXISTS sla_hours INT NULL;`,
  `ALTER TABLE compliance_monitors ADD COLUMN IF NOT EXISTS description TEXT NULL;`,
  `ALTER TABLE compliance_monitors ADD COLUMN IF NOT EXISTS remediation_status VARCHAR(32) NULL;`,
  `ALTER TABLE compliance_risks ADD COLUMN IF NOT EXISTS metadata JSONB NULL;`,
  `ALTER TABLE compliance_risks ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP(3) NULL;`,
  `ALTER TABLE compliance_vendor_reviews ADD COLUMN IF NOT EXISTS metadata JSONB NULL;`,
  `ALTER TABLE compliance_access_reviews ADD COLUMN IF NOT EXISTS metadata JSONB NULL;`,
  `ALTER TABLE compliance_vulnerabilities ADD COLUMN IF NOT EXISTS metadata JSONB NULL;`,
  `ALTER TABLE compliance_audits ADD COLUMN IF NOT EXISTS metadata JSONB NULL;`,
];

async function main() {
  const pg = process.env.DATABASE_URL
    ? new Client({ connectionString: process.env.DATABASE_URL })
    : new Client({
        host: process.env.PF_PG_HOST,
        port: process.env.PF_PG_PORT ? Number(process.env.PF_PG_PORT) : 5432,
        database: process.env.PF_PG_DATABASE,
        user: process.env.PF_PG_USER,
        password: process.env.PF_PG_PASSWORD,
      });

  await pg.connect();
  try {
    console.log("Ensuring Compliance schema…");
    for (const sql of STATEMENTS) {
      await pg.query(sql);
    }
    for (const sql of ALTER_STATEMENTS) {
      await pg.query(sql);
    }
    console.log("Compliance schema OK.");
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
