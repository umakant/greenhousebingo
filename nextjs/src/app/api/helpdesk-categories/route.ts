import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

async function nextCategoryId(): Promise<bigint> {
  const agg = await prisma.helpdeskCategory.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

export async function GET(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-helpdesk-categories") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const actorEmail = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = actorEmail ? await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true } }) : null;

  const url = new URL(req.url);
  const name = (url.searchParams.get("name") ?? "").trim();
  const isActiveRaw = url.searchParams.get("is_active");
  const pageRaw = (url.searchParams.get("page") ?? "1").trim();
  const perPageRaw = (url.searchParams.get("per_page") ?? "10").trim();
  const sort = (url.searchParams.get("sort") ?? "").trim();
  const direction = ((url.searchParams.get("direction") ?? "asc").trim().toLowerCase() === "desc" ? "desc" : "asc") as "asc" | "desc";

  const perPage = Math.min(100, Math.max(1, parseInt(perPageRaw, 10) || 10));
  const page = Math.max(1, parseInt(pageRaw, 10) || 1);
  const skip = (page - 1) * perPage;

  const where: any = {};
  if (!perms.includes("*")) {
    // Match Laravel default tenant scoping: created_by = creatorId()
    where.createdBy = actor?.id ?? -1;
  }
  if (name) where.name = { contains: name, mode: "insensitive" as const };
  if (isActiveRaw !== null && isActiveRaw !== undefined && String(isActiveRaw).trim() !== "") {
    where.isActive = String(isActiveRaw).trim() === "1" || String(isActiveRaw).trim().toLowerCase() === "true";
  }

  const orderBy = (() => {
    const allowed: Record<string, any> = {
      name: { name: direction },
      is_active: { isActive: direction },
      created_at: { createdAt: direction },
    };
    if (sort && allowed[sort]) return allowed[sort];
    return { createdAt: "desc" as const };
  })();

  const [total, rows] = await Promise.all([
    prisma.helpdeskCategory.count({ where }).catch(() => 0),
    prisma.helpdeskCategory.findMany({
      where,
      orderBy,
      skip,
      take: perPage,
      select: { id: true, name: true, description: true, color: true, isActive: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    categories: {
      data: rows.map((c) => ({
        id: c.id.toString(),
        name: c.name,
        description: c.description ?? "",
        color: c.color,
        is_active: c.isActive,
        created_at: c.createdAt?.toISOString?.() ?? null,
      })),
      meta: {
        total,
        per_page: perPage,
        current_page: page,
        last_page: Math.max(1, Math.ceil(total / perPage)),
      },
    },
  });
}

export async function POST(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "create-helpdesk-categories") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const actorEmail = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = actorEmail ? await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true } }) : null;
  if (!actor?.id) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { [k: string]: unknown } | null;
  const name = String((body as any)?.name ?? "").trim();
  const description = String((body as any)?.description ?? "").trim();
  const color = String((body as any)?.color ?? "#3B82F6").trim() || "#3B82F6";
  const isActive = Boolean((body as any)?.is_active ?? (body as any)?.isActive ?? true);

  if (!name) return NextResponse.json({ ok: false, message: "Name is required." }, { status: 400 });

  const created = await prisma.helpdeskCategory.create({
    data: {
      id: await nextCategoryId(),
      name,
      description: description || null,
      color,
      isActive,
      creatorId: actor.id,
      createdBy: actor.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: created.id.toString() }, { status: 201 });
}

