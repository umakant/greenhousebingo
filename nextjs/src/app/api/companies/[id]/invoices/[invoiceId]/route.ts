/**
 * Single company invoice (revenue record) for preview & actions.
 * Auth: superadmin + manage-users (same as list).
 */
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { hasPermission } from "@/lib/authz";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

async function requireSuperadminManageUsers(req: NextRequest): Promise<boolean> {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return false;
  const perms = await getPermissionsFromRequest(req);
  return hasPermission(perms, "manage-users");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; invoiceId: string }> }
) {
  if (!(await requireSuperadminManageUsers(req))) return forbidden();

  const { id, invoiceId } = await params;
  let companyId: bigint;
  let revId: bigint;
  try {
    companyId = BigInt(id);
    revId = BigInt(invoiceId);
  } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const company = await prisma.user.findFirst({
    where: { id: companyId, type: { in: ["company", "company_admin"] } },
    select: { id: true, name: true, email: true, slug: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const revenue = await prisma.revenue.findFirst({
    where: { id: revId, createdBy: companyId },
  });
  if (!revenue) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  let customer: {
    companyName: string;
    contactPersonName: string;
    contactPersonEmail: string;
    contactPersonMobile: string | null;
    billingAddress: unknown;
  } | null = null;
  if (revenue.customerId) {
    const c = await prisma.customer.findFirst({
      where: { id: revenue.customerId },
      select: {
        companyName: true,
        contactPersonName: true,
        contactPersonEmail: true,
        contactPersonMobile: true,
        billingAddress: true,
      },
    });
    if (c) {
      customer = {
        companyName: c.companyName,
        contactPersonName: c.contactPersonName,
        contactPersonEmail: c.contactPersonEmail,
        contactPersonMobile: c.contactPersonMobile,
        billingAddress: c.billingAddress,
      };
    }
  }

  const bank = revenue.bankAccountId
    ? await prisma.bankAccount.findFirst({
        where: { id: revenue.bankAccountId, createdBy: companyId },
        select: {
          bankName: true,
          accountNumber: true,
          branchName: true,
          iban: true,
          swiftCode: true,
        },
      })
    : null;

  return NextResponse.json({
    ok: true,
    company: {
      id: company.id.toString(),
      name: company.name,
      email: company.email,
      slug: company.slug,
    },
    invoice: {
      id: revenue.id.toString(),
      reference_number: revenue.referenceNumber,
      date: revenue.date.toISOString().slice(0, 10),
      amount: revenue.amount.toString(),
      status: revenue.status,
      category: revenue.category,
      description: revenue.description,
      payment_method: revenue.paymentMethod,
      notes: revenue.notes,
      customer_id: revenue.customerId?.toString() ?? null,
      customer,
      bank: bank
        ? {
            bank_name: bank.bankName,
            account_number: bank.accountNumber,
            branch: bank.branchName,
            iban: bank.iban,
            swift: bank.swiftCode,
          }
        : null,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; invoiceId: string }> }
) {
  if (!(await requireSuperadminManageUsers(req))) return forbidden();

  const { id, invoiceId } = await params;
  let companyId: bigint;
  let revId: bigint;
  try {
    companyId = BigInt(id);
    revId = BigInt(invoiceId);
  } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.revenue.findFirst({
    where: { id: revId, createdBy: companyId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  await prisma.revenue.update({
    where: { id: revId },
    data: {
      ...(body.customer_id !== undefined && {
        customerId: body.customer_id != null ? BigInt(Number(body.customer_id)) : null,
      }),
      ...(body.date != null && { date: new Date(String(body.date)) }),
      ...(body.amount != null && { amount: Number(body.amount) }),
      ...(body.category !== undefined && { category: body.category ? String(body.category) : null }),
      ...(body.description !== undefined && { description: body.description ? String(body.description) : null }),
      ...(body.bank_account_id !== undefined && {
        bankAccountId: body.bank_account_id != null ? BigInt(Number(body.bank_account_id)) : null,
      }),
      ...(body.payment_method !== undefined && {
        paymentMethod: body.payment_method ? String(body.payment_method) : null,
      }),
      ...(body.status != null && { status: String(body.status) }),
      ...(body.notes !== undefined && { notes: body.notes ? String(body.notes) : null }),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; invoiceId: string }> }
) {
  if (!(await requireSuperadminManageUsers(req))) return forbidden();

  const { id, invoiceId } = await params;
  let companyId: bigint;
  let revId: bigint;
  try {
    companyId = BigInt(id);
    revId = BigInt(invoiceId);
  } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.revenue.findFirst({
    where: { id: revId, createdBy: companyId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  await prisma.revenue.delete({ where: { id: revId } });
  return NextResponse.json({ ok: true });
}
