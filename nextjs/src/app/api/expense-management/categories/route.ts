import { NextResponse, type NextRequest } from "next/server";
import type { PrismaClient } from "@prisma/client";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { EM_DEFAULT_EXPENSE_CATEGORY_NAMES } from "@/lib/em-expense-category-defaults";
import { loadEmActorFromEmail, resolveEmOrganizationId } from "@/lib/em-tenant";
import {
  prismaExpenseCategoryTableMissingResponse,
  requireEmExpenseCategoryDelegate,
} from "@/lib/require-prisma-em-expense-category";

export const dynamic = "force-dynamic";

const READ_PERMS = [
  "manage-expense-management",
  "manage-expense-management-dashboard",
  "manage-expense-analytics",
  "manage-expense-reports",
  "manage-expense-entries",
  "manage-expense-receipts",
] as const;

function canReadCategories(perms: string[], role: string | undefined): boolean {
  if (perms.includes("*")) return true;
  if (role === "superadmin") return true;
  return READ_PERMS.some((p) => hasPermission(perms, p));
}

function canMutateCategories(perms: string[], role: string | undefined): boolean {
  if (perms.includes("*")) return true;
  if (role === "superadmin") return true;
  return hasPermission(perms, "manage-expense-management");
}

async function resolveOrganizationId(req: NextRequest): Promise<{ ok: false; res: NextResponse } | { ok: true; id: bigint }> {
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = email ? await loadEmActorFromEmail(email) : null;
  if (!actor) {
    return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const isSuperadmin = (actor.type ?? "").toLowerCase().includes("superadmin");
  const companyIdRaw = (req.nextUrl.searchParams.get("company_id") ?? "").trim();
  let organizationId = resolveEmOrganizationId(actor);
  if (isSuperadmin && companyIdRaw && /^\d+$/.test(companyIdRaw)) {
    organizationId = BigInt(companyIdRaw);
  }
  return { ok: true, id: organizationId };
}

async function ensureDefaultCategories(db: PrismaClient["emExpenseCategory"], organizationId: bigint): Promise<void> {
  const n = await db.count({ where: { organizationId } });
  if (n > 0) return;
  await db.createMany({
    data: EM_DEFAULT_EXPENSE_CATEGORY_NAMES.map((name, i) => ({
      organizationId,
      name,
      description: null,
      sortOrder: i,
    })),
  });
}

export async function GET(req: NextRequest) {
  try {
    const role = req.cookies.get("pf_role")?.value;
    const perms = await getPermissionsFromRequest(req);
    if (!canReadCategories(perms, role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const org = await resolveOrganizationId(req);
    if (!org.ok) return org.res;

    const prismaCat = requireEmExpenseCategoryDelegate();
    if (!prismaCat.ok) return prismaCat.response;
    const db = prismaCat.emExpenseCategory;

    const { searchParams: s } = new URL(req.url);
    const search = (s.get("search") ?? "").trim();
    const page = Math.max(1, Number(s.get("page") ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15)));
    const skip = (page - 1) * perPage;

    const where: { organizationId: bigint; name?: { contains: string; mode: "insensitive" } } = {
      organizationId: org.id,
    };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    try {
      await ensureDefaultCategories(db, org.id);
      const [rows, total] = await Promise.all([
        db.findMany({
          where,
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          skip,
          take: perPage,
        }),
        db.count({ where }),
      ]);
      return NextResponse.json({
        data: rows.map((r) => ({
          id: r.id.toString(),
          name: r.name,
          description: r.description,
          createdAt: r.createdAt.toISOString(),
        })),
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage) || 1,
      });
    } catch (e: unknown) {
      return prismaExpenseCategoryTableMissingResponse(e) ?? NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  } catch (e: unknown) {
    console.error("[GET /api/expense-management/categories]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  const perms = await getPermissionsFromRequest(req);
  if (!canMutateCategories(perms, role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = await resolveOrganizationId(req);
  if (!org.ok) return org.res;

  const prismaCat = requireEmExpenseCategoryDelegate();
  if (!prismaCat.ok) return prismaCat.response;
  const db = prismaCat.emExpenseCategory;

  const body = (await req.json().catch(() => null)) as { name?: string; description?: string | null } | null;
  const name = (body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  if (name.length > 255) {
    return NextResponse.json({ error: "name too long" }, { status: 400 });
  }

  const desc = body?.description != null ? String(body.description).trim() : "";
  const description = desc.length > 2000 ? desc.slice(0, 2000) : desc || null;

  try {
    const maxSort = await db.aggregate({
      where: { organizationId: org.id },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;
    const row = await db.create({
      data: {
        organizationId: org.id,
        name,
        description,
        sortOrder,
      },
    });
    return NextResponse.json(
      {
        data: {
          id: row.id.toString(),
          name: row.name,
          description: row.description,
          createdAt: row.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (e: unknown) {
    const missing = prismaExpenseCategoryTableMissingResponse(e);
    if (missing) return missing;
    const code = typeof e === "object" && e && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "A category with this name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
