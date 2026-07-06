/**
 * Duplicate a company invoice (revenue row) with a new reference number.
 * Auth: superadmin + manage-users.
 */
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { hasPermission } from "@/lib/authz";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

async function requireSuperadminManageUsers(req: NextRequest): Promise<boolean> {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return false;
  const perms = await getPermissionsFromRequest(req);
  return hasPermission(perms, "manage-users");
}

async function genRef(companyId: bigint): Promise<string> {
  const count = await prisma.revenue.count({ where: { createdBy: companyId } });
  return "REV-" + String(count + 1).padStart(4, "0");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; invoiceId: string }> }
) {
  if (!(await requireSuperadminManageUsers(req))) return forbidden();

  const { id, invoiceId } = await params;
  let companyId: bigint;
  let revId: bigint;
  try {
    companyId = BigInt(id);
    revId = BigInt(invoiceId);
  } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const source = await prisma.revenue.findFirst({
    where: { id: revId, createdBy: companyId },
  });
  if (!source) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const referenceNumber = await genRef(companyId);

  const created = await prisma.revenue.create({
    data: {
      referenceNumber,
      customerId: source.customerId,
      date: source.date,
      amount: source.amount,
      category: source.category,
      description: source.description,
      bankAccountId: source.bankAccountId,
      paymentMethod: source.paymentMethod,
      status: source.status,
      notes: source.notes,
      creatorId: source.creatorId,
      createdBy: companyId,
    },
  });

  return NextResponse.json({ ok: true, id: created.id.toString(), reference_number: created.referenceNumber });
}
