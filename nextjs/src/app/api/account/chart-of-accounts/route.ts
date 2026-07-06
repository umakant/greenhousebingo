import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasAccountPermission } from "@/lib/authz";
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
  if (!hasAccountPermission(perms, "manage-chart-of-accounts")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actor = await getActor(req);
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "10", 10) || 10));
  const sort = url.searchParams.get("sort") ?? "accountCode";
  const direction = url.searchParams.get("direction") === "desc" ? "desc" : "asc";
  const search = (url.searchParams.get("search") ?? "").trim();

  try {
    const where: { createdBy: bigint | null; OR?: Array<{ accountCode?: { contains: string; mode: "insensitive" }; accountName?: { contains: string; mode: "insensitive" } }> } = {
      createdBy: companyId,
    };
    if (search) {
      where.OR = [
        { accountCode: { contains: search, mode: "insensitive" } },
        { accountName: { contains: search, mode: "insensitive" } },
      ];
    }

    const sortKey = ["accountCode", "accountName", "accountTypeId", "level", "createdAt"].includes(sort) ? sort : "accountCode";
    const [total, rows, accountTypes] = await Promise.all([
      prisma.chartOfAccount.count({ where }),
      prisma.chartOfAccount.findMany({
        where,
        orderBy: { [sortKey]: direction },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          accountCode: true,
          accountName: true,
          accountTypeId: true,
          parentAccountId: true,
          level: true,
          normalBalance: true,
          openingBalance: true,
          currentBalance: true,
          isActive: true,
          description: true,
          createdAt: true,
        },
      }),
      prisma.accountType.findMany({
        where: { createdBy: companyId },
        select: { id: true, name: true, code: true, normalBalance: true },
      }),
    ]);

    const typeMap = new Map(accountTypes.map((t) => [Number(t.id), t.name]));

    const data = rows.map((r) => ({
      id: Number(r.id),
      account_code: r.accountCode,
      account_name: r.accountName,
      account_type_id: Number(r.accountTypeId),
      account_type_name: typeMap.get(Number(r.accountTypeId)) ?? null,
      parent_account_id: r.parentAccountId != null ? Number(r.parentAccountId) : null,
      level: r.level,
      normal_balance: r.normalBalance,
      opening_balance: r.openingBalance?.toString() ?? "0",
      current_balance: r.currentBalance?.toString() ?? "0",
      description: r.description ?? null,
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
  if (!hasAccountPermission(perms, "manage-chart-of-accounts")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actor = await getActor(req);
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !body.account_name || !body.account_code || !body.account_type_id) {
    return NextResponse.json({ error: "account_name, account_code, and account_type_id are required" }, { status: 400 });
  }

  const row = await prisma.chartOfAccount.create({
    data: {
      accountCode: String(body.account_code).trim(),
      accountName: String(body.account_name).trim(),
      accountTypeId: BigInt(Number(body.account_type_id)),
      parentAccountId: body.parent_account_id ? BigInt(Number(body.parent_account_id)) : null,
      normalBalance: body.normal_balance ? String(body.normal_balance) : "debit",
      openingBalance: body.opening_balance != null ? Number(body.opening_balance) : 0,
      currentBalance: body.opening_balance != null ? Number(body.opening_balance) : 0,
      description: body.description ? String(body.description).trim() : null,
      isActive: body.is_active !== false,
      creatorId: actor.id,
      createdBy: companyId,
    },
  });

  return NextResponse.json({ ok: true, id: Number(row.id) });
}
