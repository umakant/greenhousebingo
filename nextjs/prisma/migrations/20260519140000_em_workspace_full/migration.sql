CREATE TABLE IF NOT EXISTS "em_workspace_context" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "jsr_number" TEXT,
    "aar_start_date" DATE,
    "aar_end_date" DATE,
    "matter_number" TEXT,
    "requesting_director" TEXT,
    "client_name" TEXT,
    "requesting_department" TEXT,
    "receiving_department" TEXT,
    "aar_location" TEXT,
    "billing_poc_name" TEXT,
    "billing_poc_email" TEXT,
    "client_poc_name" TEXT,
    "legacy_client_id" TEXT,
    "d365_client_id" TEXT,
    "operation_start_date" DATE,
    "operation_end_date" DATE,
    "tsheets_based" BOOLEAN NOT NULL DEFAULT false,
    "aar_required" BOOLEAN NOT NULL DEFAULT false,
    "cost_transfer_mode" TEXT NOT NULL DEFAULT 'default',
    "cost_transfer_default_rate" DECIMAL(12,2) NOT NULL DEFAULT 60,
    "cost_transfer_custom_rate" DECIMAL(12,2),
    "secondary_matter_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "em_workspace_context_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "em_workspace_context_organization_id_key"
    ON "em_workspace_context"("organization_id");

CREATE TABLE IF NOT EXISTS "em_time_entries" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "vendor_name" TEXT,
    "service_line" TEXT,
    "clock_in_date" DATE NOT NULL,
    "clock_in_time" TEXT,
    "clock_out_time" TEXT,
    "duration_hours" DECIMAL(8,2),
    "billable" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "em_time_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "em_time_entries_organization_id_clock_in_date_idx"
    ON "em_time_entries"("organization_id", "clock_in_date");

CREATE TABLE IF NOT EXISTS "em_cost_adjustments" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "details" TEXT NOT NULL,
    "attachment_url" TEXT,
    "amount" DECIMAL(14,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "em_cost_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "em_cost_adjustments_organization_id_idx"
    ON "em_cost_adjustments"("organization_id");

CREATE TABLE IF NOT EXISTS "em_workspace_documents" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploaded_by_user_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "em_workspace_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "em_workspace_documents_organization_id_created_at_idx"
    ON "em_workspace_documents"("organization_id", "created_at");

DO $$
BEGIN
  ALTER TABLE "em_workspace_context" ADD CONSTRAINT "em_workspace_context_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER TABLE "em_time_entries" ADD CONSTRAINT "em_time_entries_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER TABLE "em_cost_adjustments" ADD CONSTRAINT "em_cost_adjustments_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER TABLE "em_workspace_documents" ADD CONSTRAINT "em_workspace_documents_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER TABLE "em_workspace_documents" ADD CONSTRAINT "em_workspace_documents_uploaded_by_user_id_fkey"
    FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
