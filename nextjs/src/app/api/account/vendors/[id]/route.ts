import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasAccountPermission, hasPermission } from "@/lib/authz";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.id;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-vendors")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const { id } = await ctx.params;
  const pk = BigInt(id);

  const row = await prisma.vendor.findFirst({
    where: { id: pk, createdBy: companyId },
  });

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: Number(row.id),
    name: row.name,
    company_name: row.companyName ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    tax_number: row.taxNumber ?? null,
    billing_address: row.billingAddress ?? null,
    billing_city: row.billingCity ?? null,
    billing_state: row.billingState ?? null,
    billing_postal_code: row.billingPostalCode ?? null,
    billing_country: row.billingCountry ?? null,
    shipping_address: row.shippingAddress ?? null,
    shipping_city: row.shippingCity ?? null,
    shipping_state: row.shippingState ?? null,
    shipping_postal_code: row.shippingPostalCode ?? null,
    shipping_country: row.shippingCountry ?? null,
    same_as_billing: row.sameAsBilling,
    status: row.status,
    notes: row.notes ?? null,
    created_by: Number(row.createdBy),
    created_at: row.createdAt?.toISOString() ?? null,
    updated_at: row.updatedAt?.toISOString() ?? null,
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "edit-vendors")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const { id } = await ctx.params;
  const pk = BigInt(id);

  const existing = await prisma.vendor.findFirst({
    where: { id: pk, createdBy: companyId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = body?.name != null ? String(body.name).trim() : null;
  if (name !== null && !name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (name !== null) data.name = name;
  if (body?.company_name !== undefined) data.companyName = body.company_name != null ? String(body.company_name).trim() || null : null;
  if (body?.email !== undefined) data.email = body.email != null ? String(body.email).trim() || null : null;
  if (body?.phone !== undefined) data.phone = body.phone != null ? String(body.phone).trim() || null : null;
  if (body?.tax_number !== undefined) data.taxNumber = body.tax_number != null ? String(body.tax_number).trim() || null : null;
  if (body?.billing_address !== undefined) data.billingAddress = body.billing_address != null ? String(body.billing_address).trim() || null : null;
  if (body?.billing_city !== undefined) data.billingCity = body.billing_city != null ? String(body.billing_city).trim() || null : null;
  if (body?.billing_state !== undefined) data.billingState = body.billing_state != null ? String(body.billing_state).trim() || null : null;
  if (body?.billing_postal_code !== undefined) data.billingPostalCode = body.billing_postal_code != null ? String(body.billing_postal_code).trim() || null : null;
  if (body?.billing_country !== undefined) data.billingCountry = body.billing_country != null ? String(body.billing_country).trim() || null : null;
  if (body?.shipping_address !== undefined) data.shippingAddress = body.shipping_address != null ? String(body.shipping_address).trim() || null : null;
  if (body?.shipping_city !== undefined) data.shippingCity = body.shipping_city != null ? String(body.shipping_city).trim() || null : null;
  if (body?.shipping_state !== undefined) data.shippingState = body.shipping_state != null ? String(body.shipping_state).trim() || null : null;
  if (body?.shipping_postal_code !== undefined) data.shippingPostalCode = body.shipping_postal_code != null ? String(body.shipping_postal_code).trim() || null : null;
  if (body?.shipping_country !== undefined) data.shippingCountry = body.shipping_country != null ? String(body.shipping_country).trim() || null : null;
  if (body?.same_as_billing !== undefined) data.sameAsBilling = Boolean(body.same_as_billing);
  if (body?.status !== undefined) data.status = body.status === "inactive" ? "inactive" : "active";
  if (body?.notes !== undefined) data.notes = body.notes != null ? String(body.notes).trim() || null : null;

  await prisma.vendor.update({
    where: { id: pk },
    data: { ...data, updatedAt: new Date() } as any,
  });

  return NextResponse.json({ ok: true, message: "Vendor updated" });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "delete-vendors")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const { id } = await ctx.params;
  const pk = BigInt(id);

  const existing = await prisma.vendor.findFirst({
    where: { id: pk, createdBy: companyId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.vendor.delete({ where: { id: pk } });
  return NextResponse.json({ ok: true, message: "Vendor deleted" });
}
