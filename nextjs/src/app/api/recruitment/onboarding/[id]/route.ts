import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, notFound, serverError } from "@/lib/hrm-auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-candidate-onboardings")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const body = await req.json();
    if (body.type === "checklist") {
      const rec = await prisma.recOnboardingChecklist.findFirst({ where: { id: BigInt(id), createdBy: cid } });
      if (!rec) return notFound();
      const updated = await prisma.recOnboardingChecklist.update({ where: { id: BigInt(id) }, data: { name: body.name ?? rec.name, description: body.description !== undefined ? body.description : rec.description, isDefault: body.is_default ?? rec.isDefault, status: body.status ?? rec.status } });
      return jsonR(updated);
    }
    const rec = await prisma.recCandidateOnboarding.findFirst({ where: { id: BigInt(id), createdBy: cid } });
    if (!rec) return notFound();
    const updated = await prisma.recCandidateOnboarding.update({
      where: { id: BigInt(id) },
      data: { status: body.status ?? rec.status, startDate: body.start_date ? new Date(body.start_date) : rec.startDate, checklistId: body.checklist_id ? BigInt(body.checklist_id) : rec.checklistId },
    });
    return jsonR(updated);
  } catch (e) { console.error(e); return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-candidate-onboardings")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    if (body.type === "checklist") {
      const rec = await prisma.recOnboardingChecklist.findFirst({ where: { id: BigInt(id), createdBy: cid } });
      if (!rec) return notFound();
      await prisma.recOnboardingChecklist.delete({ where: { id: BigInt(id) } });
      return jsonR({ success: true });
    }
    const rec = await prisma.recCandidateOnboarding.findFirst({ where: { id: BigInt(id), createdBy: cid } });
    if (!rec) return notFound();
    await prisma.recCandidateOnboarding.delete({ where: { id: BigInt(id) } });
    return jsonR({ success: true });
  } catch (e) { console.error(e); return serverError(); }
}
