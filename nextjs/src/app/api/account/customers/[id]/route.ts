import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasAccountPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.id;
}

/** `NextResponse.json` throws on BigInt; Prisma JSON / decimals can surface as non-JSON-safe values. */
function jsonResponse(data: unknown, init?: { status?: number }) {
  return new NextResponse(
    JSON.stringify(data, (_key, value) => {
      if (typeof value === "bigint") return value.toString();
      return value;
    }),
    {
      status: init?.status ?? 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
}

/** Storefront schema may not exist on older DBs; avoid 500 when `storefront_orders` is missing (P2021). */
async function loadStorefrontEcommerceForCustomer(pk: bigint, companyId: bigint) {
  try {
    const [storefrontOrders, storefrontOrderCount, storefrontUnpaidCount, storefrontRevenue] = await Promise.all([
      prisma.storefrontOrder.findMany({
        where: { crmCustomerId: pk, organizationId: companyId, source: "storefront" },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          orderNumber: true,
          total: true,
          currency: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
      prisma.storefrontOrder.count({
        where: { crmCustomerId: pk, organizationId: companyId, source: "storefront" },
      }),
      prisma.storefrontOrder.count({
        where: {
          crmCustomerId: pk,
          organizationId: companyId,
          source: "storefront",
          paidAt: null,
        },
      }),
      prisma.storefrontOrder.aggregate({
        where: {
          crmCustomerId: pk,
          organizationId: companyId,
          source: "storefront",
          paidAt: { not: null },
        },
        _sum: { total: true },
      }),
    ]);
    return {
      storefrontOrders,
      storefrontOrderCount,
      storefrontUnpaidCount,
      lifetimeTotal: storefrontRevenue._sum.total != null ? Number(storefrontRevenue._sum.total) : 0,
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2021" || e.code === "P2022")) {
      console.warn(
        "[api/account/customers/[id]] Storefront tables/columns missing; returning empty ecommerce snapshot. Run: npm run db:migrate:deploy",
      );
      return {
        storefrontOrders: [],
        storefrontOrderCount: 0,
        storefrontUnpaidCount: 0,
        lifetimeTotal: 0,
      };
    }
    throw e;
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const perms = await getPermissionsFromRequest(req);
    if (!hasAccountPermission(perms, "manage-customers")) {
      return jsonResponse({ error: "Forbidden" }, { status: 403 });
    }

    const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
    if (!actorEmail) return jsonResponse({ error: "Unauthorized" }, { status: 401 });

    const actor = await prisma.user.findFirst({
      where: { email: actorEmail },
      select: { id: true, type: true, createdBy: true },
    });
    if (!actor?.id) return jsonResponse({ error: "Unauthorized" }, { status: 401 });

    const companyId = getCompanyId(actor);
    const { id } = await ctx.params;
    const pk = BigInt(id);

    const row = await prisma.customer.findFirst({
      where: { id: pk, createdBy: companyId },
      select: {
        id: true,
        userId: true,
        customerCode: true,
        companyName: true,
        contactPersonName: true,
        contactPersonEmail: true,
        contactPersonMobile: true,
        taxNumber: true,
        paymentTerms: true,
        billingAddress: true,
        shippingAddress: true,
        sameAsBilling: true,
        notes: true,
        creatorId: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!row) return jsonResponse({ error: "Not found" }, { status: 404 });

    const { storefrontOrders, storefrontOrderCount, storefrontUnpaidCount, lifetimeTotal } =
      await loadStorefrontEcommerceForCustomer(pk, companyId);

    let user = null;
    if (row.userId) {
      user = await prisma.user.findFirst({
        where: { id: row.userId },
        select: { id: true, name: true, avatar: true },
      });
    }

    const payload = {
      id: Number(row.id),
      user_id: row.userId ? Number(row.userId) : null,
      customer_code: row.customerCode,
      company_name: row.companyName,
      contact_person_name: row.contactPersonName,
      contact_person_email: row.contactPersonEmail,
      contact_person_mobile: row.contactPersonMobile ?? null,
      tax_number: row.taxNumber ?? null,
      payment_terms: row.paymentTerms ?? null,
      billing_address: row.billingAddress,
      shipping_address: row.shippingAddress,
      same_as_billing: row.sameAsBilling,
      notes: row.notes ?? null,
      creator_id: row.creatorId ? Number(row.creatorId) : null,
      created_by: row.createdBy ? Number(row.createdBy) : null,
      created_at: row.createdAt?.toISOString() ?? null,
      updated_at: row.updatedAt?.toISOString() ?? null,
      user: user ? { id: Number(user.id), name: user.name, avatar: user.avatar } : null,
      storefront_ecommerce: {
        order_count: storefrontOrderCount,
        unpaid_order_count: storefrontUnpaidCount,
        lifetime_value_placeholder: lifetimeTotal,
        recent_orders: storefrontOrders.map((o) => ({
          id: Number(o.id),
          order_number: o.orderNumber,
          total: Number(o.total),
          currency: o.currency,
          status: o.status,
          payment_status: o.paymentStatus,
          created_at: o.createdAt.toISOString(),
        })),
      },
    };

    return jsonResponse(payload);
  } catch (e) {
    console.error("[api/account/customers/[id]] GET failed:", e);
    const message = e instanceof Error ? e.message : "Internal server error";
    return jsonResponse({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const perms = await getPermissionsFromRequest(req);
  if (!hasAccountPermission(perms, "edit-customers")) {
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

  const existing = await prisma.customer.findFirst({
    where: { id: pk, createdBy: companyId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.company_name !== "string" || typeof body.contact_person_name !== "string" || typeof body.contact_person_email !== "string") {
    return NextResponse.json({ error: "company_name, contact_person_name, contact_person_email are required" }, { status: 400 });
  }

  const billing = (body.billing_address as Record<string, unknown>) ?? {};
  const shipping = (body.shipping_address as Record<string, unknown>) ?? {};
  const sameAsBilling = Boolean(body.same_as_billing);

  await prisma.customer.update({
    where: { id: pk },
    data: {
      companyName: String(body.company_name).trim(),
      contactPersonName: String(body.contact_person_name).trim(),
      contactPersonEmail: String(body.contact_person_email).trim(),
      contactPersonMobile: body.contact_person_mobile != null ? String(body.contact_person_mobile).trim() || null : null,
      taxNumber: body.tax_number != null ? String(body.tax_number).trim() || null : null,
      paymentTerms: body.payment_terms != null ? String(body.payment_terms).trim() || null : null,
      billingAddress: {
        name: String(billing.name ?? "").trim(),
        address_line_1: String(billing.address_line_1 ?? "").trim(),
        address_line_2: billing.address_line_2 != null ? String(billing.address_line_2).trim() : undefined,
        city: String(billing.city ?? "").trim(),
        state: String(billing.state ?? "").trim(),
        country: String(billing.country ?? "").trim(),
        zip_code: String(billing.zip_code ?? "").trim(),
      },
      shippingAddress: sameAsBilling
        ? { name: String(billing.name ?? "").trim(), address_line_1: String(billing.address_line_1 ?? "").trim(), address_line_2: billing.address_line_2 != null ? String(billing.address_line_2).trim() : undefined, city: String(billing.city ?? "").trim(), state: String(billing.state ?? "").trim(), country: String(billing.country ?? "").trim(), zip_code: String(billing.zip_code ?? "").trim() }
        : {
            name: String(shipping.name ?? "").trim(),
            address_line_1: String(shipping.address_line_1 ?? "").trim(),
            address_line_2: shipping.address_line_2 != null ? String(shipping.address_line_2).trim() : undefined,
            city: String(shipping.city ?? "").trim(),
            state: String(shipping.state ?? "").trim(),
            country: String(shipping.country ?? "").trim(),
            zip_code: String(shipping.zip_code ?? "").trim(),
          },
      sameAsBilling,
      notes: body.notes != null ? String(body.notes).trim() || null : null,
    },
  });

  return NextResponse.json({ ok: true, message: "Customer updated" });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const perms = await getPermissionsFromRequest(req);
  if (!hasAccountPermission(perms, "delete-customers")) {
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

  const existing = await prisma.customer.findFirst({
    where: { id: pk, createdBy: companyId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.customer.delete({ where: { id: pk } });
  return NextResponse.json({ ok: true, message: "Customer deleted" });
}
