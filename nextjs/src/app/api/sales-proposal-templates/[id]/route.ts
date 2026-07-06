import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { computeProposalTotals, type ProposalLineInput } from "@/lib/sales-proposal-totals";

type RouteCtx = { params: Promise<{ id: string }> };

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

function serializeTemplate(template: {
  id: bigint;
  name: string;
  description: string | null;
  currency: string;
  calculateTax: string | null;
  requireSignature: boolean;
  paymentTerms: string | null;
  notes: string | null;
  discountValue: unknown;
  discountType: string;
  subtotal: unknown;
  taxAmount: unknown;
  discountAmount: unknown;
  totalAmount: unknown;
  createdAt: Date;
  items: Array<{
    id: bigint;
    productId: bigint | null;
    serviceId: bigint | null;
    description: string | null;
    quantity: number;
    unitPrice: unknown;
    discountPercentage: unknown;
    taxPercentage: unknown;
    sortOrder: number;
  }>;
}) {
  return {
    id: template.id.toString(),
    name: template.name,
    description: template.description,
    currency: template.currency,
    calculate_tax: template.calculateTax,
    require_signature: template.requireSignature,
    payment_terms: template.paymentTerms,
    notes: template.notes,
    discount: Number(template.discountValue),
    discount_type: template.discountType,
    subtotal: Number(template.subtotal),
    tax_amount: Number(template.taxAmount),
    discount_amount: Number(template.discountAmount),
    total_amount: Number(template.totalAmount),
    created_at: template.createdAt?.toISOString?.() ?? null,
    items: template.items
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((it) => ({
        id: it.id.toString(),
        product_id: it.productId?.toString() ?? null,
        service_id: it.serviceId?.toString() ?? null,
        description: it.description,
        quantity: it.quantity,
        unit_price: Number(it.unitPrice),
        discount_percentage: Number(it.discountPercentage),
        tax_percentage: Number(it.taxPercentage),
      })),
  };
}

function buildTemplateItemsPayload(
  items: ProposalLineInput[],
  calculateTax: string,
  discountRaw: number,
  discountType: "percent" | "fixed",
) {
  const totalsPreview = computeProposalTotals(items, calculateTax, discountRaw, discountType);
  if (totalsPreview.lines.length === 0) return null;

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

export async function GET(req: NextRequest, { params }: RouteCtx) {
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

  const { id } = await params;
  let templateId: bigint;
  try {
    templateId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid template." }, { status: 400 });
  }

  const template = await prisma.salesProposalTemplate.findFirst({
    where: { id: templateId, createdBy: ctx.companyId },
    include: { items: true },
  });
  if (!template) return NextResponse.json({ ok: false, message: "Template not found." }, { status: 404 });

  return NextResponse.json({ ok: true, template: serializeTemplate(template) });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const perms = await getPermissionsFromRequest(req);
  if (!perms.includes("*") && !hasPermission(perms, "manage-sales-proposals")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctx = await resolveActor(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let templateId: bigint;
  try {
    templateId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid template." }, { status: 400 });
  }

  const existing = await prisma.salesProposalTemplate.findFirst({
    where: { id: templateId, createdBy: ctx.companyId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Template not found." }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });

  const name = String(body.name ?? existing.name).trim();
  if (!name) return NextResponse.json({ ok: false, message: "Template name is required." }, { status: 400 });

  const currency = String(body.currency ?? existing.currency).trim() || "USD";
  const calculateTax = (body.calculate_tax as string) ?? existing.calculateTax ?? "after_discount";
  const requireSignature = body.require_signature !== false;
  const paymentTerms = (body.payment_terms as string) ?? existing.paymentTerms;
  const notes = (body.notes as string) ?? existing.notes;
  const description = (body.description as string) ?? existing.description;
  const discountRaw = Number(body.discount ?? body.discount_value ?? existing.discountValue) || 0;
  const discountType =
    body.discount_type === "fixed" || body.discount_type === "percent"
      ? (body.discount_type as "fixed" | "percent")
      : (existing.discountType as "fixed" | "percent");
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
    await prisma.salesProposalTemplateItem.deleteMany({ where: { templateId } });
    await prisma.salesProposalTemplate.update({
      where: { id: templateId },
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
      },
    });
    for (const it of built.templateItems) {
      await prisma.salesProposalTemplateItem.create({
        data: { templateId, ...it },
      });
    }
    return NextResponse.json({ ok: true, id: templateId.toString() });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteCtx) {
  const perms = await getPermissionsFromRequest(req);
  if (!perms.includes("*") && !hasPermission(perms, "manage-sales-proposals")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctx = await resolveActor(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let templateId: bigint;
  try {
    templateId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid template." }, { status: 400 });
  }

  const existing = await prisma.salesProposalTemplate.findFirst({
    where: { id: templateId, createdBy: ctx.companyId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Template not found." }, { status: 404 });

  try {
    await prisma.salesProposalTemplate.delete({ where: { id: templateId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 500 });
  }
}
