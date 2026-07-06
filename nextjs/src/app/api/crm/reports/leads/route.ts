import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCrmActor, getCrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, serverError } from "@/lib/crm-auth";

export async function GET(req: NextRequest) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "view-reports", "manage-leads", "manage-crm")) return forbidden();

  try {
    const cid = getCompanyId(actor);
    const { searchParams } = new URL(req.url);
    const days = Math.min(365, Math.max(7, Number(searchParams.get("days") || "30")));
    const since = new Date(Date.now() - days * 86400000);

    const [total, byStatus, bySource, recent] = await Promise.all([
      prisma.crmLead.count({ where: { createdBy: cid } }),
      prisma.crmLead.groupBy({
        by: ["status"],
        where: { createdBy: cid },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.crmLead.groupBy({
        by: ["source"],
        where: { createdBy: cid, source: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.crmLead.findMany({
        where: { createdBy: cid, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          pipeline: { select: { id: true, name: true } },
          stage: { select: { id: true, name: true, color: true } },
        },
      }),
    ]);

    return jsonR({
      ok: true,
      data: {
        total,
        byStatus: byStatus.map((r) => ({ status: r.status, count: r._count.id })),
        bySource: bySource.map((r) => ({ source: r.source ?? "Unknown", count: r._count.id })),
        recent,
      },
    });
  } catch (e) { return serverError(e); }
}
