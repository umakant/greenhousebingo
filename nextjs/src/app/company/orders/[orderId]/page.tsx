import { redirect } from "next/navigation";

import { resolveOwnCompanySegment } from "@/lib/require-company-marketplace";

export const dynamic = "force-dynamic";

/**
 * Slug-less shim for order-detail deep links (used by confirmation emails and
 * in-app notifications, which don't know the company slug). Resolves the
 * signed-in user's own company segment and forwards to the canonical route.
 */
export default async function CompanyOrderDetailShim({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const slug = await resolveOwnCompanySegment();
  if (!slug) redirect("/dashboard");
  redirect(`/company/${slug}/orders/${encodeURIComponent(orderId)}`);
}
