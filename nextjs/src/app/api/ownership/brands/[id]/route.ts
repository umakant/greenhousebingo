import { NextRequest, NextResponse } from "next/server";

import { guardBrandOwnershipAdmin } from "@/lib/brand-ownership-api-guard";
import { deleteOwnershipBrand, getBrandOwnershipSummary } from "@/lib/brand-ownership-service";
import { resolveMediaUrlMap, resolveStoredMediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

async function currentUserId(req: NextRequest): Promise<bigint | null> {
  const raw = req.cookies.get("pf_user_id")?.value;
  if (!raw) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const denied = await guardBrandOwnershipAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  let brandId: bigint;
  try {
    brandId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid brand id." }, { status: 400 });
  }

  const brand = await prisma.ownershipBrand.findUnique({ where: { id: brandId } });
  if (!brand) {
    return NextResponse.json({ ok: false, message: "Brand not found." }, { status: 404 });
  }

  const summary = await getBrandOwnershipSummary(brandId);
  const logoMap = await resolveMediaUrlMap([brand.logo]);
  return NextResponse.json({
    ok: true,
    brand: {
      id: brand.id.toString(),
      name: brand.name,
      firstName: brand.firstName,
      lastName: brand.lastName,
      slug: brand.slug,
      logo: resolveStoredMediaUrl(brand.logo, logoMap),
      status: brand.status,
      notes: brand.notes,
    },
    summary,
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = await guardBrandOwnershipAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  let brandId: bigint;
  try {
    brandId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid brand id." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (body?.name != null) data.name = String(body.name).trim();
  if (body?.firstName != null) data.firstName = String(body.firstName).trim() || null;
  if (body?.lastName != null) data.lastName = String(body.lastName).trim() || null;
  if (body?.logo != null) data.logo = String(body.logo).trim() || null;
  if (body?.status != null) data.status = String(body.status).trim();
  if (body?.notes != null) data.notes = String(body.notes).trim() || null;

  const brand = await prisma.ownershipBrand.update({ where: { id: brandId }, data });
  const summary = await getBrandOwnershipSummary(brand.id);
  return NextResponse.json({ ok: true, brand: { id: brand.id.toString(), name: brand.name }, summary });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const denied = await guardBrandOwnershipAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  let brandId: bigint;
  try {
    brandId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid brand id." }, { status: 400 });
  }

  try {
    const deleted = await deleteOwnershipBrand({
      brandId,
      changedByUserId: await currentUserId(req),
    });
    return NextResponse.json({ ok: true, brand: deleted });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not delete brand.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
