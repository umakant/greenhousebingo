import { NextRequest, NextResponse } from "next/server";

import { jsonSafe } from "@/lib/json-serialize";
import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import {
  getPageDraftVersion,
  replaceDraftPageStructure,
  type DraftSectionInput,
} from "@/lib/storefront/services/page-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.VIEW });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let pageId: bigint;
  try {
    pageId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid page id." }, { status: 400 });
  }

  const page = await prisma.page.findFirst({
    where: { id: pageId, organizationId: org.organizationId },
  });
  if (!page) {
    return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
  }

  const draftVersion = await getPageDraftVersion(org.organizationId, pageId);

  return NextResponse.json({
    ok: true,
    data: {
      page: jsonSafe(page),
      draftVersion: draftVersion ? jsonSafe(draftVersion) : null,
    },
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.PAGE_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let pageId: bigint;
  try {
    pageId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid page id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    pageVersionId?: string;
    sections?: DraftSectionInput[];
  };
  let pageVersionId: bigint;
  try {
    pageVersionId = BigInt(String(body.pageVersionId ?? ""));
  } catch {
    return NextResponse.json({ ok: false, message: "pageVersionId required." }, { status: 400 });
  }
  if (!Array.isArray(body.sections)) {
    return NextResponse.json({ ok: false, message: "sections array required." }, { status: 400 });
  }

  try {
    await replaceDraftPageStructure(
      org.organizationId,
      pageId,
      pageVersionId,
      body.sections,
      org.userId,
      { ...saasActorFromRequest(req) },
    );
    const draftVersion = await getPageDraftVersion(org.organizationId, pageId);
    return NextResponse.json({
      ok: true,
      data: { draftVersion: draftVersion ? jsonSafe(draftVersion) : null },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Save failed.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
