-- Expense Management: configurable categories per organization
CREATE TABLE IF NOT EXISTS "em_expense_categories" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "em_expense_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "em_expense_categories_organization_id_name_key"
    ON "em_expense_categories"("organization_id", "name");

CREATE INDEX IF NOT EXISTS "em_expense_categories_organization_id_sort_order_idx"
    ON "em_expense_categories"("organization_id", "sort_order");

ALTER TABLE "em_expense_categories"
    ADD CONSTRAINT "em_expense_categories_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
