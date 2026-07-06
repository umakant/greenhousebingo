/* eslint-disable no-console */
/**
 * CRM module smoke check (PostgreSQL):
 * 1. Syncs id sequences (fixes collisions after seeded explicit ids).
 * 2. Counts core CRM tables.
 * 3. Transactional create/delete of a lead (validates Prisma + sequences).
 *
 * UI coverage (manual): /crm/dashboard, /crm/leads, /crm/deals, /crm/setup,
 *   /crm/reports/leads, /crm/reports/deals — APIs: /api/crm/*
 *
 * Run: node scripts/crm-smoke-check.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { syncCrmPostgresSequences } = require("./sync-crm-postgres-sequences");

const API_ROUTES = [
  "GET  /api/crm/dashboard",
  "GET  /api/crm/leads",
  "POST /api/crm/leads",
  "GET  /api/crm/leads/[id]",
  "PUT  /api/crm/leads/[id]",
  "DELETE /api/crm/leads/[id]",
  "GET  /api/crm/deals",
  "POST /api/crm/deals",
  "GET  /api/crm/deals/[id]",
  "PUT  /api/crm/deals/[id]",
  "DELETE /api/crm/deals/[id]",
  "GET  /api/crm/pipelines",
  "GET  /api/crm/pipelines/[id]",
  "POST /api/crm/pipelines",
  "PUT  /api/crm/pipelines/[id]",
  "DELETE /api/crm/pipelines/[id]",
  "GET  /api/crm/reports/leads",
  "GET  /api/crm/reports/deals",
];

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  try {
    console.log("CRM — PostgreSQL sequence sync…");
    await syncCrmPostgresSequences(prisma);

    console.log("\nCRM — row counts…");
    const rows = [
      ["crm_pipelines", () => prisma.crmPipeline.count()],
      ["crm_pipeline_stages", () => prisma.crmPipelineStage.count()],
      ["crm_leads", () => prisma.crmLead.count()],
      ["crm_lead_activities", () => prisma.crmLeadActivity.count()],
      ["crm_deals", () => prisma.crmDeal.count()],
      ["crm_deal_activities", () => prisma.crmDealActivity.count()],
    ];
    for (const [name, fn] of rows) {
      const n = await fn();
      console.log(`  ${name.padEnd(22)} ${n}`);
    }

    const company = await prisma.user.findFirst({
      where: { type: "company" },
      select: { id: true },
    });
    if (company) {
      console.log("\nCRM — transactional lead create/delete (sequence sanity)…");
      try {
        const deleted = await prisma.$transaction(async (tx) => {
          const lead = await tx.crmLead.create({
            data: {
              firstName: "__smoke_delete_me__",
              lastName: null,
              status: "new",
              createdBy: company.id,
            },
          });
          await tx.crmLead.delete({ where: { id: lead.id } });
          return lead.id;
        });
        console.log(`  OK (temporary id ${deleted.toString()} created and removed).`);
      } catch (e) {
        const code = e && e.code;
        const msg = e && e.message ? String(e.message) : String(e);
        if (code === "P2022" || msg.includes("first_name") || msg.includes("column")) {
          console.log(
            "  Skipped: DB schema missing CRM first_name/last_name columns. Apply migrations: npx prisma migrate deploy"
          );
        } else {
          throw e;
        }
      }
    } else {
      console.log("\n  (Skipped transactional lead test — no company user in DB.)");
    }

    console.log("\nCRM — API route inventory (App Router)…");
    API_ROUTES.forEach((r) => console.log(`  ${r}`));

    console.log("\nCRM smoke check finished OK.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
