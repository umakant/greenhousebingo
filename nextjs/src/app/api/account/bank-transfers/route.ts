import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasAccountPermission } from "@/lib/authz";

function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}
function serialize(r: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "bigint" ? Number(v) : v instanceof Date ? v.toISOString() : v]));
}

export async function GET(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-bank-accounts")) {
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

  const where: Record<string, unknown> = { createdBy: companyId };
  if (search) where.OR = [{ referenceNumber: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }];

  const [total, rows] = await Promise.all([
    prisma.bankTransfer.count({ where }),
    prisma.bankTransfer.findMany({ where, orderBy: { transferDate: "desc" }, skip: (page - 1) * perPage, take: perPage }),
  ]);

  const accIds = [...new Set([...rows.map((r) => r.fromAccountId), ...rows.map((r) => r.toAccountId)])];
  const accounts = accIds.length ? await prisma.bankAccount.findMany({ where: { id: { in: accIds } }, select: { id: true, accountName: true, bankName: true } }) : [];
  const aMap = Object.fromEntries(accounts.map((a) => [String(a.id), { account_name: a.accountName, bank_name: a.bankName }]));

  const data = rows.map((r) => ({
    ...serialize(r as unknown as Record<string, unknown>),
    from_account: aMap[String(r.fromAccountId)] ?? null,
    to_account: aMap[String(r.toAccountId)] ?? null,
  }));

  return NextResponse.json({ data, current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), per_page: perPage, total });
}

export async function POST(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-bank-accounts")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true, createdBy: true } });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body?.from_account_id || !body?.to_account_id || !body?.transfer_date || !body?.amount) {
    return NextResponse.json({ error: "from_account_id, to_account_id, transfer_date, amount are required" }, { status: 400 });
  }

  const record = await prisma.bankTransfer.create({
    data: {
      fromAccountId: BigInt(Number(body.from_account_id)),
      toAccountId: BigInt(Number(body.to_account_id)),
      transferDate: new Date(String(body.transfer_date)),
      amount: Number(body.amount),
      referenceNumber: body.reference_number ? String(body.reference_number).trim() : null,
      description: body.description ? String(body.description).trim() : null,
      fees: body.fees != null ? Number(body.fees) : 0,
      creatorId: actor.id,
      createdBy: companyId,
    },
  });

  return NextResponse.json({ ok: true, id: Number(record.id) });
}
