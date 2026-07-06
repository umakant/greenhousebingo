import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canListBankAccountsForTransactions, getPermissionsFromCookieValue, hasAccountPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.id;
}

async function getActor(req: NextRequest) {
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return null;
  return prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true, createdBy: true } });
}

export async function GET(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-bank-accounts") && !canListBankAccountsForTransactions(perms)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actor = await getActor(req);
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "10", 10) || 10));
  const sort = url.searchParams.get("sort") ?? "createdAt";
  const direction = url.searchParams.get("direction") === "desc" ? "desc" : "asc";
  const search = (url.searchParams.get("search") ?? "").trim();

  try {
    const where: { createdBy: bigint | null; OR?: Array<{ accountNumber?: { contains: string; mode: "insensitive" }; accountName?: { contains: string; mode: "insensitive" }; bankName?: { contains: string; mode: "insensitive" } }> } = {
      createdBy: companyId,
    };
    if (search) {
      where.OR = [
        { accountNumber: { contains: search, mode: "insensitive" } },
        { accountName: { contains: search, mode: "insensitive" } },
        { bankName: { contains: search, mode: "insensitive" } },
      ];
    }

    const sortKey = ["accountNumber", "accountName", "bankName", "createdAt"].includes(sort) ? sort : "createdAt";
    const [total, rows] = await Promise.all([
      prisma.bankAccount.count({ where }),
      prisma.bankAccount.findMany({
        where,
        orderBy: { [sortKey]: direction },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          accountNumber: true,
          accountName: true,
          bankName: true,
          branchName: true,
          accountType: true,
          openingBalance: true,
          currentBalance: true,
          isActive: true,
          createdAt: true,
        },
      }),
    ]);

    const data = rows.map((r) => ({
      id: Number(r.id),
      account_number: r.accountNumber,
      account_name: r.accountName,
      bank_name: r.bankName,
      branch_name: r.branchName ?? null,
      account_type: r.accountType,
      opening_balance: r.openingBalance?.toString() ?? "0",
      current_balance: r.currentBalance?.toString() ?? "0",
      is_active: r.isActive,
      created_at: r.createdAt?.toISOString() ?? null,
    }));

    return NextResponse.json({
      data,
      total,
      current_page: page,
      last_page: Math.ceil(total / perPage) || 1,
      per_page: perPage,
    });
  } catch {
    return NextResponse.json({ data: [], total: 0, current_page: 1, last_page: 1, per_page: perPage });
  }
}

export async function POST(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-bank-accounts")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actor = await getActor(req);
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !body.account_name || !body.account_number || !body.bank_name) {
    return NextResponse.json({ error: "account_name, account_number, and bank_name are required" }, { status: 400 });
  }

  try {
    const row = await prisma.bankAccount.create({
      data: {
        accountName: String(body.account_name).trim(),
        accountNumber: String(body.account_number).trim(),
        bankName: String(body.bank_name).trim(),
        branchName: body.branch_name ? String(body.branch_name).trim() : null,
        accountType: body.account_type ? String(body.account_type) : "0",
        openingBalance: body.opening_balance != null ? Number(body.opening_balance) : 0,
        currentBalance: body.opening_balance != null ? Number(body.opening_balance) : 0,
        isActive: body.is_active !== false,
        creatorId: actor.id,
        createdBy: companyId,
      },
    });

    return NextResponse.json({ ok: true, id: Number(row.id) });
  } catch (e) {
    console.error("[api/account/bank-accounts] POST", e);
    const message = e instanceof Error ? e.message : "Failed to create bank account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
