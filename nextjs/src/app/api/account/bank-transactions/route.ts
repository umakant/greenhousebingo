import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasBankTransactionPermission } from "@/lib/authz";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.id;
}

function toSerializable(v: unknown): unknown {
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Date) return v.toISOString();
  if (v != null && typeof v === "object" && "toNumber" in v && typeof (v as { toNumber: () => number }).toNumber === "function") {
    return (v as { toNumber: () => number }).toNumber();
  }
  return v;
}

export async function GET(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasBankTransactionPermission(perms)) {
    return NextResponse.json({ data: [], current_page: 1, last_page: 1, per_page: 10, total: 0 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "10", 10) || 10));
  const bankAccountId = url.searchParams.get("bank_account_id");
  const type = url.searchParams.get("type") ?? "";
  const search = url.searchParams.get("search") ?? "";

  const where: Record<string, unknown> = { createdBy: companyId };
  if (bankAccountId) where.bankAccountId = BigInt(bankAccountId);
  if (type === "credit" || type === "debit") where.type = type;
  if (search) {
    where.OR = [
      { description: { contains: search, mode: "insensitive" } },
      { referenceNumber: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.bankTransaction.count({ where }),
    prisma.bankTransaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  const bankAccountIds = [...new Set(rows.map((r) => r.bankAccountId))];
  const bankAccounts = bankAccountIds.length
    ? await prisma.bankAccount.findMany({
        where: { id: { in: bankAccountIds } },
        select: { id: true, accountName: true, bankName: true },
      })
    : [];
  const baMap = Object.fromEntries(
    bankAccounts.map((b) => [
      String(b.id),
      { account_name: b.accountName, bank_name: b.bankName },
    ]),
  );

  const data = rows.map((r) => ({
    id: Number(r.id),
    bank_account_id: Number(r.bankAccountId),
    transaction_date: r.transactionDate instanceof Date ? r.transactionDate.toISOString() : String(r.transactionDate),
    reference_number: r.referenceNumber ?? null,
    description: r.description ?? null,
    type: r.type,
    amount: toSerializable(r.amount) as number,
    balance_after: r.balanceAfter != null ? (toSerializable(r.balanceAfter) as number) : null,
    category: r.category ?? null,
    notes: r.notes ?? null,
    bank_account: baMap[String(r.bankAccountId)] ?? null,
  }));

  return NextResponse.json({
    data,
    current_page: page,
    last_page: Math.max(1, Math.ceil(total / perPage)),
    per_page: perPage,
    total,
  });
}

export async function POST(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasBankTransactionPermission(perms)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body?.bank_account_id || !body?.transaction_date || !body?.type || body?.amount === undefined || body?.amount === null) {
    return NextResponse.json({ error: "bank_account_id, transaction_date, type, amount are required" }, { status: 400 });
  }

  const amountNum = Number(body.amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
  }

  const bankAccountId = BigInt(Number(body.bank_account_id));
  const ownsAccount = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, createdBy: companyId },
    select: { id: true },
  });
  if (!ownsAccount) {
    return NextResponse.json({ error: "Invalid or inaccessible bank account" }, { status: 400 });
  }

  const record = await prisma.bankTransaction.create({
    data: {
      bankAccountId,
      transactionDate: new Date(String(body.transaction_date)),
      referenceNumber: body.reference_number ? String(body.reference_number).trim() : null,
      description: body.description ? String(body.description).trim() : null,
      type: String(body.type) === "credit" ? "credit" : "debit",
      amount: amountNum,
      balanceAfter: body.balance_after != null ? Number(body.balance_after) : null,
      category: body.category ? String(body.category).trim() : null,
      notes: body.notes ? String(body.notes).trim() : null,
      creatorId: actor.id,
      createdBy: companyId,
    },
  });

  return NextResponse.json({ ok: true, id: Number(record.id) });
}
