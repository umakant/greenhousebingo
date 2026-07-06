import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, serverError } from "@/lib/hrm-auth";

export async function GET(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-candidate-onboardings")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page") ?? 15)));
    const status = searchParams.get("status") ?? "";
    const tab = searchParams.get("tab") ?? "onboardings";
    if (tab === "checklists") {
      const where = { createdBy: cid };
      const [data, total] = await Promise.all([
        prisma.recOnboardingChecklist.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * perPage, take: perPage, include: { items: true } }),
        prisma.recOnboardingChecklist.count({ where }),
      ]);
      return jsonR({ data, total, page, per_page: perPage, tab });
    }
    const where: Record<string, unknown> = { createdBy: cid };
    if (status !== "") where.status = status;
    const [data, total] = await Promise.all([
      prisma.recCandidateOnboarding.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { candidate: { select: { id: true, firstName: true, lastName: true, email: true } }, checklist: { select: { id: true, name: true } } },
      }),
      prisma.recCandidateOnboarding.count({ where }),
    ]);
    return jsonR({ data, total, page, per_page: perPage, tab });
  } catch (e) { console.error(e); return serverError(); }
}

export async function POST(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-candidate-onboardings")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const body = await req.json();
    if (body.type === "checklist") {
      const rec = await prisma.recOnboardingChecklist.create({
        data: { name: body.name ?? "", description: body.description ?? null, isDefault: body.is_default ?? false, status: body.status ?? true, creatorId: actor.id, createdBy: cid },
      });
      return jsonR(rec, { status: 201 });
    }
    const rec = await prisma.recCandidateOnboarding.create({
      data: {
        startDate: new Date(body.start_date ?? new Date()),
        status: body.status ?? "Pending",
        candidateId: BigInt(body.candidate_id),
        checklistId: BigInt(body.checklist_id),
        buddyEmployeeId: body.buddy_employee_id ? BigInt(body.buddy_employee_id) : null,
        creatorId: actor.id,
        createdBy: cid,
      },
    });
    return jsonR(rec, { status: 201 });
  } catch (e) { console.error(e); return serverError(); }
}
