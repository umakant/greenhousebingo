import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasAccountPermission } from "@/lib/authz";

function normalizeEmail(e: string) { return e.trim().toLowerCase(); }
function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}
function serialize(r: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "bigint" ? Number(v) : v instanceof Date ? v.toISOString() : v]));
}

async function genRef(companyId: bigint): Promise<string> {
  const count = await prisma.creditNote.count({ where: { createdBy: companyId } });
  return "CN-" + String(count + 1).padStart(4, "0");
}

export async function GET(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-credit-notes")) {
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
    { reason: { contains: search, mode: "insensitive" } },
  ];

  const [total, rows] = await Promise.all([
    prisma.creditNote.count({ where }),
    prisma.creditNote.findMany({ where, orderBy: { date: "desc" }, skip: (page - 1) * perPage, take: perPage }),
  ]);

  const customerIds = [...new Set(rows.map((r) => r.customerId).filter(Boolean))] as bigint[];
  const customers = customerIds.length ? await prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, companyName: true, contactPersonName: true } }) : [];
  const cMap = Object.fromEntries(customers.map((c) => [String(c.id), { company_name: c.companyName, contact_person_name: c.contactPersonName }]));

  const data = rows.map((r) => ({
    ...serialize(r as unknown as Record<string, unknown>),
    customer: r.customerId ? (cMap[String(r.customerId)] ?? null) : null,
  }));

  return NextResponse.json({ data, current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), per_page: perPage, total });
}

export async function POST(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-credit-notes")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true, createdBy: true } });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body?.date || !body?.amount) return NextResponse.json({ error: "date and amount are required" }, { status: 400 });

  const referenceNumber = await genRef(companyId);
  const record = await prisma.creditNote.create({
    data: {
      referenceNumber,
      customerId: body.customer_id != null ? BigInt(Number(body.customer_id)) : null,
      date: new Date(String(body.date)),
      amount: Number(body.amount),
      reason: body.reason ? String(body.reason).trim() : null,
      status: body.status ? String(body.status).trim() : "pending",
      notes: body.notes ? String(body.notes).trim() : null,
      creatorId: actor.id,
      createdBy: companyId,
    },
  });

  return NextResponse.json({ ok: true, id: Number(record.id) });
}
