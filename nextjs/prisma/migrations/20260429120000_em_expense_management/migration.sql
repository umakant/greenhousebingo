-- Expense Management add-on tables (idempotent for environments where tables were created manually)

CREATE TABLE IF NOT EXISTS "em_expense_reports" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "report_number" TEXT NOT NULL,
    "purpose" TEXT,
    "date_from" DATE,
    "date_to" DATE,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "rejection_note" TEXT,
    "created_by_user_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "em_expense_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "em_expense_lines" (
    "id" BIGSERIAL NOT NULL,
    "report_id" BIGINT,
    "organization_id" BIGINT NOT NULL,
    "expense_date" DATE NOT NULL,
    "category" TEXT NOT NULL,
    "merchant" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "amount_usd" DECIMAL(14,2),
    "project_id" TEXT,
    "receipt_attached" BOOLEAN NOT NULL DEFAULT false,
    "billable" TEXT,
    "mileage" DECIMAL(12,2),
    "rate_per_mile" DECIMAL(12,4),
    "internal_note" TEXT,
    "additional_info" TEXT,
    "department" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_by_user_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "em_expense_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "em_expense_reports_organization_id_report_number_key" ON "em_expense_reports"("organization_id", "report_number");
CREATE INDEX IF NOT EXISTS "em_expense_reports_organization_id_idx" ON "em_expense_reports"("organization_id");
CREATE INDEX IF NOT EXISTS "em_expense_reports_organization_id_status_idx" ON "em_expense_reports"("organization_id", "status");

CREATE INDEX IF NOT EXISTS "em_expense_lines_organization_id_idx" ON "em_expense_lines"("organization_id");
CREATE INDEX IF NOT EXISTS "em_expense_lines_report_id_idx" ON "em_expense_lines"("report_id");
CREATE INDEX IF NOT EXISTS "em_expense_lines_organization_id_expense_date_idx" ON "em_expense_lines"("organization_id", "expense_date");

DO $$
BEGIN
  ALTER TABLE "em_expense_reports" ADD CONSTRAINT "em_expense_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "em_expense_lines" ADD CONSTRAINT "em_expense_lines_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "em_expense_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "em_expense_lines" ADD CONSTRAINT "em_expense_lines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
