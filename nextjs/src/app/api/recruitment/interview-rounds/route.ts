import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, serverError } from "@/lib/hrm-auth";

export async function GET(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-interview-rounds", "manage-interviews")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page") ?? 50)));
    const jobId = searchParams.get("job_id") ?? "";
    const where: Record<string, unknown> = { createdBy: cid };
    if (jobId) where.jobId = BigInt(jobId);
    const [data, total] = await Promise.all([
      prisma.recInterviewRound.findMany({ where, orderBy: { sequenceNumber: "asc" }, skip: (page - 1) * perPage, take: perPage, include: { job: { select: { id: true, title: true } } } }),
      prisma.recInterviewRound.count({ where }),
    ]);
    return jsonR({ data, total, page, per_page: perPage });
  } catch (e) { console.error(e); return serverError(); }
}

export async function POST(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "create-interview-rounds")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const body = await req.json();
    const rec = await prisma.recInterviewRound.create({
      data: { name: body.name ?? "", sequenceNumber: body.sequence_number ? Number(body.sequence_number) : null, description: body.description ?? null, status: body.status ?? "0", jobId: body.job_id ? BigInt(body.job_id) : null, creatorId: actor.id, createdBy: cid },
    });
    return jsonR(rec, { status: 201 });
  } catch (e) { console.error(e); return serverError(); }
}
