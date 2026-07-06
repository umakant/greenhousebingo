import { prisma } from "@/lib/prisma";
import { shippingAmountForMethod } from "@/lib/storefront/shipping-rates";

/**
 * Resolves flat shipping from DB zones (Day 32) or falls back to built-in flat map.
 */
export async function resolveStorefrontShippingAmount(params: {
  organizationId: bigint;
  websiteId: bigint;
  country: string;
  shippingMethodKey: string;
}): Promise<number> {
  const cc = params.country.trim().toUpperCase().slice(0, 2);

  const zones = await prisma.storefrontShippingZone.findMany({
    where: {
      organizationId: params.organizationId,
      isActive: true,
      OR: [{ websiteId: null }, { websiteId: params.websiteId }],
    },
    include: {
      methods: {
        where: { isActive: true, methodKey: params.shippingMethodKey },
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  for (const z of zones) {
    const countries = z.countries as unknown;
    const list = Array.isArray(countries) ? countries.map((c) => String(c).toUpperCase().slice(0, 2)) : [];
    if (list.length && !list.includes(cc)) continue;
    const m = z.methods[0];
    if (m) return Number(m.flatRate);
  }

  return shippingAmountForMethod(params.shippingMethodKey);
}
