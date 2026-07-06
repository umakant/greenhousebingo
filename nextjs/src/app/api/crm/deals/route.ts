import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
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

export async function GET(req: NextRequest) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "manage-deals", "view-deals", "manage-crm")) return forbidden();

  try {
    const cid = getCompanyId(actor);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page") || "15")));
    const search = (searchParams.get("search") || "").trim();
    const pipelineId = searchParams.get("pipeline_id");
    const stageId = searchParams.get("stage_id");
    const status = searchParams.get("status");
    const leadId = searchParams.get("lead_id");

    const where: Prisma.CrmDealWhereInput = { createdBy: cid };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
      ];
    }
    if (pipelineId) where.pipelineId = BigInt(pipelineId);
    if (stageId) where.stageId = BigInt(stageId);
    if (status) where.status = status;
    if (leadId) where.leadId = BigInt(leadId);

    const total = await prisma.crmDeal.count({ where });
    const data = await prisma.crmDeal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        pipeline: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, color: true } },
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
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
  if (!checkPerm(perms, "create-deals", "manage-deals", "manage-crm")) return forbidden();

  try {
    const cid = getCompanyId(actor);
    const body = await req.json();
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

    const deal = await prisma.crmDeal.create({
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
        createdBy: cid,
      },
      include: {
        pipeline: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, color: true } },
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    const settings = await getSettingsForOwner(cid);
    if (isCompanyEmailNotificationEnabled(settings, "Deal Assigned")) {
      const recipients: string[] = [];
      if (deal.lead?.email?.trim()) recipients.push(deal.lead.email.trim());
      if (recipients.length === 0 && deal.assignedTo) {
        const u = await prisma.user.findFirst({
          where: { id: deal.assignedTo },
          select: { email: true },
        });
        if (u?.email?.trim()) recipients.push(u.email.trim());
      }
      if (recipients.length) {
        const amount = deal.amount != null ? String(deal.amount) : "-";
        sendTemplatedEmailAsync({
          templateName: "Deal Assigned",
          mailTo: recipients,
          ownerId: cid,
          variables: {
            deal_name: deal.name,
            deal_pipeline: deal.pipeline?.name ?? "-",
            deal_stage: deal.stage?.name ?? "-",
            deal_status: deal.status,
            deal_price: amount,
          },
        });
      }
    }

    return jsonR({ ok: true, data: deal }, 201);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return jsonR(
          {
            ok: false,
            message:
              "Could not create deal (id sequence out of sync). Run on the server: npm run db:sync:crm-sequences",
          },
          409,
        );
      }
    }
    return serverError(e);
  }
}
