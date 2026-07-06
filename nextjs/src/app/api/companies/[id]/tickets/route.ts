/**
 * Company helpdesk tickets — HelpdeskTicket rows created by the tenant.
 * Auth: superadmin + manage-users.
 */
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function requireSuperadminManageUsers(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return false;
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  return hasPermission(perms, "manage-users");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireSuperadminManageUsers(req)) return forbidden();

  const { id } = await params;
  const companyId = parseInt(id, 10);
  if (Number.isNaN(companyId))
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });

  const company = await prisma.user.findFirst({
    where: { id: BigInt(companyId), type: { in: ["company", "company_admin"] } },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const tenantId = BigInt(companyId);

  const rows = await prisma.helpdeskTicket.findMany({
    where: { createdBy: tenantId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      ticketId: true,
      title: true,
      status: true,
      priority: true,
      categoryId: true,
      createdAt: true,
    },
  });

  const catIds = [...new Set(rows.map((r) => r.categoryId).filter(Boolean))] as bigint[];
  const categories = catIds.length
    ? await prisma.helpdeskCategory.findMany({
        where: { id: { in: catIds } },
        select: { id: true, name: true },
      })
    : [];
  const catName = new Map(categories.map((c) => [c.id.toString(), c.name]));

  const tickets = rows.map((r) => ({
    id: r.id.toString(),
    ticket_id: r.ticketId,
    title: r.title,
    status: r.status,
    priority: r.priority,
    category_name: r.categoryId ? (catName.get(r.categoryId.toString()) ?? null) : null,
    created_at: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ tickets });
}
