import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { prisma } from "@/lib/prisma";
import { ensureStorefrontThemeTemplateColumns } from "@/lib/storefront/ensure-theme-template-db";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import {
  ensureConceptHtmlThemeTemplateSeeded,
  listThemeTemplatesForOrg,
} from "@/lib/storefront/services/theme-template-service";

export const dynamic = "force-dynamic";

function jsonSafe(v: unknown): unknown {
  if (v == null) return v;
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(jsonSafe);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o)) {
      out[k] = jsonSafe(o[k]);
    }
    return out;
  }
  return v;
}

/** Global + org-visible installable theme presets (Theme library). */
export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.VIEW });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  try {
    await ensureStorefrontThemeTemplateColumns(prisma);
    await ensureConceptHtmlThemeTemplateSeeded();
    const includeArchived =
      org.isSuperadmin && req.nextUrl.searchParams.get("includeArchived") === "1";
    const rows = await listThemeTemplatesForOrg(org.organizationId, { includeArchived });
    return NextResponse.json({
      ok: true,
      data: rows.map((r) => jsonSafe(r)),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load theme templates.";
    console.error("[theme-templates GET]", e);
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
