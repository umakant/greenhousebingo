import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { computeProposalTotals, type ProposalLineInput } from "@/lib/sales-proposal-totals";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null; creatorId: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.creatorId ?? actor.id;
}

async function resolveActor(req: NextRequest) {
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return null;
  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true, creatorId: true },
  });
  if (!actor?.id) return null;
  return { actor, companyId: getCompanyId(actor) };
}

function buildTemplateItemsPayload(
  items: ProposalLineInput[],
  calculateTax: string,
  discountRaw: number,
  discountType: "percent" | "fixed",
) {
  const totalsPreview = computeProposalTotals(items, calculateTax, discountRaw, discountType);
  if (totalsPreview.lines.length === 0) {
    return null;
  }

  const lineSubtotal = totalsPreview.subtotal;
  const proposalDiscount =
    discountType === "percent"
      ? (lineSubtotal * Math.min(100, Math.max(0, discountRaw))) / 100
      : Math.min(Math.max(0, discountRaw), lineSubtotal);

  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;
  const templateItems: {
    productId: bigint | null;
    serviceId: bigint | null;
    description: string | null;
    quantity: number;
    unitPrice: number;
    discountPercentage: number;
    taxPercentage: number;
    sortOrder: number;
  }[] = [];

  items.forEach((it, index) => {
    const desc = String(it.description ?? it.item_name ?? "").trim();
    const productId = it.product_id ? BigInt(it.product_id) : null;
    const serviceId = it.service_id ? BigInt(it.service_id) : null;
    if (!desc && !productId && !serviceId) return;
    const qty = Math.max(1, Number(it.quantity) || 1);
    const unitPrice = Math.max(0, Number(it.unit_price) || 0);
    const discPct = Math.min(100, Math.max(0, Number(it.discount_percentage) || 0));
    const taxPct = Math.min(100, Math.max(0, Number(it.tax_percentage) || 0));
    const lineTotal = qty * unitPrice;
    const discAmt = (lineTotal * discPct) / 100;
    const afterLineDisc = lineTotal - discAmt;
    const lineShare = lineSubtotal > 0 ? lineTotal / lineSubtotal : 0;
    const proposalDiscShare = proposalDiscount * lineShare;
    subtotal += lineTotal;
    discountAmount += discAmt + proposalDiscShare;
    taxAmount +=
      (Math.max(
        0,
        calculateTax === "before_discount" ? lineTotal : afterLineDisc - proposalDiscShare,
      ) *
        taxPct) /
      100;
    templateItems.push({
      productId,
      serviceId,
      description: desc || null,
      quantity: qty,
      unitPrice,
      discountPercentage: discPct,
      taxPercentage: taxPct,
      sortOrder: index,
    });
  });

  const totalAmount = subtotal - discountAmount + taxAmount;
  return { subtotal, taxAmount, discountAmount, totalAmount, templateItems };
}

export async function GET(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (
    !perms.includes("*") &&
    !hasPermission(perms, "manage-sales-proposals") &&
    !hasPermission(perms, "view-sales-proposals")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctx = await resolveActor(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "10", 10) || 10));
  const search = (url.searchParams.get("search") ?? "").trim();

  const where: Record<string, unknown> = { createdBy: ctx.companyId };
  if (search) where.name = { contains: search, mode: "insensitive" };

  try {
    const [total, rows] = await Promise.all([
      prisma.salesProposalTemplate.count({ where }),
      prisma.salesProposalTemplate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    const totalCount = Number(total);
    const data = rows.map((t) => ({
      id: t.id.toString(),
      name: t.name,
      currency: t.currency,
      total_amount: Number(t.totalAmount),
      created_at: t.createdAt?.toISOString?.() ?? null,
    }));

    return NextResponse.json({
      ok: true,
      templates: {
        data,
        meta: {
          total: totalCount,
          per_page: perPage,
          current_page: page,
          last_page: Math.max(1, Math.ceil(totalCount / perPage)),
        },
      },
    });
  } catch {
    return NextResponse.json({
      ok: true,
      templates: { data: [], meta: { total: 0, per_page: perPage, current_page: page, last_page: 1 } },
    });
  }
}

export async function POST(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (!perms.includes("*") && !hasPermission(perms, "manage-sales-proposals")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctx = await resolveActor(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });

  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ ok: false, message: "Template name is required." }, { status: 400 });

  const currency = String(body.currency ?? "USD").trim() || "USD";
  const calculateTax = (body.calculate_tax as string) ?? "after_discount";
  const requireSignature = body.require_signature !== false;
  const paymentTerms = (body.payment_terms as string) ?? null;
  const notes = (body.notes as string) ?? null;
  const description = (body.description as string) ?? null;
  const discountRaw = Number(body.discount ?? body.discount_value ?? 0) || 0;
  const discountType = body.discount_type === "fixed" ? "fixed" : "percent";
  const items = (body.items as ProposalLineInput[]) ?? [];

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: false, message: "At least one product is required." }, { status: 400 });
  }
  if (items.some((it) => !it.product_id && !it.service_id)) {
    return NextResponse.json({ ok: false, message: "Every line item must be linked to a product or service." }, { status: 400 });
  }

  const productIds = items.filter((it) => it.product_id).map((it) => BigInt(it.product_id!));
  const serviceIds = items.filter((it) => it.service_id).map((it) => BigInt(it.service_id!));
  if (productIds.length > 0) {
    const productRows = await prisma.posProduct.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
        OR: [{ organizationId: ctx.companyId }, { createdBy: ctx.companyId }],
      },
      select: { id: true },
    });
    if (productRows.length !== new Set(productIds.map(String)).size) {
      return NextResponse.json({ ok: false, message: "One or more products were not found." }, { status: 400 });
    }
  }
  if (serviceIds.length > 0) {
    const serviceRows = await prisma.posService.findMany({
      where: {
        id: { in: serviceIds },
        isActive: true,
        OR: [{ organizationId: ctx.companyId }, { createdBy: ctx.companyId }],
      },
      select: { id: true },
    });
    if (serviceRows.length !== new Set(serviceIds.map(String)).size) {
      return NextResponse.json({ ok: false, message: "One or more services were not found." }, { status: 400 });
    }
  }

  const built = buildTemplateItemsPayload(items, calculateTax, discountRaw, discountType);
  if (!built) {
    return NextResponse.json({ ok: false, message: "At least one valid product is required." }, { status: 400 });
  }

  try {
    const template = await prisma.salesProposalTemplate.create({
      data: {
        name,
        description,
        currency,
        calculateTax,
        requireSignature,
        paymentTerms,
        notes,
        discountValue: discountRaw,
        discountType,
        subtotal: built.subtotal,
        taxAmount: built.taxAmount,
        discountAmount: built.discountAmount,
        totalAmount: built.totalAmount,
        creatorId: ctx.actor.id,
        createdBy: ctx.companyId,
      },
    });

    for (const it of built.templateItems) {
      await prisma.salesProposalTemplateItem.create({
        data: { templateId: template.id, ...it },
      });
    }

    return NextResponse.json({ ok: true, id: template.id.toString() }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 500 });
  }
}
