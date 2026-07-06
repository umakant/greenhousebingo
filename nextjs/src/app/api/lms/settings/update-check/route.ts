import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { readLmsOrgSettings, writeLmsOrgSettings } from "@/lib/lms-org-settings";
import { pingLmsUpdateWebhook } from "@/lib/lms-update-webhook";

export const dynamic = "force-dynamic";

/** Manual trigger for the LMS update / integration webhook. */
export async function POST(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (
    !perms.includes("*") &&
    !hasPermission(perms, "manage-lms-settings") &&
    !hasPermission(perms, "manage-lms")
  ) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  let body: { version?: string } = {};
  try {
    body = (await req.json()) as { version?: string };
  } catch {
    /* optional body */
  }

  const settings = await readLmsOrgSettings(actor.organizationId);
  const version =
    typeof body.version === "string" && body.version.trim()
      ? body.version.trim()
      : process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

  const next = { ...settings, updateLastVersion: version };
  await writeLmsOrgSettings(actor.organizationId, next);
  await pingLmsUpdateWebhook(next);

  return NextResponse.json({
    ok: true,
    message: settings.updateWebhookUrl
      ? "Update hook invoked."
      : "Version saved. Configure an update webhook URL to notify external systems.",
    updateLastVersion: version,
  });
}
