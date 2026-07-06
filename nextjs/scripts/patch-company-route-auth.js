const fs = require("fs");
const path = require("path");

const authImport = `import {
  companyRouteForbidden,
  parseCompanyIdFromParam,
  requireSuperadminManageUsers,
  verifyCompanyTenant,
} from "@/lib/company-route-auth";`;

const oldAuthBlock =
  /import \{ getPermissionsFromCookieValue, hasPermission \} from "@\/lib\/authz";\s*\n\s*function forbidden\(\) \{\s*\n\s*return NextResponse\.json\(\{ error: "Forbidden" \}, \{ status: 403 \}\);\s*\n\}\s*\n\s*function requireSuperadminManageUsers\(req: NextRequest\) \{\s*\n\s*const role = req\.cookies\.get\("pf_role"\)\?\.value;\s*\n\s*if \(role !== "superadmin"\) return false;\s*\n\s*const perms = getPermissionsFromCookieValue\(req\.cookies\.get\("pf_permissions"\)\?\.value\);\s*\n\s*return hasPermission\(perms, "manage-users"\);\s*\n\}/g;

const oldLookup =
  /const \{ id \} = await params;\s*\n\s*const companyId = parseInt\(id, 10\);\s*\n\s*if \(Number\.isNaN\(companyId\)\)\s*\n\s*return NextResponse\.json\(\{ error: "Invalid company id" \}, \{ status: 400 \}\);\s*\n\s*const company = await prisma\.user\.findFirst\(\{\s*\n\s*where: \{ id: BigInt\(companyId\), type: \{ in: \["company", "company_admin"\] \} \},\s*\n\s*select: \{ id: true \},\s*\n\s*\}\);\s*\n\s*if \(!company\) \{\s*\n\s*return NextResponse\.json\(\{ error: "Company not found" \}, \{ status: 404 \}\);\s*\n\s*\}\s*\n\s*const tenantId = BigInt\(companyId\);/g;

const newLookup = `const { id } = await params;
  const companyId = parseCompanyIdFromParam(id);
  if (companyId == null) {
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });
  }

  const company = await verifyCompanyTenant(companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const tenantId = companyId;`;

const dir = path.join(__dirname, "..", "src", "app", "api", "companies");
const files = [];

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name === "route.ts") files.push(p);
  }
}

walk(dir);

let changed = 0;
for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes("getPermissionsFromCookieValue")) continue;
  const orig = src;
  src = src.replace(oldAuthBlock, authImport);
  src = src.replace(
    /if \(!requireSuperadminManageUsers\(req\)\) return forbidden\(\);/g,
    "if (!(await requireSuperadminManageUsers(req))) return companyRouteForbidden();",
  );
  src = src.replace(oldLookup, newLookup);
  if (src !== orig) {
    fs.writeFileSync(file, src);
    changed++;
    console.log("updated", path.relative(process.cwd(), file));
  }
}

console.log("done", changed);
