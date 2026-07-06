-- Use when P3009 blocks `prisma migrate deploy` and `migrate resolve` is not enough.
-- Run against the same database as DATABASE_URL (e.g. psql paperflight_db -f this file).
--
-- Option A — remove only the stuck failed row, then run: npx prisma migrate deploy
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20240420120000_crm_lead_first_last_name';

-- Option B — if Option A leaves Prisma confused, inspect all migration rows:
-- SELECT migration_name, success, finished_at, started_at FROM "_prisma_migrations" ORDER BY started_at;
