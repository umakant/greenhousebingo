import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCrmActor, getCrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, serverError } from "@/lib/crm-auth";

export async function GET(req: NextRequest) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "view-reports", "manage-deals", "manage-crm")) return forbidden();

  try {
    const cid = getCompanyId(actor);
    const { searchParams } = new URL(req.url);
    const days = Math.min(365, Math.max(7, Number(searchParams.get("days") || "30")));
    const since = new Date(Date.now() - days * 86400000);

    const [total, byStatus, byStage, totalValue, recent] = await Promise.all([
      prisma.crmDeal.count({ where: { createdBy: cid } }),
      prisma.crmDeal.groupBy({
        by: ["status"],
        where: { createdBy: cid },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.crmDeal.findMany({
        where: { createdBy: cid, stageId: { not: null } },
        include: { stage: { select: { id: true, name: true, color: true } } },
      }).then((deals) => {
        const map: Record<string, { name: string; color: string; count: number; value: number }> = {};
        for (const d of deals) {
          if (!d.stage) continue;
          const k = d.stage.id.toString();
          if (!map[k]) map[k] = { name: d.stage.name, color: d.stage.color, count: 0, value: 0 };
          map[k].count++;
          map[k].value += Number(d.amount ?? 0);
        }
        return Object.values(map);
      }),
      prisma.crmDeal.aggregate({ where: { createdBy: cid }, _sum: { amount: true } }),
      prisma.crmDeal.findMany({
        where: { createdBy: cid, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          pipeline: { select: { id: true, name: true } },
          stage: { select: { id: true, name: true, color: true } },
          lead: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return jsonR({
      ok: true,
      data: {
        total,
        totalValue: Number(totalValue._sum.amount ?? 0),
        byStatus: byStatus.map((r) => ({ status: r.status, count: r._count.id, value: Number(r._sum.amount ?? 0) })),
        byStage,
        recent,
      },
    });
  } catch (e) { return serverError(e); }
}
