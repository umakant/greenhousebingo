import { NextResponse, type NextRequest } from "next/server";

import { requireAffiliateApiAccess } from "@/lib/affiliate-access";
import { ensureAffiliateDemoForOrg, seedAffiliateLinksForOrg } from "@/lib/affiliate-business-service";

export const dynamic = "force-dynamic";

/** Create links for every active partner × active program that does not have one yet. */
export async function POST(req: NextRequest) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-links");
  if (!gate.ok) return gate.response;

  const { organizationId } = gate.actor;
  await ensureAffiliateDemoForOrg(organizationId);

  const result = await seedAffiliateLinksForOrg(organizationId, undefined, undefined, {
    onlyIfEmpty: false,
  });
  return NextResponse.json({ ok: true, created: result.created });
}
