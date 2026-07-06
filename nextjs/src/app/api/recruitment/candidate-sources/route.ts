import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, serverError } from "@/lib/hrm-auth";

export async function GET(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-recruitment-system-setup")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page") ?? 15)));
    const search = searchParams.get("search") ?? "";
    const where = { createdBy: cid, ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}) };
    const [data, total] = await Promise.all([
      prisma.recCandidateSource.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * perPage, take: perPage }),
      prisma.recCandidateSource.count({ where }),
    ]);
    return jsonR({ data, total, page, per_page: perPage });
  } catch (e) { console.error(e); return serverError(); }
}

export async function POST(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-recruitment-system-setup")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const body = await req.json();
    const rec = await prisma.recCandidateSource.create({
      data: { name: body.name ?? "", description: body.description ?? null, isActive: body.is_active ?? false, creatorId: actor.id, createdBy: cid },
    });
    return jsonR(rec, { status: 201 });
  } catch (e) { console.error(e); return serverError(); }
}
