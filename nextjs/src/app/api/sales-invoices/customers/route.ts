import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { listSalesInvoiceCustomers } from "@/lib/sales-invoice-customers";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null; creatorId: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.creatorId ?? actor.id;
}

function canViewInvoices(perms: string[]) {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-sales-invoices") ||
    hasPermission(perms, "manage-any-sales-invoices") ||
    hasPermission(perms, "view-sales-invoices") ||
    hasPermission(perms, "create-sales-invoices")
  );
}

export async function GET(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (!canViewInvoices(perms)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true, creatorId: true },
  });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const customers = await listSalesInvoiceCustomers(getCompanyId(actor));
    return NextResponse.json({ ok: true, customers });
  } catch (e) {
    return NextResponse.json(
      { ok: false, customers: [], message: (e as Error).message ?? "Failed to load customers." },
      { status: 500 },
    );
  }
}
