import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasAccountPermission, hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { createAccountCustomer, normalizeEmail } from "@/lib/account-customer-service";

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
  if (!actorEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const perms = await getPermissionsFromRequest(req);
  const canList = hasAccountPermission(perms, "manage-customers");
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
  if (!actor?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const companyName = (url.searchParams.get("company_name") ?? "").trim();
  const customerCode = (url.searchParams.get("customer_code") ?? "").trim();
  const taxNumber = (url.searchParams.get("tax_number") ?? "").trim();

  const where: {
    createdBy: bigint;
    companyName?: { contains: string; mode: "insensitive" };
    customerCode?: { contains: string; mode: "insensitive" };
    taxNumber?: { contains: string; mode: "insensitive" };
  } = {
    createdBy: companyId,
  };
  if (companyName)
    where.companyName = { contains: companyName, mode: "insensitive" };
  if (customerCode)
    where.customerCode = { contains: customerCode, mode: "insensitive" };
  if (taxNumber) where.taxNumber = { contains: taxNumber, mode: "insensitive" };

  const sortKey = [
    "customerCode",
    "companyName",
    "contactPersonName",
    "contactPersonEmail",
    "taxNumber",
    "createdAt",
  ].includes(sort)
    ? sort
    : "createdAt";
  const orderBy = { [sortKey]: direction } as { createdAt: "asc" | "desc" };

  const [total, rows] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
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
    }),
  ]);

  const userIds = Array.from(
    new Set(rows.map((r) => r.userId).filter(Boolean)),
  ) as bigint[];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, avatar: true },
        })
      : [];

  const usersById = new Map(
    users.map((u) => [
      u.id.toString(),
      { id: Number(u.id), name: u.name, avatar: u.avatar },
    ]),
  );

  const data = rows.map((r) => ({
    id: Number(r.id),
    user_id: r.userId ? Number(r.userId) : null,
    customer_code: r.customerCode,
    company_name: r.companyName,
    contact_person_name: r.contactPersonName,
    contact_person_email: r.contactPersonEmail,
    contact_person_mobile: r.contactPersonMobile ?? null,
    tax_number: r.taxNumber ?? null,
    payment_terms: r.paymentTerms ?? null,
    billing_address: r.billingAddress as object | null,
    shipping_address: r.shippingAddress as object | null,
    same_as_billing: r.sameAsBilling,
    notes: r.notes ?? null,
    creator_id: r.creatorId ? Number(r.creatorId) : null,
    created_by: r.createdBy ? Number(r.createdBy) : null,
    created_at: r.createdAt?.toISOString() ?? null,
    updated_at: r.updatedAt?.toISOString() ?? null,
    user: r.userId ? (usersById.get(r.userId.toString()) ?? null) : null,
  }));

  return NextResponse.json({
    data,
    current_page: page,
    last_page: Math.ceil(total / perPage) || 1,
    per_page: perPage,
    total,
  });
}

export async function POST(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  const canCreate =
    perms.includes("*") ||
    hasPermission(perms, "manage-customers") ||
    hasPermission(perms, "create-customers");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = getCompanyId(actor);
  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (
    !body ||
    typeof body.company_name !== "string" ||
    typeof body.contact_person_name !== "string" ||
    typeof body.contact_person_email !== "string"
  ) {
    return NextResponse.json(
      {
        error:
          "company_name, contact_person_name, contact_person_email are required",
      },
      { status: 400 },
    );
  }

  const result = await createAccountCustomer({
    companyId,
    actorId: actor.id,
    companyName: String(body.company_name),
    contactPersonName: String(body.contact_person_name),
    contactPersonEmail: String(body.contact_person_email),
    contactPersonMobile:
      body.contact_person_mobile != null ? String(body.contact_person_mobile) : null,
    taxNumber: body.tax_number != null ? String(body.tax_number) : null,
    paymentTerms: body.payment_terms != null ? String(body.payment_terms) : null,
    billingAddress: body.billing_address as Record<string, unknown> | undefined,
    shippingAddress: body.shipping_address as Record<string, unknown> | undefined,
    sameAsBilling: Boolean(body.same_as_billing),
    notes: body.notes != null ? String(body.notes) : null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    message: "Customer created",
    portal_password: result.portalPassword ?? undefined,
    welcome_email_sent: result.welcomeEmailSent,
    welcome_email_error: result.welcomeEmailError,
  });
}
