/* eslint-disable no-console */
/**
 * After inserting CRM rows with explicit bigint ids (e.g. demo seed), PostgreSQL serial
 * sequences are not advanced — the next DEFAULT id can collide → "Unique constraint failed on (id)".
 * Run this to align each sequence with MAX(id).
 *
 * Run: node scripts/sync-crm-postgres-sequences.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const SQL = `
DO $body$
DECLARE
  tbl text;
  seqname text;
  maxid bigint;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'crm_pipelines',
    'crm_pipeline_stages',
    'crm_leads',
    'crm_lead_activities',
    'crm_deals',
    'crm_deal_activities'
  ]
  LOOP
    seqname := pg_get_serial_sequence(format('public.%I', tbl), 'id');
    IF seqname IS NULL THEN
      RAISE NOTICE 'sync-crm-sequences: no serial for %', tbl;
      CONTINUE;
    END IF;
    EXECUTE format('SELECT COALESCE(MAX(id), 0)::bigint FROM public.%I', tbl) INTO maxid;
    IF maxid < 1 THEN
      -- Empty table: bigint sequences reject setval(…, 0); next id must be 1
      EXECUTE format('SELECT setval(%L, 1, false)', seqname);
    ELSE
      EXECUTE format('SELECT setval(%L, %s, true)', seqname, maxid);
    END IF;
    RAISE NOTICE 'sync-crm-sequences: % → max id %', tbl, maxid;
  END LOOP;
END
$body$;
`;

/** @param {import("@prisma/client").PrismaClient} prisma */
async function syncCrmPostgresSequences(prisma) {
  await prisma.$executeRawUnsafe(SQL);
}

module.exports = { syncCrmPostgresSequences, SQL };

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    console.log("Syncing CRM PostgreSQL id sequences…");
    await syncCrmPostgresSequences(prisma);
    console.log("Done.");
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
