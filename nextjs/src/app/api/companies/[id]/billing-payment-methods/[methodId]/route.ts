import { NextRequest, NextResponse } from "next/server";

import { assertCompanyBillingPaymentMethodDelegate } from "@/lib/company-billing-prisma";
import { canAccessCompanyBillingApis } from "@/lib/company-billing-route-auth";
import { prisma } from "@/lib/prisma";

function forbidden() {
  return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; methodId: string }> }
) {
  const { id, methodId } = await params;
  const companyId = parseInt(id, 10);
  let mid: bigint;
  try {
    mid = BigInt(methodId);
  } catch {
    return NextResponse.json({ error: "Invalid method id" }, { status: 400 });
  }
  if (Number.isNaN(companyId)) {
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });
  }

  const tenantId = BigInt(companyId);
  if (!(await canAccessCompanyBillingApis(req, tenantId))) return forbidden();

  const notReady = assertCompanyBillingPaymentMethodDelegate(prisma);
  if (notReady) return notReady;

  const row = await prisma.companyBillingPaymentMethod.findFirst({
    where: { id: mid, companyId: tenantId },
    select: { id: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.companyBillingPaymentMethod.delete({ where: { id: mid } });
  return NextResponse.json({ ok: true });
}
