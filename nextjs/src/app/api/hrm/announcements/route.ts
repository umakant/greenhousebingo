import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-hrm", "manage-announcements")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const search = s.get("search") ?? "";
  const page = Math.max(1, Number(s.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15)));
  const skip = (page - 1) * perPage;
  const where: { createdBy: bigint; title?: { contains: string; mode: "insensitive" } } = { createdBy: companyId };
  if (search) where.title = { contains: search, mode: "insensitive" };
  try {
    const [rows, total] = await Promise.all([
      prisma.hrmAnnouncement.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: perPage }),
      prisma.hrmAnnouncement.count({ where }),
    ]);
    return jsonR({
      data: rows.map((r) => ({ ...r, id: r.id.toString() })),
      total,
      page,
      per_page: perPage,
      last_page: Math.ceil(total / perPage) || 1,
    });
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-hrm", "manage-announcements")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body?.title) return NextResponse.json({ error: "title required" }, { status: 400 });
  try {
    const row = await prisma.hrmAnnouncement.create({
      data: {
        title: body.title,
        body: body.body ?? null,
        startsAt: body.starts_at ? new Date(body.starts_at) : null,
        endsAt: body.ends_at ? new Date(body.ends_at) : null,
        isActive: body.is_active ?? true,
        createdBy: getCompanyId(actor),
      },
    });
    return jsonR({ data: { ...row, id: row.id.toString() } }, { status: 201 });
  } catch {
    return serverError();
  }
}
