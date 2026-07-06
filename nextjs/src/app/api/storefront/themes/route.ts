import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { createThemeFromTemplate, listThemesForOrganization } from "@/lib/storefront/services/theme-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.VIEW });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const wid = req.nextUrl.searchParams.get("websiteId");
  let websiteId: bigint | undefined;
  if (wid && /^\d+$/.test(wid)) {
    try {
      websiteId = BigInt(wid);
    } catch {
      /* ignore */
    }
  }

  const rows = await listThemesForOrganization(org.organizationId, websiteId);
  return NextResponse.json({
    ok: true,
    data: rows.map((t) => ({
      ...t,
      id: t.id.toString(),
      websiteId: t.websiteId != null ? t.websiteId.toString() : null,
      sourceTemplateId: t.sourceTemplateId != null ? t.sourceTemplateId.toString() : null,
      isStorefrontLive: Boolean(t.isStorefrontLive),
    })),
  });
}

export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.THEME_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const body = (await req.json().catch(() => ({}))) as {
    sourceTemplateId?: string;
    websiteId?: string | null;
  };
  let templateId: bigint;
  try {
    templateId = BigInt(String(body.sourceTemplateId ?? ""));
  } catch {
    return NextResponse.json({ ok: false, message: "sourceTemplateId required." }, { status: 400 });
  }
  let wid: bigint | null | undefined = undefined;
  if (body.websiteId != null && String(body.websiteId).trim() !== "") {
    try {
      wid = BigInt(String(body.websiteId));
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid websiteId." }, { status: 400 });
    }
  } else {
    wid = null;
  }

  try {
    const { theme, version } = await createThemeFromTemplate(
      org.organizationId,
      templateId,
      wid,
      org.userId,
      { ...saasActorFromRequest(req) },
    );
    return NextResponse.json({
      ok: true,
      data: {
        themeId: theme.id.toString(),
        themeVersionId: version.id.toString(),
        slug: theme.slug,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create theme.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
