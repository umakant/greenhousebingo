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
  if (!hasAccountPermission(perms, "manage-account-setup")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actor = await getActor(req);
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const url = new URL(req.url);
  const type = (url.searchParams.get("type") ?? "").trim();
  const search = (url.searchParams.get("search") ?? "").trim();
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "25", 10) || 25));

  const where: Record<string, unknown> = { createdBy: companyId };
  if (type) where.type = type;
  if (search) {
    (where as { OR?: unknown[] }).OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.accountCategory.count({ where }),
    prisma.accountCategory.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return NextResponse.json({
    data: rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      code: r.code,
      type: r.type,
      description: r.description ?? null,
      is_active: r.isActive,
    })),
    total,
    current_page: page,
    last_page: Math.ceil(total / perPage) || 1,
    per_page: perPage,
  });
}

export async function POST(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-account-setup")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actor = await getActor(req);
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !body.name || !body.type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 });
  }

  const name = String(body.name).trim();
  const type = String(body.type).trim();
  const code = body.code ? String(body.code).trim() : name.toUpperCase().replace(/\s+/g, "_").slice(0, 20);

  const row = await prisma.accountCategory.create({
    data: {
      name,
      code,
      type,
      description: body.description ? String(body.description).trim() : null,
      isActive: body.is_active !== false,
      creatorId: actor.id,
      createdBy: companyId,
    },
  });

  return NextResponse.json({ ok: true, id: Number(row.id) });
}
