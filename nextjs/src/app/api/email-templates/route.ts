import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { pgTableExists } from "@/lib/db/pg-table-exists";

function requirePerm(req: NextRequest, perm: string) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, perm) && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const blocked = requirePerm(req, "manage-email-templates");
  if (blocked) return blocked;

  // If CMS tables haven't been ensured yet, return empty list instead of 500.
  const hasEmailTemplates = await pgTableExists("email_templates");
  if (!hasEmailTemplates) {
    return NextResponse.json({
      ok: true,
      allModules: [],
      emailTemplates: { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 },
    });
  }

  const name = req.nextUrl.searchParams.get("name") || "";
  const moduleName = req.nextUrl.searchParams.get("module_name") || "";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1") || 1);
  const perPage = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("per_page") || "10") || 10));
  const sort = (req.nextUrl.searchParams.get("sort") || "").trim();
  const direction = (req.nextUrl.searchParams.get("direction") || "asc") === "desc" ? "desc" : "asc";

  const where = {
    ...(name ? { name: { contains: name, mode: "insensitive" as const } } : null),
    ...(moduleName ? { moduleName } : null),
  } as any;

  const orderBy =
    sort === "name"
      ? ({ name: direction } as const)
      : sort === "module_name"
        ? ({ moduleName: direction } as const)
        : ({ id: "desc" } as const);

  const total = await prisma.emailTemplate.count({ where }).catch(() => 0);
  const skip = (page - 1) * perPage;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const take = perPage;

  const emailTemplates = await prisma.emailTemplate
    .findMany({
    where,
    orderBy,
    select: { id: true, name: true, from: true, moduleName: true },
    skip,
    take,
    })
    .catch(() => []);

  const allModulesRaw = await prisma.emailTemplate
    .findMany({
    distinct: ["moduleName"],
    select: { moduleName: true },
    where: { moduleName: { not: null } },
  })
    .catch(() => []);
  const allModules = allModulesRaw.map((r) => r.moduleName!).filter(Boolean).sort();

  const from = total === 0 ? 0 : skip + 1;
  const to = total === 0 ? 0 : Math.min(total, skip + emailTemplates.length);

  return NextResponse.json({
    ok: true,
    allModules,
    emailTemplates: {
      data: emailTemplates.map((t) => ({
        id: t.id.toString(),
        name: t.name ?? "",
        from: t.from ?? "",
        moduleName: t.moduleName ?? "",
      })),
      current_page: page,
      last_page: lastPage,
      per_page: perPage,
      total,
      from,
      to,
    },
  });
}

