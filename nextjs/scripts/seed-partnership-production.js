/* eslint-disable no-console */
// Idempotent production baseline for Partnership + Brand Ownership.
// Safe to re-run: upserts permissions, the SecurX primary brand, and schema
// prerequisites are handled by db:setup:partnership.
//
//   npm run db:seed:partnership
//   npm run db:setup:partnership
//
// Does NOT create demo partners, test logins, or sample commissions.
// For QA/demo data use: npm run db:demo:partnership

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const {
  prisma,
  ensurePartnershipPermissions,
  seedSecurXProductionBrand,
  disconnect,
} = require("./partnership-seed-shared");

async function main() {
  console.log("Seeding Partnership + Brand Ownership (production baseline)...");

  await ensurePartnershipPermissions();
  console.log("  Permissions: partner portal + manage-partnerships + manage-brand-ownership");

  const superadmin = await prisma.user.findFirst({
    where: { email: "superadmin@example.com" },
    select: { id: true },
  });

  await seedSecurXProductionBrand(superadmin?.id ?? null);
  console.log("  Brand: SecurX (100% SecurX Holdings, primary)");

  console.log("\nDone. Production partnership baseline is ready.");
  console.log("  Superadmin menu: Partnerships → Brands, Partners, …");
  console.log("  Optional demo data: npm run db:demo:partnership");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(disconnect);
