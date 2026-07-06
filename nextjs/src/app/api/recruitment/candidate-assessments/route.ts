import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, serverError } from "@/lib/hrm-auth";

export async function GET(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-candidate-assessments")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page") ?? 15)));
    const candidateId = searchParams.get("candidate_id") ?? "";
    const passFailStatus = searchParams.get("pass_fail_status") ?? "";
    const where: Record<string, unknown> = { createdBy: cid };
    if (candidateId) where.candidateId = BigInt(candidateId);
    if (passFailStatus) where.passFailStatus = passFailStatus;
    const [data, total] = await Promise.all([
      prisma.recCandidateAssessment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.recCandidateAssessment.count({ where }),
    ]);
    return jsonR({ data, total, page, per_page: perPage });
  } catch (e) { console.error(e); return serverError(); }
}

export async function POST(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-candidate-assessments")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const body = await req.json();
    const rec = await prisma.recCandidateAssessment.create({
      data: {
        assessmentName: body.assessment_name ?? "",
        score: body.score ? Number(body.score) : null,
        maxScore: body.max_score ? Number(body.max_score) : null,
        passFailStatus: body.pass_fail_status ?? "0",
        comments: body.comments ?? null,
        assessmentDate: body.assessment_date ?? new Date().toISOString().slice(0, 10),
        candidateId: body.candidate_id ? BigInt(body.candidate_id) : null,
        conductedBy: body.conducted_by ? BigInt(body.conducted_by) : null,
        creatorId: actor.id,
        createdBy: cid,
      },
    });
    return jsonR(rec, { status: 201 });
  } catch (e) { console.error(e); return serverError(); }
}
