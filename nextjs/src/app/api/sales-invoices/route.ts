import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import {
  generateInvoiceShortCode,
  generatePaymentToken,
  generateSalesInvoiceNumber,
  serializeSalesInvoiceRow,
} from "@/lib/sales-invoice-utils";
import { listSalesInvoiceCustomers } from "@/lib/sales-invoice-customers";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null; creatorId: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.creatorId ?? actor.id;
}

function canManageInvoices(perms: string[]) {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-sales-invoices") ||
    hasPermission(perms, "manage-any-sales-invoices")
  );
}

function canViewInvoices(perms: string[]) {
  return canManageInvoices(perms) || hasPermission(perms, "view-sales-invoices");
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

  const companyId = getCompanyId(actor);
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "10", 10) || 10));
  const search = (url.searchParams.get("search") ?? "").trim();
  const customerId = (url.searchParams.get("customer_id") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim();
  const dateFrom = (url.searchParams.get("date_from") ?? "").trim();
  const dateTo = (url.searchParams.get("date_to") ?? "").trim();
  const sort = (url.searchParams.get("sort") ?? "invoiceDate").trim();
  const direction = url.searchParams.get("direction") === "asc" ? "asc" : "desc";

  const where: Record<string, unknown> = { createdBy: companyId };
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { projectName: { contains: search, mode: "insensitive" } },
      { shortCode: { contains: search, mode: "insensitive" } },
    ];
  }
  if (customerId) where.customerId = BigInt(customerId);
  if (status === "paid" || status === "unpaid" || status === "partially_paid") where.status = status;
  if (dateFrom || dateTo) {
    const invoiceDate: Record<string, Date> = {};
    if (dateFrom) invoiceDate.gte = new Date(dateFrom);
    if (dateTo) invoiceDate.lte = new Date(dateTo);
    where.invoiceDate = invoiceDate;
  }

  const orderByKey = ["invoiceNumber", "invoiceDate", "totalAmount", "status", "createdAt", "projectName"].includes(sort)
    ? sort
    : "invoiceDate";
  const orderBy = { [orderByKey]: direction } as { invoiceDate: "desc" | "asc" };

  try {
    let customers: Awaited<ReturnType<typeof listSalesInvoiceCustomers>> = [];
    try {
      customers = await listSalesInvoiceCustomers(companyId);
    } catch {
      customers = [];
    }

    const [total, rows] = await Promise.all([
      prisma.salesInvoice.count({ where }),
      prisma.salesInvoice.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    const customerIds = Array.from(new Set(rows.map((r) => r.customerId)));
    const customerRows =
      customerIds.length > 0
        ? await prisma.customer.findMany({
            where: { id: { in: customerIds } },
            select: {
              id: true,
              companyName: true,
              contactPersonName: true,
              contactPersonEmail: true,
              customerCode: true,
            },
          })
        : [];
    const customerMap = new Map(customerRows.map((c) => [c.id.toString(), c]));

    const data = rows.map((inv) =>
      serializeSalesInvoiceRow(inv, customerMap.get(inv.customerId.toString()) ?? null),
    );

    return NextResponse.json({
      ok: true,
      invoices: {
        data,
        meta: {
          total,
          per_page: perPage,
          current_page: page,
          last_page: Math.max(1, Math.ceil(total / perPage)),
        },
      },
      customers,
    });
  } catch {
    let customers: Awaited<ReturnType<typeof listSalesInvoiceCustomers>> = [];
    try {
      customers = await listSalesInvoiceCustomers(companyId);
    } catch {
      customers = [];
    }
    return NextResponse.json({
      ok: true,
      invoices: { data: [], meta: { total: 0, per_page: perPage, current_page: page, last_page: 1 } },
      customers,
    });
  }
}

export async function POST(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (!perms.includes("*") && !hasPermission(perms, "create-sales-invoices") && !canManageInvoices(perms)) {
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
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });

  const invoiceDate = String(body.invoice_date ?? "").trim();
  const customerIdRaw = body.customer_id;
  const projectName = String(body.project_name ?? "").trim() || null;
  const notes = (body.notes as string) ?? null;
  const terms = (body.terms as string) ?? "Thank you for your business.";
  const paidAmount = Math.max(0, Number(body.paid_amount) || 0);
  const items =
    (body.items as Array<{ description: string; quantity?: number; unit_price?: number; tax_percentage?: number }>) ?? [];

  if (!invoiceDate || !customerIdRaw) {
    return NextResponse.json({ ok: false, message: "Invoice date and customer are required." }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: false, message: "At least one line item is required." }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({
    where: { id: BigInt(String(customerIdRaw)), createdBy: companyId },
    select: { id: true, customerCode: true, companyName: true },
  });
  if (!customer) {
    return NextResponse.json({ ok: false, message: "Customer not found." }, { status: 404 });
  }

  let subtotal = 0;
  let taxAmount = 0;
  const lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    taxPercentage: number;
    taxAmount: number;
    totalAmount: number;
  }[] = [];

  for (const it of items) {
    const desc = String(it.description ?? "").trim();
    if (!desc) continue;
    const qty = Math.max(1, Number(it.quantity) || 1);
    const unitPrice = Math.max(0, Number(it.unit_price) || 0);
    const taxPct = Math.min(100, Math.max(0, Number(it.tax_percentage) || 0));
    const lineTotal = qty * unitPrice;
    const taxAmt = (lineTotal * taxPct) / 100;
    const total = lineTotal + taxAmt;
    subtotal += lineTotal;
    taxAmount += taxAmt;
    lineItems.push({
      description: desc,
      quantity: qty,
      unitPrice,
      taxPercentage: taxPct,
      taxAmount: taxAmt,
      totalAmount: total,
    });
  }

  if (lineItems.length === 0) {
    return NextResponse.json({ ok: false, message: "At least one valid line item is required." }, { status: 400 });
  }

  const totalAmount = subtotal + taxAmount;
  const status = paidAmount >= totalAmount ? "paid" : paidAmount > 0 ? "partially_paid" : "unpaid";

  const count = await prisma.salesInvoice.count({ where: { createdBy: companyId } });
  const invoiceNumber = generateSalesInvoiceNumber(companyId, count + 1);
  const shortCode = generateInvoiceShortCode(projectName, customer.customerCode);

  try {
    const invoice = await prisma.salesInvoice.create({
      data: {
        invoiceNumber,
        shortCode,
        invoiceDate: new Date(invoiceDate),
        dueDate: body.due_date ? new Date(String(body.due_date)) : null,
        customerId: customer.id,
        projectName,
        subtotal,
        taxAmount,
        totalAmount,
        paidAmount,
        status,
        notes,
        terms,
        paymentToken: generatePaymentToken(),
        creatorId: actor.id,
        createdBy: companyId,
      },
    });

    for (const it of lineItems) {
      await prisma.salesInvoiceItem.create({
        data: {
          invoiceId: invoice.id,
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxPercentage: it.taxPercentage,
          taxAmount: it.taxAmount,
          totalAmount: it.totalAmount,
        },
      });
    }

    return NextResponse.json({ ok: true, id: invoice.id.toString(), invoice_number: invoiceNumber }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 500 });
  }
}
