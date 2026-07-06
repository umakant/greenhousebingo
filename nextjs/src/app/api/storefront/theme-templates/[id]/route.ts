import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { prisma } from "@/lib/prisma";
import { ensureStorefrontThemeTemplateColumns } from "@/lib/storefront/ensure-theme-template-db";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";

export const dynamic = "force-dynamic";

/**
 * PATCH marketplace / org theme template visibility (active ↔ archived).
 * Global templates (`organizationId` null): superadmin only.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.THEME_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let templateId: bigint;
  try {
    templateId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid template id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const status = String(body.status ?? "").trim().toLowerCase();
  if (status !== "active" && status !== "archived") {
    return NextResponse.json({ ok: false, message: "status must be active or archived." }, { status: 400 });
  }

  try {
    await ensureStorefrontThemeTemplateColumns(prisma);
    const template = await prisma.themeTemplate.findFirst({ where: { id: templateId } });
    if (!template) {
      return NextResponse.json({ ok: false, message: "Theme template not found." }, { status: 404 });
    }

    if (template.organizationId == null) {
      if (!org.isSuperadmin) {
        return NextResponse.json(
          { ok: false, message: "Only platform administrators can enable or disable marketplace theme presets." },
          { status: 403 },
        );
      }
    } else if (template.organizationId !== org.organizationId) {
      return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
    }

    await prisma.themeTemplate.update({
      where: { id: templateId },
      data: { status, updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, data: { id: templateId.toString(), status } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Update failed.";
    console.error("[theme-templates PATCH]", e);
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
