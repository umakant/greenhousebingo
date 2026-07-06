import { NextResponse, type NextRequest } from "next/server";

import { validateCart, type IncomingCartItem } from "@/lib/marketplace-cart";
import { guardMarketplaceCompany } from "@/lib/marketplace-company-api-guard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = await guardMarketplaceCompany(req, "marketplace.view");
  if (!guard.ok) return guard.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const rawItems = (Array.isArray(body.items) ? body.items : []) as IncomingCartItem[];

  const result = await validateCart(rawItems);
  if (!result.ok) {
    return NextResponse.json({ ok: false, valid: false, message: result.message }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    valid: result.meetsMinimum,
    vendorId: result.vendorId.toString(),
    vendorName: result.vendorName,
    currency: result.currency,
    minBuckets: result.pricing.minBuckets,
    totals: result.totals,
    lines: result.lines.map((l) => ({
      productId: l.productId.toString(),
      name: l.name,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      totalPrice: l.totalPrice,
      bucketCountValue: l.bucketCountValue,
    })),
    issues: result.meetsMinimum
      ? []
      : [
          `Minimum order is ${result.pricing.minBuckets} buckets for delivery. Your cart has ${result.totals.totalBucketCount}.`,
        ],
  });
}
