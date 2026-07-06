import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCrmActor, getCrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, serverError, parseOptionalBigIntField } from "@/lib/crm-auth";
import { getSettingsForOwner } from "@/lib/settings-service";
import { isCompanyEmailNotificationEnabled, sendTemplatedEmailAsync } from "@/lib/send-templated-email";
import { formatCrmLeadFullName } from "@/lib/crm-lead-name";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "manage-leads", "view-leads", "create-leads", "manage-crm")) return forbidden();
  try {
    const { id } = await params;
    const lead = await prisma.crmLead.findUnique({
      where: { id: BigInt(id) },
      include: {
        pipeline: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, color: true } },
        activities: { orderBy: { createdAt: "desc" }, take: 20 },
        deals: { orderBy: { createdAt: "desc" }, select: { id: true, name: true, amount: true, status: true } },
      },
    });
    if (!lead) return jsonR({ ok: false, message: "Not found" }, 404);
    return jsonR({ ok: true, data: lead });
  } catch (e) { return serverError(e); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "edit-leads", "manage-leads", "manage-crm")) return forbidden();
  try {
    const { id } = await params;
    const body = await req.json();
    const firstName = String(body.first_name ?? "").trim();
    if (!firstName) {
      return jsonR({ ok: false, message: "First name is required" }, 422);
    }
    const lastNameRaw = body.last_name != null && String(body.last_name).trim() !== "" ? String(body.last_name).trim() : null;
    const full = formatCrmLeadFullName(firstName, lastNameRaw);
    const displayName = full === "—" ? firstName : full;
    const cid = getCompanyId(actor);
    const prev = await prisma.crmLead.findFirst({
      where: { id: BigInt(id), createdBy: cid },
      include: {
        pipeline: { select: { name: true } },
        stage: { select: { name: true } },
      },
    });
    if (!prev) return jsonR({ ok: false, message: "Not found" }, 404);

    const lead = await prisma.crmLead.update({
      where: { id: BigInt(id) },
      data: {
        name: displayName,
        firstName,
        lastName: lastNameRaw,
        email: body.email ?? null,
        phone: body.phone ?? null,
        company: body.company ?? null,
        source: body.source ?? null,
        status: body.status ?? "new",
        value: body.value ? Number(body.value) : null,
        notes: body.notes ?? null,
        pipelineId: body.pipeline_id ? BigInt(body.pipeline_id) : null,
        stageId: body.stage_id ? BigInt(body.stage_id) : null,
        assignedTo: body.assigned_to ? BigInt(body.assigned_to) : null,
      },
      include: {
        pipeline: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, color: true } },
      },
    });

    if (prev.stageId && lead.stageId && prev.stageId !== lead.stageId) {
      const settings = await getSettingsForOwner(cid);
      if (isCompanyEmailNotificationEnabled(settings, "Lead Moved")) {
        const recipients: string[] = [];
        if (lead.email?.trim()) recipients.push(lead.email.trim());
        if (lead.assignedTo) {
          const u = await prisma.user.findFirst({
            where: { id: lead.assignedTo },
            select: { email: true },
          });
          if (u?.email?.trim()) recipients.push(u.email.trim());
        }
        const uniq = [...new Set(recipients)];
        if (uniq.length) {
          sendTemplatedEmailAsync({
            templateName: "Lead Moved",
            mailTo: uniq,
            ownerId: cid,
            variables: {
              lead_name: formatCrmLeadFullName(lead.firstName, lead.lastName),
              lead_email: lead.email ?? "-",
              lead_pipeline: lead.pipeline?.name ?? "-",
              lead_stage: lead.stage?.name ?? "-",
              lead_old_stage: prev.stage?.name ?? "-",
              lead_new_stage: lead.stage?.name ?? "-",
            },
          });
        }
      }
    }

    return jsonR({ ok: true, data: lead });
  } catch (e) { return serverError(e); }
}

