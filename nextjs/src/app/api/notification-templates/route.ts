import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { pgTableExists } from "@/lib/db/pg-table-exists";

/** Maps DB module name -> activated-package key (lowercase). General = always visible. */
const MODULE_TO_PACKAGE: Record<string, string | null> = {
  general:     null,          // always visible
  Lead:        "lead",        // CRM addon
  Appointment: "appointment",
  HRM:         "hrm",
  Recruitment: "recruitment",
};

function getAccessibleModules(role: string, activatedPackages: string[]): string[] | null {
  if (role === "superadmin") return null; // null = no filter (all modules)
  // Company admin: general always included, plus any activated addon modules
  const pkgs = new Set(activatedPackages.map((p) => p.toLowerCase()));
  return Object.entries(MODULE_TO_PACKAGE)
    .filter(([, pkg]) => pkg === null || pkgs.has(pkg))
    .map(([mod]) => mod);
}

function checkAuth(req: NextRequest, perm: string): { denied: NextResponse } | { role: string; activatedPackages: string[] } {
  const role = req.cookies.get("pf_role")?.value ?? "";
  if (role !== "superadmin" && role !== "company") {
    return { denied: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) };
  }
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, perm) && !perms.includes("*")) {
    return { denied: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) };
  }
  const activatedPackages = JSON.parse(req.cookies.get("pf_activated_packages")?.value ?? "[]") as string[];
  return { role, activatedPackages };
}

export async function GET(req: NextRequest) {
  const auth = checkAuth(req, "manage-notification-templates");
  if ("denied" in auth) return auth.denied;
  const { role, activatedPackages } = auth;

  // Notifications table can be absent on fresh DBs; return empty state instead of 500.
  const hasNotifications = await pgTableExists("notifications");
  if (!hasNotifications) {
    return NextResponse.json({
      ok: true,
      allTypes: [],
      activeType: "",
      notificationTemplates: { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 },
    });
  }

  const allowedModules = getAccessibleModules(role, activatedPackages);

  const allTypesRaw = await prisma.notification.findMany({
    distinct: ["type"],
    select: { type: true },
    orderBy: { type: "asc" },
    ...(allowedModules ? { where: { module: { in: allowedModules } } } : {}),
  });
  const allTypes = allTypesRaw.map((r) => r.type ?? "").filter(Boolean);

  const requestedType = req.nextUrl.searchParams.get("type") || "";
  const activeType = requestedType || allTypes[0] || "";
  const action = req.nextUrl.searchParams.get("action") || "";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1") || 1);
  const perPage = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("per_page") || "10") || 10));
  const sort = (req.nextUrl.searchParams.get("sort") || "").trim();
  const direction = (req.nextUrl.searchParams.get("direction") || "asc") === "desc" ? "desc" : "asc";

  const baseWhere: any = allowedModules ? { module: { in: allowedModules } } : {};
  const where = activeType
    ? { ...baseWhere, type: activeType, ...(action ? { action: { contains: action, mode: "insensitive" as const } } : {}) }
    : { ...baseWhere, type: "__none__" };

  const orderBy =
    sort === "action"
      ? ({ action: direction } as const)
      : sort === "module"
        ? ({ module: direction } as const)
        : ({ id: "asc" } as const);

  const total = activeType ? await prisma.notification.count({ where }) : 0;
  const skip = (page - 1) * perPage;
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  const notificationTemplates =
    activeType && total > 0
      ? await prisma.notification.findMany({
          where,
          orderBy,
          select: { id: true, type: true, action: true, module: true },
          skip,
          take: perPage,
        })
      : [];

  const from = total === 0 ? 0 : skip + 1;
  const to = total === 0 ? 0 : Math.min(total, skip + notificationTemplates.length);

  return NextResponse.json({
    ok: true,
    allTypes,
    activeType,
    notificationTemplates: {
      data: notificationTemplates.map((n) => ({
        id: n.id.toString(),
        type: n.type ?? "",
        action: n.action ?? "",
        module: n.module ?? "",
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
