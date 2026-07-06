import { redirect } from "next/navigation";

import { resolveOwnCompanySegment } from "@/lib/require-company-marketplace";

export const dynamic = "force-dynamic";

export default async function CompanyMarketplaceShim() {
  const slug = await resolveOwnCompanySegment();
  if (!slug) redirect("/dashboard");
  redirect(`/company/${slug}/marketplace`);
}
