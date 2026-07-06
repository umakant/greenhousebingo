import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, notFound, serverError } from "@/lib/hrm-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-candidate-assessments")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recCandidateAssessment.findFirst({
      where: { id: BigInt(id), createdBy: cid },
      include: { candidate: true },
    });
    if (!rec) return notFound();
    return jsonR(rec);
  } catch (e) { console.error(e); return serverError(); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-candidate-assessments")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recCandidateAssessment.findFirst({ where: { id: BigInt(id), createdBy: cid } });
    if (!rec) return notFound();
    const body = await req.json();
    const updated = await prisma.recCandidateAssessment.update({
      where: { id: BigInt(id) },
      data: {
        assessmentName: body.assessment_name ?? rec.assessmentName,
        score: body.score !== undefined ? (body.score ? Number(body.score) : null) : rec.score,
        maxScore: body.max_score !== undefined ? (body.max_score ? Number(body.max_score) : null) : rec.maxScore,
        passFailStatus: body.pass_fail_status ?? rec.passFailStatus,
        comments: body.comments !== undefined ? body.comments : rec.comments,
        assessmentDate: body.assessment_date ?? rec.assessmentDate,
        candidateId: body.candidate_id !== undefined ? (body.candidate_id ? BigInt(body.candidate_id) : null) : rec.candidateId,
        conductedBy: body.conducted_by !== undefined ? (body.conducted_by ? BigInt(body.conducted_by) : null) : rec.conductedBy,
      },
    });
    return jsonR(updated);
  } catch (e) { console.error(e); return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-candidate-assessments")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recCandidateAssessment.findFirst({ where: { id: BigInt(id), createdBy: cid } });
    if (!rec) return notFound();
    await prisma.recCandidateAssessment.delete({ where: { id: BigInt(id) } });
    return jsonR({ success: true });
  } catch (e) { console.error(e); return serverError(); }
}
