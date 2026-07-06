import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import {
  generateInvoiceShortCode,
  generatePaymentToken,
  generateSalesInvoiceNumber,
} from "@/lib/sales-invoice-utils";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null; creatorId: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.creatorId ?? actor.id;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = await getPermissionsFromRequest(req);
  if (
    !perms.includes("*") &&
    !hasPermission(perms, "manage-sales-invoices") &&
    !hasPermission(perms, "create-sales-invoices")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true, creatorId: true },
  });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const { id } = await params;

  const source = await prisma.salesInvoice.findFirst({
    where: { id: BigInt(id), createdBy: companyId },
    include: { items: true },
  });
  if (!source) return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });

  const customer = await prisma.customer.findFirst({
    where: { id: source.customerId },
    select: { customerCode: true },
  });

  const count = await prisma.salesInvoice.count({ where: { createdBy: companyId } });
  const invoiceNumber = generateSalesInvoiceNumber(companyId, count + 1);
  const shortCode = generateInvoiceShortCode(source.projectName, customer?.customerCode ?? null);

  const duplicate = await prisma.salesInvoice.create({
    data: {
      invoiceNumber,
      shortCode,
      invoiceDate: new Date(),
      dueDate: source.dueDate,
      customerId: source.customerId,
      projectId: source.projectId,
      projectName: source.projectName,
      subtotal: source.subtotal,
      taxAmount: source.taxAmount,
      discountAmount: source.discountAmount,
      totalAmount: source.totalAmount,
      paidAmount: 0,
      status: "unpaid",
      notes: source.notes,
      terms: source.terms,
      paymentToken: generatePaymentToken(),
      proposalId: source.proposalId,
      creatorId: actor.id,
      createdBy: companyId,
    },
  });

  for (const it of source.items) {
    await prisma.salesInvoiceItem.create({
      data: {
        invoiceId: duplicate.id,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxPercentage: it.taxPercentage,
        taxAmount: it.taxAmount,
        totalAmount: it.totalAmount,
        productId: it.productId,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    id: duplicate.id.toString(),
    invoice_number: duplicate.invoiceNumber,
  });
}
