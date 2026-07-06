import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCrmActor,
  getCrmPerms,
  checkPerm,
  getCompanyId,
  jsonR,
  unauthorized,
  forbidden,
  serverError,
  parseOptionalBigIntField,
} from "@/lib/crm-auth";
import { getSettingsForOwner } from "@/lib/settings-service";
import { isCompanyEmailNotificationEnabled, sendTemplatedEmailAsync } from "@/lib/send-templated-email";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "manage-deals", "view-deals", "manage-crm")) return forbidden();
  try {
    const { id } = await params;
    const deal = await prisma.crmDeal.findUnique({
      where: { id: BigInt(id) },
      include: {
        pipeline: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, color: true } },
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
        activities: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!deal) return jsonR({ ok: false, message: "Not found" }, 404);
    return jsonR({ ok: true, data: deal });
  } catch (e) { return serverError(e); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "edit-deals", "manage-deals", "manage-crm")) return forbidden();
  try {
    const { id } = await params;
    const body = await req.json();
    const cid = getCompanyId(actor);
    const prev = await prisma.crmDeal.findFirst({
      where: { id: BigInt(id), createdBy: cid },
      include: {
        pipeline: { select: { name: true } },
        stage: { select: { name: true } },
        lead: { select: { email: true } },
      },
    });
    if (!prev) return jsonR({ ok: false, message: "Not found" }, 404);

    const amountRaw = body.amount;
    const amount =
      amountRaw !== undefined && amountRaw !== null && String(amountRaw).trim() !== ""
        ? Number(amountRaw)
        : null;
    const closeRaw = body.close_date;
    const closeDate =
      closeRaw !== undefined && closeRaw !== null && String(closeRaw).trim() !== ""
        ? new Date(String(closeRaw))
        : null;
    if (closeDate && Number.isNaN(closeDate.getTime())) {
      return jsonR({ ok: false, message: "Invalid close date" }, 422);
    }

    const deal = await prisma.crmDeal.update({
      where: { id: BigInt(id) },
      data: {
        name: body.name,
        amount: amount !== null && !Number.isNaN(amount) ? amount : null,
        status: body.status ?? "open",
        pipelineId: parseOptionalBigIntField(body.pipeline_id),
        stageId: parseOptionalBigIntField(body.stage_id),
        leadId: parseOptionalBigIntField(body.lead_id),
        assignedTo: parseOptionalBigIntField(body.assigned_to),
        closeDate,
        notes: body.notes ?? null,
      },
      include: {
        pipeline: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, color: true } },
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (prev.stageId && deal.stageId && prev.stageId !== deal.stageId) {
      const settings = await getSettingsForOwner(cid);
      if (isCompanyEmailNotificationEnabled(settings, "Deal Moved")) {
        const recipients: string[] = [];
        if (deal.lead?.email?.trim()) recipients.push(deal.lead.email.trim());
        if (deal.assignedTo) {
          const u = await prisma.user.findFirst({
            where: { id: deal.assignedTo },
            select: { email: true },
          });
          if (u?.email?.trim()) recipients.push(u.email.trim());
        }
        const uniq = [...new Set(recipients)];
        if (uniq.length) {
          const amount = deal.amount != null ? String(deal.amount) : "-";
          sendTemplatedEmailAsync({
            templateName: "Deal Moved",
            mailTo: uniq,
            ownerId: cid,
            variables: {
              deal_name: deal.name,
              deal_pipeline: deal.pipeline?.name ?? "-",
              deal_stage: deal.stage?.name ?? "-",
              deal_status: deal.status,
              deal_price: amount,
              deal_old_stage: prev.stage?.name ?? "-",
              deal_new_stage: deal.stage?.name ?? "-",
            },
          });
        }
      }
    }

    return jsonR({ ok: true, data: deal });
  } catch (e) { return serverError(e); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "delete-deals", "manage-deals", "manage-crm")) return forbidden();
  try {
    const { id } = await params;
    await prisma.crmDeal.delete({ where: { id: BigInt(id) } });
    return jsonR({ ok: true });
  } catch (e) { return serverError(e); }
}
