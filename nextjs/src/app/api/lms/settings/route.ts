import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import {
  DEFAULT_LMS_ORG_SETTINGS,
  readLmsOrgSettings,
  writeLmsOrgSettings,
  type LmsOrgSettings,
} from "@/lib/lms-org-settings";
import { pingLmsUpdateWebhook } from "@/lib/lms-update-webhook";

export const dynamic = "force-dynamic";

function canManage(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-lms-settings") ||
    hasPermission(perms, "manage-lms")
  );
}

export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManage(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const settings = await readLmsOrgSettings(actor.organizationId);
  const adminBaseUrl =
    (process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin).replace(/\/$/, "") + "/dashboard";

  return NextResponse.json({
    ok: true,
    settings,
    defaults: DEFAULT_LMS_ORG_SETTINGS,
    adminBaseUrl,
    globalSettingsNote:
      "Language catalog, RTL layout direction, and brand colors are inherited from Settings → System / Brand unless overridden below.",
  });
}

export async function PATCH(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManage(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  let body: Partial<LmsOrgSettings>;
  try {
    body = (await req.json()) as Partial<LmsOrgSettings>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const current = await readLmsOrgSettings(actor.organizationId);
  const next: LmsOrgSettings = {
    ...current,
    ...body,
    adBanners: Array.isArray(body.adBanners) ? body.adBanners : current.adBanners,
  };

  await writeLmsOrgSettings(actor.organizationId, next);
  void pingLmsUpdateWebhook(next);

  return NextResponse.json({ ok: true, settings: next, message: "LMS settings saved." });
}
