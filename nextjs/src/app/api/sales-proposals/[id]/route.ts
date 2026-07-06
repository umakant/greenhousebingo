import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { queueProposalSendEmail } from "@/lib/sales-proposal-email";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null; creatorId: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.creatorId ?? actor.id;
}

async function getActor(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true, creatorId: true },
  });
  if (!actor?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { perms, actor, companyId: getCompanyId(actor) };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getActor(_req);
  if ("error" in ctx) return ctx.error;
  const { perms, actor, companyId } = ctx;
  if (
    !perms.includes("*") &&
    !hasPermission(perms, "manage-sales-proposals") &&
    !hasPermission(perms, "view-sales-proposals") &&
    !hasPermission(perms, "edit-sales-proposals")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let proposalId: bigint;
  try {
    proposalId = BigInt(id);
  } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const where: Record<string, unknown> = { id: proposalId };
  if (hasPermission(perms, "manage-any-sales-proposals") || hasPermission(perms, "manage-sales-proposals")) {
    where.createdBy = companyId;
  } else if (hasPermission(perms, "manage-own-sales-proposals")) {
    where.OR = [{ creatorId: actor.id }, { customerId: actor.id }];
  } else if (hasPermission(perms, "edit-sales-proposals")) {
    where.createdBy = companyId;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const proposal = await prisma.salesProposal.findFirst({
    where,
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [customer, lead, deal, project, companyUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id: proposal.customerId },
      select: { id: true, name: true, email: true },
    }),
    proposal.leadId
      ? prisma.crmLead.findFirst({
          where: { id: proposal.leadId },
          select: { id: true, name: true, firstName: true, lastName: true, email: true, company: true },
        })
      : Promise.resolve(null),
    proposal.dealId
      ? prisma.crmDeal.findFirst({ where: { id: proposal.dealId }, select: { id: true, name: true } })
      : Promise.resolve(null),
    proposal.projectId
      ? prisma.project.findFirst({
          where: { id: proposal.projectId },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    prisma.user.findFirst({ where: { id: companyId }, select: { name: true, email: true } }),
  ]);

  const contactName =
    lead?.name ?? [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ?? customer?.name ?? "—";

  return NextResponse.json({
    ok: true,
    company: {
      name: companyUser?.name ?? "Company",
      email: companyUser?.email ?? "",
    },
    proposal: {
      id: proposal.id.toString(),
      proposal_number: proposal.proposalNumber,
      proposal_date: proposal.proposalDate?.toISOString?.()?.slice(0, 10) ?? null,
      due_date: proposal.dueDate?.toISOString?.()?.slice(0, 10) ?? null,
      customer_id: proposal.customerId.toString(),
      customer: customer ? { id: customer.id.toString(), name: customer.name ?? "", email: customer.email ?? "" } : null,
      lead: lead
        ? {
            name: contactName,
            email: lead.email,
            company: lead.company,
          }
        : null,
      deal_name: deal?.name ?? null,
      project_id: proposal.projectId?.toString() ?? null,
      project_name: project?.name ?? proposal.projectName ?? null,
      contact_name: contactName,
      description: proposal.description,
      currency: proposal.currency,
      require_signature: proposal.requireSignature,
      subtotal: Number(proposal.subtotal),
      tax_amount: Number(proposal.taxAmount),
      discount_amount: Number(proposal.discountAmount),
      total_amount: Number(proposal.totalAmount),
      status: proposal.status,
      payment_terms: proposal.paymentTerms,
      notes: proposal.notes,
      items: proposal.items.map((it) => ({
        id: it.id.toString(),
        description: it.description,
        quantity: it.quantity,
        unit_price: Number(it.unitPrice),
        tax_percentage: Number(it.taxPercentage),
        tax_amount: Number(it.taxAmount),
        total_amount: Number(it.totalAmount),
      })),
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getActor(req);
  if ("error" in ctx) return ctx.error;
  const { perms, actor, companyId } = ctx;
  if (!perms.includes("*") && !hasPermission(perms, "manage-sales-proposals") && !hasPermission(perms, "edit-sales-proposals")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let proposalId: bigint;
  try {
    proposalId = BigInt(id);
  } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });

  const where: Record<string, unknown> = { id: proposalId };
  if (hasPermission(perms, "manage-any-sales-proposals") || hasPermission(perms, "manage-sales-proposals")) {
    where.createdBy = companyId;
  } else if (hasPermission(perms, "manage-own-sales-proposals")) {
    where.OR = [{ creatorId: actor.id }, { customerId: actor.id }];
  } else if (hasPermission(perms, "edit-sales-proposals")) {
    where.createdBy = companyId;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.salesProposal.findFirst({ where });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prevStatus = existing.status;
  const nextStatus = body.status != null ? String(body.status).trim() : undefined;

  const updated = await prisma.salesProposal.update({
    where: { id: proposalId },
    data: {
      ...(nextStatus !== undefined ? { status: nextStatus } : {}),
      ...(body.payment_terms !== undefined ? { paymentTerms: body.payment_terms === null ? null : String(body.payment_terms) } : {}),
      ...(body.notes !== undefined ? { notes: body.notes === null ? null : String(body.notes) } : {}),
    },
  });

  if (nextStatus === "sent" && prevStatus !== "sent") {
    queueProposalSendEmail(companyId, proposalId);
  }

  return NextResponse.json({ ok: true, id: updated.id.toString(), status: updated.status });
}
