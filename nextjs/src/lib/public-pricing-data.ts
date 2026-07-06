import "server-only";

import { prisma } from "@/lib/prisma";
import {
  ensureAddOnVersionColumn,
  ensureAffiliateBusinessAddOnRow,
  ensureComplianceAddOnRow,
  ensureExpenseManagementAddOnRow,
} from "@/lib/ensure-add-on-db";
import { sortPlansForDisplay } from "@/lib/plan-display-order";

export type PublicPricingPlan = {
  id: string;
  name: string | null;
  description: string | null;
  numberOfUsers: number;
  storageLimit: number;
  freePlan: boolean;
  modules: string[];
  packagePriceMonthly: string;
  packagePriceYearly: string;
  trial: boolean;
  trialDays: number;
  ordersCount: number;
};

export type PublicPricingAddOn = {
  module: string;
  alias: string;
  image: string | null;
  monthlyPrice: string;
  yearlyPrice: string;
};

export type PublicPricingPayload = {
  plans: PublicPricingPlan[];
  addOns: PublicPricingAddOn[];
};

function toModulesArray(modules: unknown): string[] {
  if (!Array.isArray(modules)) return [];
  return modules.filter((x): x is string => typeof x === "string");
}

export async function getPublicPricingData(): Promise<PublicPricingPayload> {
  if (!process.env.DATABASE_URL) {
    return { plans: [], addOns: [] };
  }

  await ensureAddOnVersionColumn(prisma);
  await ensureExpenseManagementAddOnRow(prisma);
  await ensureAffiliateBusinessAddOnRow(prisma);
  await ensureComplianceAddOnRow(prisma);

  const [planRows, orderCounts, addOnRows] = await Promise.all([
    prisma.plan.findMany({
      where: { status: true, customPlan: false },
      orderBy: [{ packagePriceMonthly: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        numberOfUsers: true,
        storageLimit: true,
        freePlan: true,
        modules: true,
        packagePriceMonthly: true,
        packagePriceYearly: true,
        trial: true,
        trialDays: true,
      },
    }),
    prisma.order.groupBy({
      by: ["planId"],
      where: {
        planId: { not: null },
        OR: [{ paymentStatus: "succeeded" }, { status: "succeeded" }],
      },
      _count: { _all: true },
    }),
    prisma.addOn.findMany({
      where: { isEnable: true, forAdmin: false },
      orderBy: [{ priority: "desc" }, { name: "asc" }],
      select: {
        module: true,
        name: true,
        image: true,
        monthlyPrice: true,
        yearlyPrice: true,
      },
    }),
  ]);

  const countsByPlan = new Map<string, number>();
  for (const r of orderCounts) {
    if (!r.planId) continue;
    countsByPlan.set(r.planId.toString(), r._count._all);
  }

  const plans: PublicPricingPlan[] = sortPlansForDisplay(
    planRows.map((p) => ({
      id: p.id.toString(),
      name: p.name,
      description: p.description,
      numberOfUsers: p.numberOfUsers,
      storageLimit: p.storageLimit,
      freePlan: p.freePlan,
      modules: toModulesArray(p.modules),
      packagePriceMonthly: p.packagePriceMonthly?.toString?.() ?? String(p.packagePriceMonthly ?? "0"),
      packagePriceYearly: p.packagePriceYearly?.toString?.() ?? String(p.packagePriceYearly ?? "0"),
      trial: p.trial,
      trialDays: p.trialDays,
      ordersCount: countsByPlan.get(p.id.toString()) ?? 0,
    })),
  );

  const seen = new Set<string>();
  const addOns: PublicPricingAddOn[] = [];
  for (const row of addOnRows) {
    const module = row.module.trim();
    if (!module || seen.has(module)) continue;
    seen.add(module);
    addOns.push({
      module,
      alias: row.name?.trim() || module,
      image: row.image,
      monthlyPrice: row.monthlyPrice?.toString?.() ?? String(row.monthlyPrice ?? "0"),
      yearlyPrice: row.yearlyPrice?.toString?.() ?? String(row.yearlyPrice ?? "0"),
    });
  }

  return { plans, addOns };
}
