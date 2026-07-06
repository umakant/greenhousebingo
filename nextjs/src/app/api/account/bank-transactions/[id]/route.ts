import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasBankTransactionPermission } from "@/lib/authz";

function normalizeEmail(e: string) { return e.trim().toLowerCase(); }
function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasBankTransactionPermission(perms)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true, createdBy: true } });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const { id } = await params;
  const existing = await prisma.bankTransaction.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (body.bank_account_id != null) {
    const bid = BigInt(Number(body.bank_account_id));
    const owns = await prisma.bankAccount.findFirst({
      where: { id: bid, createdBy: companyId },
      select: { id: true },
    });
    if (!owns) return NextResponse.json({ error: "Invalid or inaccessible bank account" }, { status: 400 });
  }

  await prisma.bankTransaction.update({
    where: { id: BigInt(id) },
    data: {
      ...(body.bank_account_id != null && { bankAccountId: BigInt(Number(body.bank_account_id)) }),
      ...(body.transaction_date != null && { transactionDate: new Date(String(body.transaction_date)) }),
      ...(body.reference_number !== undefined && { referenceNumber: body.reference_number ? String(body.reference_number) : null }),
      ...(body.description !== undefined && { description: body.description ? String(body.description) : null }),
      ...(body.type != null && { type: String(body.type) === "credit" ? "credit" : "debit" }),
      ...(body.amount != null && { amount: Number(body.amount) }),
      ...(body.balance_after !== undefined && { balanceAfter: body.balance_after != null ? Number(body.balance_after) : null }),
      ...(body.category !== undefined && { category: body.category ? String(body.category) : null }),
      ...(body.notes !== undefined && { notes: body.notes ? String(body.notes) : null }),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasBankTransactionPermission(perms)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true, createdBy: true } });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const { id } = await params;
  const existing = await prisma.bankTransaction.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.bankTransaction.delete({ where: { id: BigInt(id) } });
  return NextResponse.json({ ok: true });
}
