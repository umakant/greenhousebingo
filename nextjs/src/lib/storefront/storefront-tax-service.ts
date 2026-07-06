import { prisma } from "@/lib/prisma";

export type TaxLine = { label: string; ratePercent: number; amount: number };

/**
 * Day 33 — simple jurisdiction + percent rules; modular for future providers.
 */
export async function computeStorefrontTax(params: {
  organizationId: bigint;
  websiteId: bigint;
  country: string;
  region?: string | null;
  /** Taxable base after discounts, before tax. */
  taxableSubtotal: number;
}): Promise<{ taxTotal: number; lines: TaxLine[]; mode: "inclusive" | "exclusive" }> {
  const cc = params.country.trim().toUpperCase().slice(0, 2);
  const reg = (params.region ?? "").trim().toUpperCase();

  const settings = await prisma.storefrontTaxSettings.findFirst({
    where: {
      organizationId: params.organizationId,
      OR: [{ websiteId: params.websiteId }, { websiteId: null }],
    },
    orderBy: { websiteId: "desc" },
  });
  const mode = settings?.priceMode === "inclusive" ? "inclusive" : "exclusive";

  const rules = await prisma.storefrontTaxRule.findMany({
    where: {
      organizationId: params.organizationId,
      isActive: true,
      country: cc,
      OR: [{ websiteId: null }, { websiteId: params.websiteId }],
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  let rate = 0;
  for (const r of rules) {
    const rr = (r.region ?? "").trim().toUpperCase();
    if (rr && rr !== reg) continue;
    rate = Number(r.ratePercent);
    break;
  }

  const base = Math.max(0, params.taxableSubtotal);
  let taxAmount = 0;
  if (mode === "exclusive") {
    taxAmount = (base * rate) / 100;
  } else {
    // prices include tax — extract tax from subtotal for display/storage
    if (rate > 0) {
      taxAmount = base - base / (1 + rate / 100);
    }
  }
  taxAmount = Math.round(taxAmount * 100) / 100;

  const lines: TaxLine[] =
    rate > 0
      ? [{ label: `Tax (${cc}${reg ? ` ${reg}` : ""})`, ratePercent: rate, amount: taxAmount }]
      : [];

  return { taxTotal: taxAmount, lines, mode };
}
