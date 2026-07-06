import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

function computePrefix(moduleName: string, moduleCode: string | null | undefined): string {
  const letters = moduleName.replace(/[^A-Za-z]/g, "").toUpperCase();
  let prefix = letters.slice(0, 2);
  if (prefix.length < 2 && moduleCode) prefix = String(moduleCode).slice(0, 2).toUpperCase();
  if (prefix.length < 2) prefix = "MD";
  return prefix;
}

export async function GET(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "manage-users")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const moduleIdRaw = url.searchParams.get("moduleId") ?? "";
  if (!moduleIdRaw) return NextResponse.json({ ok: false, message: "moduleId is required." }, { status: 400 });

  const moduleId = BigInt(moduleIdRaw);
  const mod = await prisma.businessModule.findFirst({
    where: { id: moduleId },
    select: { id: true, name: true, code: true },
  });
  if (!mod) return NextResponse.json({ ok: false, message: "Module not found." }, { status: 404 });

  // Laravel logic counts settings where key=businessModuleId and value=moduleId
  const count = await prisma.setting.count({
    where: { key: "businessModuleId", value: String(moduleIdRaw) },
  });
  const sequence = String(count + 1).padStart(4, "0");
  const year = String(new Date().getFullYear()).slice(-2);
  const prefix = computePrefix(mod.name, mod.code);

  const companyId = `${prefix}-${sequence}-CO-${year}`;
  return NextResponse.json({ ok: true, company_id: companyId });
}

