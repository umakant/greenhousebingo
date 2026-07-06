import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, serverError } from "@/lib/hrm-auth";

export async function GET(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-interviews", "view-interviews")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page") ?? 15)));
    const status = searchParams.get("status") ?? "";
    const candidateId = searchParams.get("candidate_id") ?? "";
    const where: Record<string, unknown> = { createdBy: cid };
    if (status !== "") where.status = status;
    if (candidateId) where.candidateId = BigInt(candidateId);
    const [data, total] = await Promise.all([
      prisma.recInterview.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
          job: { select: { id: true, title: true } },
          round: { select: { id: true, name: true } },
          interviewType: { select: { id: true, name: true } },
        },
      }),
      prisma.recInterview.count({ where }),
    ]);
    return jsonR({ data, total, page, per_page: perPage });
  } catch (e) { console.error(e); return serverError(); }
}

export async function POST(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "create-interviews")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const body = await req.json();
    const rec = await prisma.recInterview.create({
      data: {
        scheduledDate: body.scheduled_date ?? "",
        scheduledTime: body.scheduled_time ?? "",
        duration: body.duration ? Number(body.duration) : null,
        location: body.location ?? null,
        meetingLink: body.meeting_link ?? null,
        interviewerIds: body.interviewer_ids ?? null,
        status: body.status ?? "0",
        candidateId: body.candidate_id ? BigInt(body.candidate_id) : null,
        jobId: body.job_id ? BigInt(body.job_id) : null,
        roundId: body.round_id ? BigInt(body.round_id) : null,
        interviewTypeId: body.interview_type_id ? BigInt(body.interview_type_id) : null,
        creatorId: actor.id,
        createdBy: cid,
      },
    });
    return jsonR(rec, { status: 201 });
  } catch (e) { console.error(e); return serverError(); }
}
