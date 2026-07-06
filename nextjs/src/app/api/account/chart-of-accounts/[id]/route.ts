import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasAccountPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.id;
}

async function getActor(req: NextRequest) {
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return null;
  return prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true, createdBy: true } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-chart-of-accounts")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const row = await prisma.chartOfAccount.findUnique({ where: { id: BigInt(id) } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: Number(row.id),
    account_code: row.accountCode,
    account_name: row.accountName,
    account_type_id: Number(row.accountTypeId),
    parent_account_id: row.parentAccountId != null ? Number(row.parentAccountId) : null,
    normal_balance: row.normalBalance,
    opening_balance: row.openingBalance?.toString() ?? "0",
    current_balance: row.currentBalance?.toString() ?? "0",
    description: row.description ?? null,
    is_active: row.isActive,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-chart-of-accounts")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actor = await getActor(req);
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const { id } = await params;

  const existing = await prisma.chartOfAccount.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const updated = await prisma.chartOfAccount.update({
    where: { id: BigInt(id) },
    data: {
      accountCode: body.account_code != null ? String(body.account_code).trim() : undefined,
      accountName: body.account_name != null ? String(body.account_name).trim() : undefined,
      accountTypeId: body.account_type_id != null ? BigInt(Number(body.account_type_id)) : undefined,
      parentAccountId: body.parent_account_id !== undefined ? (body.parent_account_id ? BigInt(Number(body.parent_account_id)) : null) : undefined,
      normalBalance: body.normal_balance != null ? String(body.normal_balance) : undefined,
      openingBalance: body.opening_balance != null ? Number(body.opening_balance) : undefined,
      description: body.description !== undefined ? (body.description ? String(body.description).trim() : null) : undefined,
      isActive: body.is_active !== undefined ? Boolean(body.is_active) : undefined,
    },
  });

  return NextResponse.json({ ok: true, id: Number(updated.id) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-chart-of-accounts")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actor = await getActor(req);
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const { id } = await params;

  const existing = await prisma.chartOfAccount.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.chartOfAccount.delete({ where: { id: BigInt(id) } });
  return NextResponse.json({ ok: true });
}
