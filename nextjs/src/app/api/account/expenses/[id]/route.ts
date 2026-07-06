import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasAccountPermission } from "@/lib/authz";

function normalizeEmail(e: string) { return e.trim().toLowerCase(); }
function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-expenses")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true, createdBy: true } });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = getCompanyId(actor);
  const { id } = await params;
  const existing = await prisma.expense.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  await prisma.expense.update({
    where: { id: BigInt(id) },
    data: {
      ...(body.vendor_id !== undefined && { vendorId: body.vendor_id != null ? BigInt(Number(body.vendor_id)) : null }),
      ...(body.date != null && { date: new Date(String(body.date)) }),
      ...(body.amount != null && { amount: Number(body.amount) }),
      ...(body.category !== undefined && { category: body.category ? String(body.category) : null }),
      ...(body.description !== undefined && { description: body.description ? String(body.description) : null }),
      ...(body.bank_account_id !== undefined && { bankAccountId: body.bank_account_id != null ? BigInt(Number(body.bank_account_id)) : null }),
      ...(body.payment_method !== undefined && { paymentMethod: body.payment_method ? String(body.payment_method) : null }),
      ...(body.status != null && { status: String(body.status) }),
      ...(body.notes !== undefined && { notes: body.notes ? String(body.notes) : null }),
      updatedAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-expenses")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true, createdBy: true } });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = getCompanyId(actor);
  const { id } = await params;
  const existing = await prisma.expense.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.expense.delete({ where: { id: BigInt(id) } });
  return NextResponse.json({ ok: true });
}
