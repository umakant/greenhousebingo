import { NextResponse, type NextRequest } from "next/server";

import { guardMarketplaceVendor } from "@/lib/marketplace-vendor-api-guard";
import { encodeCityStateParam, normalizeCityState } from "@/lib/marketplace/deliveryQueue";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await guardMarketplaceVendor(req, "marketplace.vendor_portal.delivery_queue.view");
  if (session instanceof NextResponse) return session;

  const queues = await prisma.deliveryCityQueue.findMany({
    where: { vendorId: session.vendorId },
    orderBy: [{ queueStatus: "asc" }, { city: "asc" }],
    include: { vendor: { select: { name: true } } },
  });

  const items = queues.map((q) => ({
    id: q.id.toString(),
    param: encodeCityStateParam(q.vendorId, q.city, q.state),
    city: q.city,
    state: q.state,
    bucketsOrdered: q.currentBucketTotal,
    requiredBucketMinimum: q.requiredBucketMinimum,
    companyCount: q.companyCount,
    queueStatus: q.queueStatus,
  }));

  return NextResponse.json({ ok: true, items });
}
