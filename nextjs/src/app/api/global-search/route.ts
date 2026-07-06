import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { hasPermission, isSuperAdminSession } from "@/lib/authz";
import { checkPerm, getCompanyId, getHrmActor, getHrmPerms } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

type CompanyHit = {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  planName: string | null;
};

type UserHit = {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ ok: true, companies: [] as CompanyHit[], users: [] as UserHit[] });
  }

  const perms = await getPermissionsFromRequest(req);
  const superSession = isSuperAdminSession(req);

  const companiesOut: CompanyHit[] = [];
  const usersOut: UserHit[] = [];

  if (superSession && hasPermission(perms, "manage-users")) {
    const planHits = await prisma.plan.findMany({
      where: { name: { contains: q, mode: "insensitive" }, status: true },
      select: { id: true },
    });
    const planNums = planHits
      .map((p) => Number(p.id))
      .filter((n) => Number.isSafeInteger(n));

    const whereCompany: {
      type: { in: string[] };
      OR: Record<string, unknown>[];
    } = {
      type: { in: ["company", "company_admin"] },
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
        { slug: { contains: q, mode: "insensitive" as const } },
        ...(planNums.length ? [{ activePlan: { in: planNums } }] : []),
      ],
    };

    const rows = await prisma.user.findMany({
      where: whereCompany,
      take: 12,
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, activePlan: true },
    });

    const planNameByNumId = new Map<number, string>();
    const needPlanIds = [
      ...new Set(rows.map((r) => r.activePlan).filter((x): x is number => x != null && Number.isInteger(x))),
    ];
    if (needPlanIds.length) {
      const plans = await prisma.plan.findMany({
        where: { id: { in: needPlanIds.map((id) => BigInt(id)) } },
        select: { id: true, name: true },
      });
      for (const p of plans) {
        const n = Number(p.id);
        if (Number.isSafeInteger(n)) planNameByNumId.set(n, p.name ?? "—");
      }
    }

    for (const r of rows) {
      const planName = r.activePlan != null ? planNameByNumId.get(r.activePlan) ?? null : null;
      const subtitleParts = [r.email, planName ? planName : null].filter(Boolean);
      companiesOut.push({
        id: r.id.toString(),
        title: r.name ?? r.email ?? "—",
        subtitle: subtitleParts.length ? subtitleParts.join(" · ") : null,
        href: `/companies/${r.id}`,
        planName,
      });
    }
  }

  if (!superSession) {
    const actor = await getHrmActor(req);
    if (actor && checkPerm(getHrmPerms(req), "manage-user")) {
      const companyId = getCompanyId(actor);
      const userRows = await prisma.user.findMany({
        where: {
          createdBy: companyId,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 12,
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, type: true },
      });
      for (const u of userRows) {
        const email = u.email ?? "";
        const label = u.name ?? email ?? "—";
        usersOut.push({
          id: u.id.toString(),
          title: label,
          subtitle: [email, u.type].filter(Boolean).join(" · ") || null,
          href: `/user-management/users?search=${encodeURIComponent(email || label)}`,
        });
      }
    }
  }

  return NextResponse.json({ ok: true, companies: companiesOut, users: usersOut });
}
