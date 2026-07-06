import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, serverError } from "@/lib/hrm-auth";

export async function GET(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-offers")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page") ?? 15)));
    const status = searchParams.get("status") ?? "";
    const where: Record<string, unknown> = { createdBy: cid };
    if (status !== "") where.status = status;
    const [data, total] = await Promise.all([
      prisma.recOffer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { candidate: { select: { id: true, firstName: true, lastName: true, email: true } }, job: { select: { id: true, title: true } } },
      }),
      prisma.recOffer.count({ where }),
    ]);
    return jsonR({ data, total, page, per_page: perPage });
  } catch (e) { console.error(e); return serverError(); }
}

export async function POST(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-offers")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const body = await req.json();
    const rec = await prisma.recOffer.create({
      data: {
        candidateId: BigInt(body.candidate_id),
        jobId: body.job_id ? BigInt(body.job_id) : null,
        offerDate: new Date(body.offer_date ?? new Date()),
        position: body.position ?? "",
        salary: Number(body.salary ?? 0),
        bonus: body.bonus ? Number(body.bonus) : null,
        equity: body.equity ?? null,
        benefits: body.benefits ?? null,
        startDate: new Date(body.start_date ?? new Date()),
        expirationDate: new Date(body.expiration_date ?? new Date()),
        status: body.status ?? "0",
        approvalStatus: body.approval_status ?? "pending",
        creatorId: actor.id,
        createdBy: cid,
      },
    });
    return jsonR(rec, { status: 201 });
  } catch (e) { console.error(e); return serverError(); }
}
