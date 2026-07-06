import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCrmActor, getCrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, serverError } from "@/lib/crm-auth";
import { backfillOrphanCrmLeads, ensureDefaultCrmPipeline, resolveDefaultLeadPlacement } from "@/lib/crm-default-pipeline";
import { getSettingsForOwner } from "@/lib/settings-service";
import { isCompanyEmailNotificationEnabledLoose, sendTemplatedEmailAsync } from "@/lib/send-templated-email";
import { formatCrmLeadFullName } from "@/lib/crm-lead-name";

export async function GET(req: NextRequest) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "manage-leads", "view-leads", "create-leads", "manage-crm")) return forbidden();

  try {
    const cid = getCompanyId(actor);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const board = searchParams.get("board") === "1";
    const maxPer = board ? 500 : 100;
    const perPage = Math.min(maxPer, Math.max(1, Number(searchParams.get("per_page") || (board ? "500" : "15"))));
    const search = (searchParams.get("search") || "").trim();
    const pipelineId = searchParams.get("pipeline_id");
    const stageId = searchParams.get("stage_id");
    const status = searchParams.get("status");

    const where: Prisma.CrmLeadWhereInput = { createdBy: cid };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    if (pipelineId) {
      if (board) {
        await backfillOrphanCrmLeads(cid, BigInt(pipelineId));
      }
      where.pipelineId = BigInt(pipelineId);
    }
    if (stageId) where.stageId = BigInt(stageId);
    if (status) where.status = status;

    const total = await prisma.crmLead.count({ where });
    const data = await prisma.crmLead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        pipeline: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, color: true } },
      },
    });

    return jsonR({
      ok: true,
      data,
      pagination: { page, perPage, total, lastPage: Math.max(1, Math.ceil(total / perPage)) },
    });
  } catch (e) { return serverError(e); }
}

export async function POST(req: NextRequest) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "create-leads", "manage-leads", "manage-crm")) return forbidden();

  try {
    const cid = getCompanyId(actor);
    const body = await req.json();
    const firstName = String(body.first_name ?? "").trim();
    if (!firstName) {
      return jsonR({ ok: false, message: "First name is required" }, 422);
    }
    const lastNameRaw = body.last_name != null && String(body.last_name).trim() !== "" ? String(body.last_name).trim() : null;
    const full = formatCrmLeadFullName(firstName, lastNameRaw);
    const displayName = full === "—" ? firstName : full;

    let pipelineId = body.pipeline_id ? BigInt(body.pipeline_id) : null;
    let stageId = body.stage_id ? BigInt(body.stage_id) : null;
    if (!pipelineId) {
      const placement = await resolveDefaultLeadPlacement(cid);
      if (placement) {
        pipelineId = placement.pipelineId;
        if (!stageId) stageId = placement.stageId;
      }
    }

    const lead = await prisma.crmLead.create({
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
        pipelineId,
        stageId,
        assignedTo: body.assigned_to ? BigInt(body.assigned_to) : null,
        createdBy: cid,
      },
      include: {
        pipeline: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, color: true } },
      },
    });

    if (lead.assignedTo) {
      const settings = await getSettingsForOwner(cid);
      if (isCompanyEmailNotificationEnabledLoose(settings, "Lead Assigned")) {
        const assignee = await prisma.user.findFirst({
          where: { id: lead.assignedTo },
          select: { email: true },
        });
        if (assignee?.email?.trim()) {
          sendTemplatedEmailAsync({
            templateName: "Lead Assigned",
            mailTo: [assignee.email.trim()],
            ownerId: cid,
            variables: {
              lead_name: formatCrmLeadFullName(lead.firstName, lead.lastName),
              lead_email: lead.email ?? "-",
              lead_pipeline: lead.pipeline?.name ?? "-",
              lead_stage: lead.stage?.name ?? "-",
            },
          });
        }
      }
    }

    return jsonR({ ok: true, data: lead }, 201);
  } catch (e) { return serverError(e); }
}
