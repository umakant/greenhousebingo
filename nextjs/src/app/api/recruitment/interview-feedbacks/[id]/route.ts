import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, notFound, serverError } from "@/lib/hrm-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-interview-feedbacks")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recInterviewFeedback.findFirst({
      where: { id: BigInt(id), createdBy: cid },
      include: { interview: { include: { candidate: true, job: true } } },
    });
    if (!rec) return notFound();
    return jsonR(rec);
  } catch (e) { console.error(e); return serverError(); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-interview-feedbacks")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recInterviewFeedback.findFirst({ where: { id: BigInt(id), createdBy: cid } });
    if (!rec) return notFound();
    const body = await req.json();
    const updated = await prisma.recInterviewFeedback.update({
      where: { id: BigInt(id) },
      data: {
        technicalRating: body.technical_rating !== undefined ? (body.technical_rating ? Number(body.technical_rating) : null) : rec.technicalRating,
        communicationRating: body.communication_rating !== undefined ? (body.communication_rating ? Number(body.communication_rating) : null) : rec.communicationRating,
        culturalFitRating: body.cultural_fit_rating !== undefined ? (body.cultural_fit_rating ? Number(body.cultural_fit_rating) : null) : rec.culturalFitRating,
        overallRating: body.overall_rating !== undefined ? (body.overall_rating ? Number(body.overall_rating) : null) : rec.overallRating,
        strengths: body.strengths !== undefined ? body.strengths : rec.strengths,
        improvements: body.improvements !== undefined ? body.improvements : rec.improvements,
        notes: body.notes !== undefined ? body.notes : rec.notes,
        recommendation: body.recommendation !== undefined ? body.recommendation : rec.recommendation,
        interviewId: body.interview_id !== undefined ? (body.interview_id ? BigInt(body.interview_id) : null) : rec.interviewId,
        evaluatorId: body.evaluator_id !== undefined ? (body.evaluator_id ? BigInt(body.evaluator_id) : null) : rec.evaluatorId,
      },
    });
    return jsonR(updated);
  } catch (e) { console.error(e); return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-interview-feedbacks")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recInterviewFeedback.findFirst({ where: { id: BigInt(id), createdBy: cid } });
    if (!rec) return notFound();
    await prisma.recInterviewFeedback.delete({ where: { id: BigInt(id) } });
    return jsonR({ success: true });
  } catch (e) { console.error(e); return serverError(); }
}
