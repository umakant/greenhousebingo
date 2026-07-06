import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { activateThemeVersion } from "@/lib/storefront/services/theme-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.THEME_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const body = (await req.json().catch(() => ({}))) as {
    themeId?: string;
    themeVersionId?: string;
    websiteId?: string | null;
  };
  let themeId: bigint;
  let themeVersionId: bigint;
  try {
    themeId = BigInt(String(body.themeId ?? ""));
    themeVersionId = BigInt(String(body.themeVersionId ?? ""));
  } catch {
    return NextResponse.json({ ok: false, message: "themeId and themeVersionId required." }, { status: 400 });
  }
  let websiteId: bigint | null = null;
  if (body.websiteId != null && body.websiteId !== "") {
    try {
      websiteId = BigInt(String(body.websiteId));
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid websiteId." }, { status: 400 });
    }
  }

  try {
    await activateThemeVersion(org.organizationId, themeId, themeVersionId, websiteId, org.userId, {
      ...saasActorFromRequest(req),
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Activation failed.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
