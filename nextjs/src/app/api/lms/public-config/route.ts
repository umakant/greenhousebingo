import { NextRequest, NextResponse } from "next/server";

import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { readLmsOrgEnabled } from "@/lib/lms-organization";
import { learnerIsFirstLmsPurchase, readLmsOrgSettings, resolveLmsRtl } from "@/lib/lms-org-settings";
import { getSettingsForOwner } from "@/lib/settings-service";

export const dynamic = "force-dynamic";

/** Learner-facing LMS experience flags (maintenance, GDPR, theme, banners, locale). */
export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const orgEnabled = await readLmsOrgEnabled(actor.organizationId);
  if (!orgEnabled) {
    return NextResponse.json({ ok: false, message: "LMS is disabled for this organization." }, { status: 403 });
  }

  const [lms, rtl, brand, firstPurchase] = await Promise.all([
    readLmsOrgSettings(actor.organizationId),
    resolveLmsRtl(actor.organizationId),
    getSettingsForOwner(actor.organizationId),
    learnerIsFirstLmsPurchase({
      organizationId: actor.organizationId,
      studentUserId: actor.userId,
    }),
  ]);

  const locale =
    lms.defaultLocale.trim() ||
    (brand.defaultLanguage ?? "").trim() ||
    "en";

  return NextResponse.json({
    ok: true,
    config: {
      maintenanceMode: lms.maintenanceMode,
      maintenanceMessage: lms.maintenanceMessage,
      mobileOnlyMode: lms.mobileOnlyMode,
      locale,
      rtl,
      gdprEnabled: lms.gdprEnabled,
      gdprRequireConsent: lms.gdprRequireConsent,
      gdprBannerText: lms.gdprBannerText,
      primaryColor: lms.primaryColor || brand.themeColor || brand.customColor || "",
      fontFamily: lms.fontFamily || "",
      adBanners: lms.adBanners.filter((b) => b.active && b.imageUrl),
      firstPurchaseCouponCode:
        firstPurchase && lms.firstPurchaseCouponCode ? lms.firstPurchaseCouponCode : null,
    },
  });
}
