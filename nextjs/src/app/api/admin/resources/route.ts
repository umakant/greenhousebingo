import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  parseResourceBody,
  readSessionUserId,
  requireSuperadminResourcesAccess,
  serializeSuperadminResource,
  type SuperadminResourceAddedBy,
} from "@/lib/superadmin-resources";

export const dynamic = "force-dynamic";

const RECENT_DAYS = 7;

async function loadAddedByMap(ids: bigint[]): Promise<Map<string, SuperadminResourceAddedBy>> {
  const unique = [...new Set(ids.map((id) => id.toString()))].map((s) => BigInt(s));
  if (!unique.length) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, email: true },
  });
  const map = new Map<string, SuperadminResourceAddedBy>();
  for (const u of users) {
    map.set(u.id.toString(), {
      id: u.id.toString(),
      name: u.name?.trim() || u.email || "User",
      email: u.email,
    });
  }
  return map;
}

function recentCutoff(): Date {
  const d = new Date();
  d.setDate(d.getDate() - RECENT_DAYS);
  return d;
}

export async function GET(req: NextRequest) {
  if (!requireSuperadminResourcesAccess(req)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const category = (sp.get("category") ?? "").trim();
  const resourceType = (sp.get("type") ?? "").trim().toUpperCase();
  const tab = (sp.get("tab") ?? "all").trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(50, Math.max(5, Number.parseInt(sp.get("per_page") ?? "10", 10) || 10));
  const sessionUserId = readSessionUserId(req);

  const where: Record<string, unknown> = {};

  if (category) where.category = category;
  if (resourceType && resourceType !== "ALL") where.resourceType = resourceType;

  if (tab === "favorites") where.isFavorite = true;
  else if (tab === "mine" && sessionUserId != null) where.addedById = sessionUserId;
  else if (tab === "recent") where.createdAt = { gte: recentCutoff() };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { url: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }

  const recentDate = recentCutoff();

  const [total, rows, categoriesRows, documents, links, recentlyAdded, favorites, mine] =
    await Promise.all([
      prisma.superadminResource.count({ where }),
      prisma.superadminResource.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.superadminResource.findMany({
        where: { category: { not: null } },
        select: { category: true },
        distinct: ["category"],
      }),
      prisma.superadminResource.count({ where: { resourceType: "DOCUMENT" } }),
      prisma.superadminResource.count({ where: { resourceType: "LINK" } }),
      prisma.superadminResource.count({ where: { createdAt: { gte: recentDate } } }),
      prisma.superadminResource.count({ where: { isFavorite: true } }),
      sessionUserId != null
        ? prisma.superadminResource.count({ where: { addedById: sessionUserId } })
        : Promise.resolve(0),
    ]);

  const addedByIds = rows.map((r) => r.addedById).filter((id): id is bigint => id != null);
  const addedByMap = await loadAddedByMap(addedByIds);

  const categories = categoriesRows.map((c) => c.category).filter(Boolean) as string[];

  return NextResponse.json({
    ok: true,
    items: rows.map((r) =>
      serializeSuperadminResource(
        r,
        r.addedById ? addedByMap.get(r.addedById.toString()) ?? null : null,
      ),
    ),
    categories: categories.sort((a, b) => a.localeCompare(b)),
    pagination: {
      page,
      perPage,
      total,
      lastPage: Math.max(1, Math.ceil(total / perPage)),
    },
    stats: {
      total: await prisma.superadminResource.count(),
      categories: categories.length,
      documents,
      links,
      recentlyAdded,
      favorites,
      mine,
    },
  });
}

export async function POST(req: NextRequest) {
  if (!requireSuperadminResourcesAccess(req)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const parsed = parseResourceBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, message: parsed.error }, { status: 400 });
  }

  const addedById = readSessionUserId(req);

  const created = await prisma.superadminResource.create({
    data: { ...parsed, addedById: addedById ?? undefined },
  });

  let addedBy = null;
  if (addedById) {
    const u = await prisma.user.findUnique({
      where: { id: addedById },
      select: { id: true, name: true, email: true },
    });
    if (u) {
      addedBy = {
        id: u.id.toString(),
        name: u.name?.trim() || u.email || "User",
        email: u.email,
      };
    }
  }

  return NextResponse.json(
    { ok: true, item: serializeSuperadminResource(created, addedBy) },
    { status: 201 },
  );
}
