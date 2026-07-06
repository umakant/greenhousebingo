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
  const count = await prisma.vendorPayment.count({ where: { createdBy: companyId } });
  return "VP-" + String(count + 1).padStart(4, "0");
}

export async function GET(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-vendor-payments")) {
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
    prisma.vendorPayment.count({ where }),
    prisma.vendorPayment.findMany({ where, orderBy: { paymentDate: "desc" }, skip: (page - 1) * perPage, take: perPage }),
  ]);

  const vendorIds = [...new Set(rows.map((r) => r.vendorId))];
  const vendors = vendorIds.length ? await prisma.vendor.findMany({ where: { id: { in: vendorIds } }, select: { id: true, name: true, companyName: true } }) : [];
  const vMap = Object.fromEntries(vendors.map((v) => [String(v.id), { name: v.name, company_name: v.companyName }]));

  const data = rows.map((r) => ({
    ...serialize(r as unknown as Record<string, unknown>),
    vendor: vMap[String(r.vendorId)] ?? null,
  }));

  return NextResponse.json({ data, current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), per_page: perPage, total });
}

export async function POST(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-vendor-payments")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true, createdBy: true } });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body?.vendor_id || !body?.payment_date || !body?.amount) {
    return NextResponse.json({ error: "vendor_id, payment_date, amount are required" }, { status: 400 });
  }

  const referenceNumber = await genRef(companyId);
  const record = await prisma.vendorPayment.create({
    data: {
      referenceNumber,
      vendorId: BigInt(Number(body.vendor_id)),
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
  if (isCompanyEmailNotificationEnabled(settings, "Purchase Payment Create")) {
    const vendor = await prisma.vendor.findFirst({
      where: { id: record.vendorId, createdBy: companyId },
      select: { name: true, companyName: true, email: true },
    });
    const mailTo = vendor?.email?.trim();
    if (mailTo?.includes("@")) {
      const paymentName = (vendor?.name ?? vendor?.companyName ?? "").trim() || mailTo;
      sendTemplatedEmailAsync({
        templateName: "Purchase Payment Create",
        mailTo: [mailTo],
        ownerId: companyId,
        variables: {
          payment_name: paymentName,
          payment_bill: record.referenceNumber,
          payment_amount: Number(record.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          payment_date: record.paymentDate.toISOString().slice(0, 10),
          payment_method: record.paymentMethod?.trim() || "-",
        },
      });
    }
  }

  return NextResponse.json({ ok: true, id: Number(record.id) });
}
