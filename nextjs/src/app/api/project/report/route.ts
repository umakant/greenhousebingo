import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue } from "@/lib/authz";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.id;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const store = req.cookies;
    const role = store.get("pf_role")?.value;
    if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const perms = getPermissionsFromCookieValue(store.get("pf_permissions")?.value);
    const canAccess =
      perms.includes("*") ||
      perms.includes("manage-project-report") ||
      perms.includes("manage-project-dashboard") ||
      perms.includes("manage-project");
    if (!canAccess) {
      return NextResponse.json({
        data: [],
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
        from: 0,
        to: 0,
      });
    }

    const actorEmail = normalizeEmail(store.get("pf_email")?.value ?? "");
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
    const sort = url.searchParams.get("sort") ?? "createdAt";
    const direction = url.searchParams.get("direction") === "desc" ? "desc" : "asc";
    const nameFilter = (url.searchParams.get("name") ?? "").trim();
    const statusFilter = (url.searchParams.get("status") ?? "").trim();
    const dateFilter = (url.searchParams.get("date") ?? "").trim();

    const where: {
      createdBy: bigint;
      name?: { contains: string; mode: "insensitive" };
      status?: string;
      startDate?: { lte: Date };
      endDate?: { gte: Date };
    } = { createdBy: companyId };
    if (nameFilter) where.name = { contains: nameFilter, mode: "insensitive" };
    if (statusFilter && ["Ongoing", "Finished", "Onhold", "Not Started"].includes(statusFilter)) {
      where.status = statusFilter;
    }
    if (dateFilter) {
      const d = new Date(dateFilter);
      if (!isNaN(d.getTime())) {
        where.startDate = { lte: d };
        where.endDate = { gte: d };
      }
    }

    const sortKeys = ["name", "startDate", "endDate", "status", "createdAt"] as const;
    const sortKey = sortKeys.includes(sort as (typeof sortKeys)[number]) ? sort : "createdAt";
    const orderBy = { [sortKey]: direction } as { createdAt: "asc" | "desc" };

    const [total, rows] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      }),
    ]);

    const data = rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      start_date: r.startDate?.toISOString().slice(0, 10) ?? null,
      end_date: r.endDate?.toISOString().slice(0, 10) ?? null,
      status: r.status ?? null,
      tasks_count: "0/0",
      bugs_count: "0/0",
      milestones_count: "0/0",
    }));

    const from = total === 0 ? 0 : (page - 1) * perPage + 1;
    const to = Math.min(page * perPage, total);

    return NextResponse.json({
      data,
      current_page: page,
      last_page: Math.ceil(total / perPage) || 1,
      per_page: perPage,
      total,
      from,
      to,
    });
  } catch (e) {
    console.error("Project report API error:", e);
    return NextResponse.json(
      {
        data: [],
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
        from: 0,
        to: 0,
      },
      { status: 200 }
    );
  }
}