/** Partial update (e.g. Kanban drag: stage / pipeline only). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "edit-leads", "manage-leads", "manage-crm")) return forbidden();
  try {
    const { id } = await params;
    const cid = getCompanyId(actor);
    const body = (await req.json()) as {
      pipeline_id?: unknown;
      stage_id?: unknown;
      notes?: unknown;
      status?: unknown;
    };

    const prev = await prisma.crmLead.findFirst({
      where: { id: BigInt(id), createdBy: cid },
      include: {
        pipeline: { select: { name: true } },
        stage: { select: { name: true } },
      },
    });
    if (!prev) return jsonR({ ok: false, message: "Not found" }, 404);

    let nextPipelineId = prev.pipelineId;
    if ("pipeline_id" in body) {
      nextPipelineId = parseOptionalBigIntField(body.pipeline_id);
    }

    const pipelineChanged =
      "pipeline_id" in body &&
      (prev.pipelineId?.toString() ?? null) !== (nextPipelineId?.toString() ?? null);

    let nextStageId: bigint | null | undefined = undefined;
    if ("stage_id" in body) {
      const raw = body.stage_id;
      if (raw === null || raw === undefined || raw === "") {
        nextStageId = null;
      } else {
        const sid = parseOptionalBigIntField(raw);
        if (!sid) {
          return jsonR({ ok: false, message: "Invalid stage" }, 400);
        }
        const pid = nextPipelineId ?? prev.pipelineId;
        if (!pid) {
          return jsonR({ ok: false, message: "Set a pipeline before assigning a stage" }, 400);
        }
        const stage = await prisma.crmPipelineStage.findFirst({
          where: { id: sid, pipelineId: pid },
        });
        if (!stage) {
          return jsonR({ ok: false, message: "Stage does not belong to this pipeline" }, 400);
        }
        nextStageId = sid;
      }
    }

    const data: {
      pipelineId?: bigint | null;
      stageId?: bigint | null;
      notes?: string | null;
      status?: string;
      updatedAt: Date;
    } = { updatedAt: new Date() };
    if ("pipeline_id" in body) data.pipelineId = nextPipelineId;
    if ("stage_id" in body) {
      data.stageId = nextStageId ?? null;
    } else if (pipelineChanged) {
      data.stageId = null;
    }
    if ("notes" in body) {
      data.notes = body.notes != null ? String(body.notes) : null;
    }
    if ("status" in body && typeof body.status === "string" && body.status.trim()) {
      data.status = body.status.trim();
    }

    const lead = await prisma.crmLead.update({
      where: { id: BigInt(id) },
      data,
      include: {
        pipeline: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, color: true } },
      },
    });

    if (prev.stageId !== lead.stageId && (prev.stageId || lead.stageId)) {
      const settings = await getSettingsForOwner(cid);
      if (isCompanyEmailNotificationEnabled(settings, "Lead Moved")) {
        const recipients: string[] = [];
        if (lead.email?.trim()) recipients.push(lead.email.trim());
        if (lead.assignedTo) {
          const u = await prisma.user.findFirst({
            where: { id: lead.assignedTo },
            select: { email: true },
          });
          if (u?.email?.trim()) recipients.push(u.email.trim());
        }
        const uniq = [...new Set(recipients)];
        if (uniq.length) {
          sendTemplatedEmailAsync({
            templateName: "Lead Moved",
            mailTo: uniq,
            ownerId: cid,
            variables: {
              lead_name: formatCrmLeadFullName(lead.firstName, lead.lastName),
              lead_email: lead.email ?? "-",
              lead_pipeline: lead.pipeline?.name ?? "-",
              lead_stage: lead.stage?.name ?? "-",
              lead_old_stage: prev.stage?.name ?? "-",
              lead_new_stage: lead.stage?.name ?? "-",
            },
          });
        }
      }
    }

    return jsonR({ ok: true, data: lead });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "delete-leads", "manage-leads", "manage-crm")) return forbidden();
  try {
    const { id } = await params;
    await prisma.crmLead.delete({ where: { id: BigInt(id) } });
    return jsonR({ ok: true });
  } catch (e) { return serverError(e); }
}
