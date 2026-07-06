import { redirect } from "next/navigation";

import { resolveOwnCompanySegment } from "@/lib/require-company-marketplace";

export const dynamic = "force-dynamic";

export default async function CompanyDeliveryStatusShim() {
  const slug = await resolveOwnCompanySegment();
  if (!slug) redirect("/dashboard");
  redirect(`/company/${slug}/delivery-status`);
}
