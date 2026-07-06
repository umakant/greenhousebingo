import { NextRequest, NextResponse } from "next/server";

import { jsonSafe } from "@/lib/json-serialize";
import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { deleteWebsite, getWebsiteById, updateWebsite } from "@/lib/storefront/services/website-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.VIEW });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let wid: bigint;
  try {
    wid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const w = await getWebsiteById(org.organizationId, wid);
  if (!w) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  return NextResponse.json(
    jsonSafe({
      ok: true,
      data: {
        ...w,
        id: w.id.toString(),
        domains: w.domains.map((d) => ({ ...d, id: d.id.toString() })),
      },
    }),
  );
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.WEBSITE_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let wid: bigint;
  try {
    wid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const w = await updateWebsite(
      org.organizationId,
      wid,
      {
        name: body.name != null ? String(body.name) : undefined,
        slug: body.slug != null ? String(body.slug) : undefined,
        status: body.status != null ? String(body.status) : undefined,
        defaultLocale:
          body.defaultLocale === null ? null : body.defaultLocale != null ? String(body.defaultLocale) : undefined,
      },
      org.userId,
      { ...saasActorFromRequest(req) },
    );
    return NextResponse.json(jsonSafe({ ok: true, data: { ...w, id: w.id.toString() } }));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Update failed.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.WEBSITE_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let wid: bigint;
  try {
    wid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const ok = await deleteWebsite(org.organizationId, wid, org.userId, { ...saasActorFromRequest(req) });
  if (!ok) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
