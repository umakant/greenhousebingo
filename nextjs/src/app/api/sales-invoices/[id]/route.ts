import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { serializeSalesInvoiceRow } from "@/lib/sales-invoice-utils";

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
    hasPermission(perms, "view-sales-invoices")
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = await getPermissionsFromRequest(req);
  if (!canViewInvoices(perms)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true, creatorId: true, name: true, email: true },
  });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const { id } = await params;

  try {
    const invoice = await prisma.salesInvoice.findFirst({
      where: { id: BigInt(id), createdBy: companyId },
      include: { items: { orderBy: { id: "asc" } } },
    });
    if (!invoice) return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });

    const customer = await prisma.customer.findFirst({
      where: { id: invoice.customerId },
      select: {
        id: true,
        companyName: true,
        contactPersonName: true,
        contactPersonEmail: true,
        contactPersonMobile: true,
        customerCode: true,
        billingAddress: true,
      },
    });

    const companyUser = await prisma.user.findFirst({
      where: { id: companyId },
      select: { name: true, email: true },
    });

    const row = serializeSalesInvoiceRow(invoice, customer);

    return NextResponse.json({
      ok: true,
      company: {
        name: companyUser?.name ?? actor.name ?? "Company",
        email: companyUser?.email ?? actor.email ?? "",
      },
      invoice: {
        ...row,
        items: invoice.items.map((it) => ({
          id: it.id.toString(),
          description: it.description,
          quantity: it.quantity,
          unit_price: Number(it.unitPrice),
          tax_percentage: Number(it.taxPercentage),
          tax_amount: Number(it.taxAmount),
          total_amount: Number(it.totalAmount),
        })),
        customer: customer
          ? {
              company_name: customer.companyName,
              contact_person_name: customer.contactPersonName,
              contact_person_email: customer.contactPersonEmail,
              contact_person_mobile: customer.contactPersonMobile,
              billing_address: customer.billingAddress,
            }
          : null,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
