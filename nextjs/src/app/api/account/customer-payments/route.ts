import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasAccountPermission } from "@/lib/authz";
import { getSettingsForOwner } from "@/lib/settings-service";
import { isCompanyEmailNotificationEnabled, sendTemplatedEmailAsync } from "@/lib/send-templated-email";

function normalizeEmail(e: string) { return e.trim().toLowerCase(); }
function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}
function serialize(r: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "bigint" ? Number(v) : v instanceof Date ? v.toISOString() : v]));
}

async function genRef(companyId: bigint): Promise<string> {
  const count = await prisma.customerPayment.count({ where: { createdBy: companyId } });
  return "CP-" + String(count + 1).padStart(4, "0");
}

export async function GET(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-customer-payments")) {
    return NextResponse.json({ data: [], current_page: 1, last_page: 1, per_page: 10, total: 0 });
  }
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true, createdBy: true } });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "10", 10) || 10));
  const search = url.searchParams.get("search") ?? "";
  const status = url.searchParams.get("status") ?? "";

  const where: Record<string, unknown> = { createdBy: companyId };
  if (status) where.status = status;
  if (search) where.OR = [
    { referenceNumber: { contains: search, mode: "insensitive" } },
    { reference: { contains: search, mode: "insensitive" } },
  ];

  const [total, rows] = await Promise.all([
    prisma.customerPayment.count({ where }),
    prisma.customerPayment.findMany({ where, orderBy: { paymentDate: "desc" }, skip: (page - 1) * perPage, take: perPage }),
  ]);

  const customerIds = [...new Set(rows.map((r) => r.customerId))];
  const customers = customerIds.length ? await prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, companyName: true, contactPersonName: true } }) : [];
  const cMap = Object.fromEntries(customers.map((c) => [String(c.id), { company_name: c.companyName, contact_person_name: c.contactPersonName }]));

  const data = rows.map((r) => ({
    ...serialize(r as unknown as Record<string, unknown>),
    customer: cMap[String(r.customerId)] ?? null,
  }));

  return NextResponse.json({ data, current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), per_page: perPage, total });
}

export async function POST(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-customer-payments")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true, createdBy: true } });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body?.customer_id || !body?.payment_date || !body?.amount) {
    return NextResponse.json({ error: "customer_id, payment_date, amount are required" }, { status: 400 });
  }

  const referenceNumber = await genRef(companyId);
  const record = await prisma.customerPayment.create({
    data: {
      referenceNumber,
      customerId: BigInt(Number(body.customer_id)),
      paymentDate: new Date(String(body.payment_date)),
      amount: Number(body.amount),
      paymentMethod: body.payment_method ? String(body.payment_method).trim() : null,
      bankAccountId: body.bank_account_id != null ? BigInt(Number(body.bank_account_id)) : null,
      reference: body.reference ? String(body.reference).trim() : null,
      status: body.status ? String(body.status).trim() : "completed",
      notes: body.notes ? String(body.notes).trim() : null,
      creatorId: actor.id,
      createdBy: companyId,
    },
  });

  const settings = await getSettingsForOwner(companyId);
  if (isCompanyEmailNotificationEnabled(settings, "Invoice Payment Create")) {
    const customer = await prisma.customer.findFirst({
      where: { id: record.customerId, createdBy: companyId },
      select: { contactPersonName: true, companyName: true, contactPersonEmail: true },
    });
    const mailTo = customer?.contactPersonEmail?.trim();
    if (mailTo?.includes("@")) {
      const invoiceNo =
        body.invoice_number != null && String(body.invoice_number).trim()
          ? String(body.invoice_number).trim()
          : record.reference?.trim() || record.referenceNumber;
      const dueRaw = body.payment_due_amount ?? body.payment_dueAmount;
      const paymentDue =
        dueRaw !== undefined && dueRaw !== null && String(dueRaw).trim() !== ""
          ? String(dueRaw)
          : "0";
      const paymentName = (customer?.contactPersonName ?? customer?.companyName ?? "").trim() || mailTo;
      sendTemplatedEmailAsync({
        templateName: "Invoice Payment Create",
        mailTo: [mailTo],
        ownerId: companyId,
        variables: {
          payment_name: paymentName,
          invoice_number: invoiceNo,
          payment_amount: Number(record.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          payment_date: record.paymentDate.toISOString().slice(0, 10),
          payment_dueAmount: paymentDue,
        },
      });
    }
  }

  return NextResponse.json({ ok: true, id: Number(record.id) });
}
