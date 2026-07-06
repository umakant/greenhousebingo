import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCrmActor, getCompanyId, jsonR, unauthorized, serverError } from "@/lib/crm-auth";
import { formatCrmLeadFullName } from "@/lib/crm-lead-name";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();

  try {
    const cid = getCompanyId(actor);
    const url = new URL(req.url);
    const pipelineId = url.searchParams.get("pipeline_id");

    const [
      totalLeads,
      totalDeals,
      totalUsers,
      totalClients,
      openPipelineValue,
      leadsByStatusRaw,
      timelineDeals,
      recentLeads,
      recentDeals,
      allPipelineStages,
      pipelines,
      leadActivities,
    ] = await Promise.all([
      prisma.crmLead.count({ where: { createdBy: cid } }),
      prisma.crmDeal.count({ where: { createdBy: cid } }),
      prisma.user.count({ where: { createdBy: cid, type: "staff" } }).catch(() => 0),
      prisma.user.count({ where: { createdBy: cid, type: "client" } }).catch(() => 0),
      prisma.crmDeal.aggregate({
        where: { createdBy: cid, status: "open" },
        _sum: { amount: true },
      }),
      prisma.crmLead.groupBy({
        by: ["status"],
        where: { createdBy: cid },
        _count: { id: true },
      }),
      prisma.crmDeal.findMany({
        where: { createdBy: cid },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, name: true, createdAt: true, status: true, amount: true },
      }),
      prisma.crmLead.findMany({
        where: { createdBy: cid },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, firstName: true, lastName: true, company: true, status: true, source: true, createdAt: true,
          stage: { select: { name: true, color: true } } },
      }),
      prisma.crmDeal.findMany({
        where: { createdBy: cid },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, name: true, amount: true, status: true, createdAt: true,
          stage: { select: { name: true, color: true } },
          lead: { select: { firstName: true, lastName: true } } },
      }),
      // Deals by stage — filter by pipeline if selected
      prisma.crmDeal.findMany({
        where: {
          createdBy: cid,
          stageId: { not: null },
          ...(pipelineId ? { pipelineId: BigInt(pipelineId) } : {}),
        },
        select: { amount: true, stage: { select: { name: true, color: true, order: true } } },
      }).then((deals) => {
        const map: Record<string, { name: string; color: string; deals: number; value: number; order: number }> = {};
        for (const d of deals) {
          if (!d.stage) continue;
          const k = d.stage.name;
          if (!map[k]) map[k] = { name: k, color: d.stage.color, deals: 0, value: 0, order: d.stage.order };
          map[k].deals++;
          map[k].value += Number(d.amount ?? 0);
        }
        return Object.values(map).sort((a, b) => a.order - b.order);
      }),
      prisma.crmPipeline.findMany({
        where: { createdBy: cid },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      }),
      // Lead activities for calendar
      prisma.crmLeadActivity.findMany({
        where: { lead: { createdBy: cid } },
        orderBy: { createdAt: "asc" },
        take: 200,
        include: { lead: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    // Build calendar events from lead activities
    const calendarEvents = leadActivities.map((act) => ({
      id: Number(act.id).toString(),
      title: act.note,
      startDate: act.createdAt.toISOString().slice(0, 10),
      endDate: act.createdAt.toISOString().slice(0, 10),
      type: act.type,
      color: act.type === "call" ? "#3b82f6" : act.type === "meeting" ? "#10b981" : "#8b5cf6",
      leadName: act.lead ? formatCrmLeadFullName(act.lead.firstName, act.lead.lastName) : null,
    }));

    const leadsByStatus = leadsByStatusRaw.map((r) => ({
      status: r.status,
      count: r._count.id,
    }));
    const pipelineValueNum = openPipelineValue._sum.amount != null ? Number(openPipelineValue._sum.amount) : 0;

    return jsonR({
      ok: true,
      stats: {
        total_leads: totalLeads,
        total_deals: totalDeals,
        total_users: totalUsers,
        total_clients: totalClients,
        open_pipeline_value: pipelineValueNum,
      },
      leadsByStatus,
      timelineDeals: timelineDeals.map((d) => ({
        id: Number(d.id),
        name: d.name,
        status: d.status,
        created_at: d.createdAt?.toISOString?.() ?? "",
        amount: d.amount != null ? Number(d.amount) : null,
      })),
      dealStageChart: allPipelineStages,
      calendarEvents,
      dealCallsChart: [],
      recentDeals: recentDeals.map((d) => ({
        id: Number(d.id), name: d.name, created_at: d.createdAt, stage: d.stage ?? null,
        amount: d.amount, status: d.status,
      })),
      recentLeads: recentLeads.map((l) => ({
        id: Number(l.id),
        name: formatCrmLeadFullName(l.firstName, l.lastName),
        subject: l.company ?? l.source ?? l.status ?? "",
        created_at: l.createdAt, stage: l.stage ?? null, status: l.status,
      })),
      pipelines: pipelines.map((p) => ({ id: Number(p.id).toString(), name: p.name })),
    });
  } catch (e) { return serverError(e); }
}
