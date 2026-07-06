import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { isDateBeforeToday } from "@/lib/format-date";
import { resolveOrCreateProposalDeal } from "@/lib/sales-proposal-deal";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null; creatorId: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.creatorId ?? actor.id;
}

function generateProposalNumber(createdBy: bigint): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `SP-${y}-${m}-`;
  return prefix + String(Date.now()).slice(-6);
}

type ProposalLineInput = {
  product_id?: number;
  service_id?: number;
  description?: string;
  item_name?: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  tax_percentage?: number;
};

function computeProposalTotals(
  items: ProposalLineInput[],
  calculateTax: string,
  discountValue: number,
  discountType: "percent" | "fixed",
) {
  let subtotal = 0;
  const lines: Array<{ lineTotal: number; taxPct: number; discPct: number }> = [];

  for (const it of items) {
    const desc = String(it.description ?? it.item_name ?? "").trim();
    const catalogId = it.product_id ?? it.service_id;
    if (!desc && !catalogId) continue;
    const qty = Math.max(1, Number(it.quantity) || 1);
    const unitPrice = Math.max(0, Number(it.unit_price) || 0);
    const discPct = Math.min(100, Math.max(0, Number(it.discount_percentage) || 0));
    const taxPct = Math.min(100, Math.max(0, Number(it.tax_percentage) || 0));
    const lineTotal = qty * unitPrice;
    subtotal += lineTotal;
    lines.push({ lineTotal, taxPct, discPct });
  }

  const proposalDiscount =
    discountType === "percent"
      ? (subtotal * Math.min(100, Math.max(0, discountValue))) / 100
      : Math.min(Math.max(0, discountValue), subtotal);

  let lineDiscountAmount = 0;
  let taxAmount = 0;
  for (const line of lines) {
    const lineDiscAmt = (line.lineTotal * line.discPct) / 100;
    lineDiscountAmount += lineDiscAmt;
    const afterLineDisc = line.lineTotal - lineDiscAmt;
    const lineShare = subtotal > 0 ? line.lineTotal / subtotal : 0;
    const proposalDiscShare = proposalDiscount * lineShare;
    const taxableBase =
      calculateTax === "before_discount" ? line.lineTotal : afterLineDisc - proposalDiscShare;
    taxAmount += (Math.max(0, taxableBase) * line.taxPct) / 100;
  }

  const discountAmount = lineDiscountAmount + proposalDiscount;
  const totalAmount = subtotal - discountAmount + taxAmount;

  return { subtotal, discountAmount, taxAmount, totalAmount, lines };
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

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true, creatorId: true },
  });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "10", 10) || 10));
  const search = (url.searchParams.get("search") ?? url.searchParams.get("search_proposals") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim();
  const customerId = (url.searchParams.get("customer_id") ?? "").trim();
  const leadId = (url.searchParams.get("lead_id") ?? "").trim();
  const dateFrom = (url.searchParams.get("date_from") ?? "").trim();
  const dateTo = (url.searchParams.get("date_to") ?? "").trim();
  const sort = (url.searchParams.get("sort") ?? "created_at").trim();
  const direction = url.searchParams.get("direction") === "asc" ? "asc" : "desc";

  const emptyResponse = () =>
    NextResponse.json({
      ok: true,
      proposals: { data: [], meta: { total: 0, per_page: perPage, current_page: page, last_page: 1 } },
      customers: [],
    });

  const where: Record<string, unknown> = {};
  if (hasPermission(perms, "manage-any-sales-proposals") || hasPermission(perms, "manage-sales-proposals")) {
    where.createdBy = companyId;
  } else if (hasPermission(perms, "manage-own-sales-proposals")) {
    where.OR = [{ creatorId: actor.id }, { customerId: actor.id }];
  } else {
    return emptyResponse();
  }
  if (search) where.proposalNumber = { contains: search, mode: "insensitive" };
  if (status === "expired") {
    where.dueDate = { lt: new Date() };
    where.status = { notIn: ["accepted", "rejected"] };
  } else if (status) where.status = status;
  if (customerId) where.customerId = BigInt(customerId);
  if (leadId) where.leadId = BigInt(leadId);
  if (dateFrom || dateTo) {
    const proposalDate: Record<string, Date> = {};
    if (dateFrom) proposalDate.gte = new Date(dateFrom);
    if (dateTo) proposalDate.lte = new Date(dateTo);
    where.proposalDate = proposalDate;
  }

  const orderByKey = ["proposalNumber", "proposalDate", "dueDate", "subtotal", "taxAmount", "totalAmount", "status", "createdAt"].includes(sort) ? sort : "createdAt";
  const orderBy = { [orderByKey]: direction } as { createdAt: "desc" | "asc" };

  try {
    const [total, rows] = await Promise.all([
      prisma.salesProposal.count({ where }),
      prisma.salesProposal.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    const totalCount = Number(total);
    const rowsList = rows;
    const customerIds = Array.from(new Set(rowsList.map((r) => r.customerId).filter(Boolean)));
    const leadIds = Array.from(new Set(rowsList.map((r) => r.leadId).filter((id): id is bigint => id != null)));
    const dealIds = Array.from(new Set(rowsList.map((r) => r.dealId).filter((id): id is bigint => id != null)));
    const [users, leads, deals] = await Promise.all([
      customerIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      leadIds.length > 0
        ? prisma.crmLead.findMany({
            where: { id: { in: leadIds } },
            select: { id: true, name: true, firstName: true, lastName: true, email: true, company: true },
          })
        : Promise.resolve([]),
      dealIds.length > 0
        ? prisma.crmDeal.findMany({
            where: { id: { in: dealIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);
    const customerMap = new Map(users.map((u) => [u.id.toString(), { id: u.id.toString(), name: u.name ?? "", email: u.email ?? "" }]));
    const leadMap = new Map(
      leads.map((l) => [
        l.id.toString(),
        {
          id: l.id.toString(),
          name: l.name ?? [l.firstName, l.lastName].filter(Boolean).join(" "),
          email: l.email ?? "",
          company: l.company ?? "",
        },
      ]),
    );
    const dealMap = new Map(deals.map((d) => [d.id.toString(), { id: d.id.toString(), name: d.name }]));

    const data = rowsList.map((p) => {
      const due = p.dueDate ? new Date(p.dueDate) : null;
      const isOverdue = due && due < new Date() && !["accepted", "rejected"].includes(p.status);
      const lead = p.leadId ? leadMap.get(p.leadId.toString()) ?? null : null;
      const deal = p.dealId ? dealMap.get(p.dealId.toString()) ?? null : null;
      const customer = customerMap.get(p.customerId.toString()) ?? null;
      const contactName = lead?.name || customer?.name || "—";
      return {
        id: p.id.toString(),
        proposal_number: p.proposalNumber,
        proposal_date: p.proposalDate?.toISOString?.()?.slice(0, 10) ?? null,
        due_date: p.dueDate?.toISOString?.()?.slice(0, 10) ?? null,
        customer_id: p.customerId.toString(),
        lead_id: p.leadId?.toString() ?? null,
        deal_id: p.dealId?.toString() ?? null,
        customer,
        lead,
        deal,
        contact_name: contactName,
        subtotal: Number(p.subtotal),
        tax_amount: Number(p.taxAmount),
        discount_amount: Number(p.discountAmount),
        total_amount: Number(p.totalAmount),
        balance: Number(p.totalAmount),
        status: p.status,
        display_status: isOverdue ? "overdue" : p.status,
        converted_to_invoice: p.convertedToInvoice,
        created_at: p.createdAt?.toISOString?.() ?? null,
      };
    });

    let customers: { id: string; name: string; email: string }[] = [];
    try {
      const custList = await prisma.user.findMany({
        where: { type: "client", createdBy: companyId },
        select: { id: true, name: true, email: true },
        take: 500,
      });
      customers = custList.map((c) => ({ id: c.id.toString(), name: c.name ?? "", email: c.email ?? "" }));
    } catch {
      // no-op
    }

    return NextResponse.json({
      ok: true,
      proposals: {
        data,
        meta: { total: totalCount, per_page: perPage, current_page: page, last_page: Math.max(1, Math.ceil(totalCount / perPage)) },
      },
      customers,
    });
  } catch (_e) {
    return emptyResponse();
  }
}

export async function POST(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (!perms.includes("*") && !hasPermission(perms, "create-sales-proposals")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true, creatorId: true },
  });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });

  const invoiceDate = (body.invoice_date ?? body.proposal_date) as string;
  const dueDate = body.due_date as string;
  const customerIdRaw = body.customer_id;
  const leadIdRaw = body.lead_id;
  const dealIdRaw = body.deal_id;
  const projectIdRaw = body.project_id;
  const warehouseIdRaw = body.warehouse_id;
  const paymentTerms = (body.payment_terms as string) ?? null;
  const notes = (body.notes as string) ?? null;
  const description = (body.description as string) ?? null;
  const currency = String(body.currency ?? "USD").trim() || "USD";
  const calculateTax = (body.calculate_tax as string) ?? "after_discount";
  const requireSignature = body.require_signature !== false;
  const discountRaw = Number(body.discount ?? body.discount_amount ?? 0) || 0;
  const discountType = body.discount_type === "fixed" ? "fixed" : "percent";
  const items = (body.items as ProposalLineInput[]) ?? [];
  const saveAsDraft = body.save_as_draft === true;

  if (!dueDate) {
    return NextResponse.json({ ok: false, message: "Valid till date is required." }, { status: 400 });
  }
  if (isDateBeforeToday(String(dueDate))) {
    return NextResponse.json({ ok: false, message: "Valid till date cannot be in the past." }, { status: 400 });
  }
  if (!leadIdRaw && !customerIdRaw) {
    return NextResponse.json({ ok: false, message: "Lead contact is required." }, { status: 400 });
  }
  if (!projectIdRaw) {
    return NextResponse.json({ ok: false, message: "Project is required." }, { status: 400 });
  }

  let projectId: bigint;
  let projectName: string | null = null;
  try {
    projectId = BigInt(String(projectIdRaw));
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid project." }, { status: 400 });
  }
  const project = await prisma.project.findFirst({
    where: { id: projectId, createdBy: companyId },
    select: { id: true, name: true },
  });
  if (!project) {
    return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 });
  }
  projectName = project.name;

  let customerId = customerIdRaw ? BigInt(String(customerIdRaw)) : actor.id;
  let leadId: bigint | null = null;
  let dealId: bigint | null = null;

  if (leadIdRaw) {
    leadId = BigInt(String(leadIdRaw));
    const lead = await prisma.crmLead.findFirst({
      where: { id: leadId, createdBy: companyId },
      select: { id: true, firstName: true, lastName: true, company: true, name: true, email: true },
    });
    if (!lead) return NextResponse.json({ ok: false, message: "Lead not found." }, { status: 404 });
    if (lead.email) {
      const user = await prisma.user.findFirst({ where: { email: lead.email.trim().toLowerCase() } });
      if (user) customerId = user.id;
    }
    if (dealIdRaw) {
      dealId = BigInt(String(dealIdRaw));
      const deal = await prisma.crmDeal.findFirst({ where: { id: dealId, createdBy: companyId } });
      if (!deal) return NextResponse.json({ ok: false, message: "Deal not found." }, { status: 404 });
    } else {
      dealId = await resolveOrCreateProposalDeal(companyId, leadId, lead);
    }
  } else if (dealIdRaw) {
    dealId = BigInt(String(dealIdRaw));
    const deal = await prisma.crmDeal.findFirst({ where: { id: dealId, createdBy: companyId } });
    if (!deal) return NextResponse.json({ ok: false, message: "Deal not found." }, { status: 404 });
  }

  const proposalDate = invoiceDate || new Date().toISOString().slice(0, 10);

  if (!saveAsDraft) {
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, message: "At least one product is required." }, { status: 400 });
    }
    if (items.some((it) => !it.product_id && !it.service_id)) {
      return NextResponse.json({ ok: false, message: "Every line item must be linked to a product or service." }, { status: 400 });
    }
  } else if (items.some((it) => !it.product_id && !it.service_id)) {
    return NextResponse.json({ ok: false, message: "Every line item must be linked to a product or service." }, { status: 400 });
  }

  const productIds = items.filter((it) => it.product_id).map((it) => BigInt(it.product_id!));
  const serviceIds = items.filter((it) => it.service_id).map((it) => BigInt(it.service_id!));
  if (productIds.length > 0) {
    const productRows = await prisma.posProduct.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
        OR: [{ organizationId: companyId }, { createdBy: companyId }],
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
        OR: [{ organizationId: companyId }, { createdBy: companyId }],
      },
      select: { id: true },
    });
    if (serviceRows.length !== new Set(serviceIds.map(String)).size) {
      return NextResponse.json({ ok: false, message: "One or more services were not found." }, { status: 400 });
    }
  }

  const totalsPreview = items.length > 0 ? computeProposalTotals(items, calculateTax, discountRaw, discountType) : { lines: [], subtotal: 0, taxAmount: 0, discountAmount: 0, total: 0 };
  if (!saveAsDraft && totalsPreview.lines.length === 0) {
    return NextResponse.json({ ok: false, message: "At least one valid product is required." }, { status: 400 });
  }

  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;
  const proposalItems: {
    productId: bigint | null;
    serviceId: bigint | null;
    description: string | null;
    quantity: number;
    unitPrice: number;
    discountPercentage: number;
    discountAmount: number;
    taxPercentage: number;
    taxAmount: number;
    totalAmount: number;
  }[] = [];

  const lineSubtotal = totalsPreview.subtotal;
  const proposalDiscount =
    discountType === "percent"
      ? (lineSubtotal * Math.min(100, Math.max(0, discountRaw))) / 100
      : Math.min(Math.max(0, discountRaw), lineSubtotal);

  for (const it of items) {
    const desc = String(it.description ?? it.item_name ?? "").trim();
    const productId = it.product_id ? BigInt(it.product_id) : null;
    const serviceId = it.service_id ? BigInt(it.service_id) : null;
    if (!desc && !productId && !serviceId) continue;
    const qty = Math.max(1, Number(it.quantity) || 1);
    const unitPrice = Math.max(0, Number(it.unit_price) || 0);
    const discPct = Math.min(100, Math.max(0, Number(it.discount_percentage) || 0));
    const taxPct = Math.min(100, Math.max(0, Number(it.tax_percentage) || 0));
    const lineTotal = qty * unitPrice;
    const discAmt = (lineTotal * discPct) / 100;
    const afterLineDisc = lineTotal - discAmt;
    const lineShare = lineSubtotal > 0 ? lineTotal / lineSubtotal : 0;
    const proposalDiscShare = proposalDiscount * lineShare;
    const taxableBase =
      calculateTax === "before_discount" ? lineTotal : afterLineDisc - proposalDiscShare;
    const taxAmt = (Math.max(0, taxableBase) * taxPct) / 100;
    const total = afterLineDisc - proposalDiscShare + taxAmt;
    subtotal += lineTotal;
    discountAmount += discAmt + proposalDiscShare;
    taxAmount += taxAmt;
    proposalItems.push({
      productId,
      serviceId,
      description: desc || null,
      quantity: qty,
      unitPrice,
      discountPercentage: discPct,
      discountAmount: discAmt + proposalDiscShare,
      taxPercentage: taxPct,
      taxAmount: taxAmt,
      totalAmount: total,
    });
  }

  const totalAmount = subtotal - discountAmount + taxAmount;

  try {
    const proposal = await prisma.salesProposal.create({
      data: {
        proposalNumber: generateProposalNumber(companyId),
        proposalDate: new Date(proposalDate),
        dueDate: new Date(dueDate),
        customerId,
        leadId,
        dealId,
        projectId,
        projectName,
        warehouseId: warehouseIdRaw != null && String(warehouseIdRaw).trim() ? BigInt(String(warehouseIdRaw)) : null,
        paymentTerms,
        notes,
        description,
        currency,
        calculateTax,
        requireSignature,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        status: "draft",
        creatorId: actor.id,
        createdBy: companyId,
      },
    });
    for (const it of proposalItems) {
      await prisma.salesProposalItem.create({
        data: {
          proposalId: proposal.id,
          productId: it.productId,
          serviceId: it.serviceId,
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountPercentage: it.discountPercentage,
          discountAmount: it.discountAmount,
          taxPercentage: it.taxPercentage,
          taxAmount: it.taxAmount,
          totalAmount: it.totalAmount,
        },
      });
    }
    return NextResponse.json({ ok: true, id: proposal.id.toString() }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 500 });
  }
}
