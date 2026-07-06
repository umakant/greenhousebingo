import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, serverError } from "@/lib/hrm-auth";

export async function GET(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-interview-feedbacks")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page") ?? 15)));
    const interviewId = searchParams.get("interview_id") ?? "";
    const recommendation = searchParams.get("recommendation") ?? "";
    const where: Record<string, unknown> = { createdBy: cid };
    if (interviewId) where.interviewId = BigInt(interviewId);
    if (recommendation) where.recommendation = recommendation;
    const [data, total] = await Promise.all([
      prisma.recInterviewFeedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          interview: {
            select: {
              id: true,
              scheduledDate: true,
              candidate: { select: { id: true, firstName: true, lastName: true } },
              job: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.recInterviewFeedback.count({ where }),
    ]);
    return jsonR({ data, total, page, per_page: perPage });
  } catch (e) { console.error(e); return serverError(); }
}

export async function POST(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-interview-feedbacks")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const body = await req.json();
    const rec = await prisma.recInterviewFeedback.create({
      data: {
        technicalRating: body.technical_rating ? Number(body.technical_rating) : null,
        communicationRating: body.communication_rating ? Number(body.communication_rating) : null,
        culturalFitRating: body.cultural_fit_rating ? Number(body.cultural_fit_rating) : null,
        overallRating: body.overall_rating ? Number(body.overall_rating) : null,
        strengths: body.strengths ?? null,
        improvements: body.improvements ?? null,
        notes: body.notes ?? null,
        recommendation: body.recommendation ?? null,
        interviewId: body.interview_id ? BigInt(body.interview_id) : null,
        evaluatorId: body.evaluator_id ? BigInt(body.evaluator_id) : null,
        creatorId: actor.id,
        createdBy: cid,
      },
    });
    return jsonR(rec, { status: 201 });
  } catch (e) { console.error(e); return serverError(); }
}
