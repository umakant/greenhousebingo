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
  if (!hasAccountPermission(perms, "manage-bank-accounts")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const row = await prisma.bankAccount.findUnique({ where: { id: BigInt(id) } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: Number(row.id),
    account_number: row.accountNumber,
    account_name: row.accountName,
    bank_name: row.bankName,
    branch_name: row.branchName,
    account_type: row.accountType,
    opening_balance: row.openingBalance?.toString() ?? "0",
    current_balance: row.currentBalance?.toString() ?? "0",
    is_active: row.isActive,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-bank-accounts")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actor = await getActor(req);
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const { id } = await params;

  const existing = await prisma.bankAccount.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
    const updated = await prisma.bankAccount.update({
      where: { id: BigInt(id) },
      data: {
        accountName: body.account_name != null ? String(body.account_name).trim() : undefined,
        accountNumber: body.account_number != null ? String(body.account_number).trim() : undefined,
        bankName: body.bank_name != null ? String(body.bank_name).trim() : undefined,
        branchName: body.branch_name !== undefined ? (body.branch_name ? String(body.branch_name).trim() : null) : undefined,
        accountType: body.account_type != null ? String(body.account_type) : undefined,
        openingBalance: body.opening_balance != null ? Number(body.opening_balance) : undefined,
        isActive: body.is_active !== undefined ? Boolean(body.is_active) : undefined,
      },
    });

    return NextResponse.json({ ok: true, id: Number(updated.id) });
  } catch (e) {
    console.error("[api/account/bank-accounts] PATCH", e);
    const message = e instanceof Error ? e.message : "Failed to update bank account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-bank-accounts")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actor = await getActor(req);
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const { id } = await params;

  const existing = await prisma.bankAccount.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.bankAccount.delete({ where: { id: BigInt(id) } });
  return NextResponse.json({ ok: true });
}
