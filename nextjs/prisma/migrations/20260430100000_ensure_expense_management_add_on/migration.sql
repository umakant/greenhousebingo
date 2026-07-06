-- Register Expense Management in add_ons (Add-ons Manager + plan gating).
-- Idempotent: safe if instrumentation or API already inserted the row.

INSERT INTO "add_ons" ("module", "name", "monthly_price", "yearly_price", "image", "is_enable", "for_admin", "package_name", "version", "priority", "created_at")
SELECT
  'ExpenseManagement',
  'Expense Management',
  0,
  0,
  NULL,
  true,
  false,
  'expensemanagement',
  '1.0.0',
  0,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "add_ons" WHERE "module" = 'ExpenseManagement'
);
