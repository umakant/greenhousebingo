import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { ensureDefaultStorefrontNotificationTemplates } from "@/lib/storefront/notification-defaults";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.SETTINGS_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const body = (await req.json().catch(() => ({}))) as { websiteId?: string | null };
  let websiteId: bigint | null = null;
  if (body.websiteId != null && body.websiteId !== "") {
    try {
      websiteId = BigInt(String(body.websiteId));
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid websiteId." }, { status: 400 });
    }
  }

  await ensureDefaultStorefrontNotificationTemplates(org.organizationId, websiteId, org.userId);
  return NextResponse.json({ ok: true });
}
