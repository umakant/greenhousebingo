import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasAccountPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { sendWelcomeEmail } from "@/lib/send-welcome-email";
import { ensureVendorPortalUserForVendor } from "@/lib/account-vendor-role";

/** Prisma `mode: insensitive` is only valid for PostgreSQL / CockroachDB. */
function isPostgresDatasource(): boolean {
  const u = (process.env.DATABASE_URL ?? "").toLowerCase();
  return u.startsWith("postgresql:") || u.startsWith("postgres:");
}

function stringSearchFilter(q: string) {
  if (isPostgresDatasource()) {
    return { contains: q, mode: "insensitive" as const };
  }
  return { contains: q };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: {
  id: bigint;
  type: string | null;
  createdBy: bigint | null;
}): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.id;
}

export async function GET(req: NextRequest) {
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const perms = await getPermissionsFromRequest(req);
  const canList = hasAccountPermission(perms, "manage-vendors");
  if (!canList) {
    return NextResponse.json({
      data: [],
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 0,
    });
  }

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const url = new URL(req.url);
  const page = Math.max(
    1,
    parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
  );
  const perPage = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("per_page") ?? "10", 10) || 10),
  );
  const sort = url.searchParams.get("sort") ?? "createdAt";
  const direction =
    url.searchParams.get("direction") === "desc" ? "desc" : "asc";
  const search = (url.searchParams.get("search") ?? "").trim();

  const where: {
    createdBy: bigint;
    OR?: Array<Record<string, { contains: string; mode?: "insensitive" }>>;
  } = {
    createdBy: companyId,
  };
  if (search) {
    const f = stringSearchFilter(search);
    where.OR = [{ name: f }, { companyName: f }, { email: f }];
  }

  const sortKey = [
    "name",
    "companyName",
    "email",
    "phone",
    "status",
    "createdAt",
  ].includes(sort)
    ? sort
    : "createdAt";
  const orderBy = { [sortKey]: direction } as { createdAt: "asc" | "desc" };

  try {
    const [total, rows] = await Promise.all([
      prisma.vendor.count({ where }),
      prisma.vendor.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
          phone: true,
          taxNumber: true,
          status: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const vendorEmails = rows
      .map((r) => (r.email ?? "").trim().toLowerCase())
      .filter(Boolean);
    const vendorUsers =
      vendorEmails.length > 0
        ? await prisma.user.findMany({
            where: {
              createdBy: companyId,
              type: "vendor",
              email: { in: vendorEmails },
            },
            select: { id: true, email: true, isEnableLogin: true, isActive: true },
          })
        : [];
    const userByEmail = new Map(
      vendorUsers.map((u) => [(u.email ?? "").trim().toLowerCase(), u] as const),
    );

    const data = rows.map((r) => {
      const emailKey = (r.email ?? "").trim().toLowerCase();
      const portalUser = emailKey ? userByEmail.get(emailKey) : undefined;
      return {
        id: Number(r.id),
        name: r.name,
        company_name: r.companyName ?? null,
        email: r.email ?? null,
        phone: r.phone ?? null,
        tax_number: r.taxNumber ?? null,
        status: r.status,
        user_id: portalUser ? Number(portalUser.id) : null,
        portal_login_enabled: portalUser
          ? Boolean(portalUser.isActive && portalUser.isEnableLogin)
          : false,
        created_by: Number(r.createdBy),
        created_at: r.createdAt?.toISOString() ?? null,
        updated_at: r.updatedAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({
      data,
      current_page: page,
      last_page: Math.ceil(total / perPage) || 1,
      per_page: perPage,
      total,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : undefined;
    console.error("[GET /api/account/vendors]", code, msg, e);
    return NextResponse.json(
      { error: code === "P2021" ? "Vendors table is missing. Run database migrations." : msg },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (!hasAccountPermission(perms, "manage-vendors")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const name = body?.name != null ? String(body.name).trim() : "";
  if (!name)
    return NextResponse.json({ error: "name is required" }, { status: 400 });

  const vendorEmail =
    body?.email != null ? normalizeEmail(String(body.email)) : null;

  let userCreated = false;
  let plainPassword: string | null = null;

  if (vendorEmail) {
    const result = await ensureVendorPortalUserForVendor(
      { name, email: vendorEmail },
      companyId,
    );
    userCreated = result.created;
    plainPassword = result.plainPassword;
  }

  await prisma.vendor.create({
    data: {
      createdBy: companyId,
      name,
      companyName:
        body?.company_name != null
          ? String(body.company_name).trim() || null
          : null,
      email: vendorEmail || null,
      phone: body?.phone != null ? String(body.phone).trim() || null : null,
      taxNumber:
        body?.tax_number != null
          ? String(body.tax_number).trim() || null
          : null,
      billingAddress:
        body?.billing_address != null
          ? String(body.billing_address).trim() || null
          : null,
      billingCity:
        body?.billing_city != null
          ? String(body.billing_city).trim() || null
          : null,
      billingState:
        body?.billing_state != null
          ? String(body.billing_state).trim() || null
          : null,
      billingPostalCode:
        body?.billing_postal_code != null
          ? String(body.billing_postal_code).trim() || null
          : null,
      billingCountry:
        body?.billing_country != null
          ? String(body.billing_country).trim() || null
          : null,
      shippingAddress:
        body?.shipping_address != null
          ? String(body.shipping_address).trim() || null
          : null,
      shippingCity:
        body?.shipping_city != null
          ? String(body.shipping_city).trim() || null
          : null,
      shippingState:
        body?.shipping_state != null
          ? String(body.shipping_state).trim() || null
          : null,
      shippingPostalCode:
        body?.shipping_postal_code != null
          ? String(body.shipping_postal_code).trim() || null
          : null,
      shippingCountry:
        body?.shipping_country != null
          ? String(body.shipping_country).trim() || null
          : null,
      sameAsBilling: Boolean(body?.same_as_billing),
      status: (body?.status === "inactive" ? "inactive" : "active") as
        | "active"
        | "inactive",
      notes: body?.notes != null ? String(body.notes).trim() || null : null,
    },
  });

  if (userCreated && vendorEmail && plainPassword) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    sendWelcomeEmail({
      to: vendorEmail,
      name,
      email: vendorEmail,
      password: plainPassword,
      appUrl,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, message: "Vendor created" });
}
