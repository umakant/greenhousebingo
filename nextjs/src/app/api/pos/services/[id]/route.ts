import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";
import { posProductTenantWhere } from "@/lib/pos-product-scope";

export const dynamic = "force-dynamic";

async function assertServiceAccess(id: bigint): Promise<{ ok: true } | { ok: false; response: ReturnType<typeof posErr> }> {
  const tenant = await posProductTenantWhere();
  const row = await prisma.posService.findUnique({ where: { id }, select: { organizationId: true } });
  if (!row) return { ok: false, response: posErr("Not found", 404) };
  if ("organizationId" in tenant && tenant.organizationId != null) {
    if (row.organizationId !== tenant.organizationId) {
      return { ok: false, response: posErr("Not found", 404) };
    }
  }
  return { ok: true };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await posAuth())) return posErr("Unauthorized", 401);
  const { id } = await params;
  let bid: bigint;
  try {
    bid = BigInt(id);
  } catch {
    return posErr("Invalid id", 400);
  }
  const gate = await assertServiceAccess(bid);
  if (!gate.ok) return gate.response;

  const row = await prisma.posService.findUnique({
    where: { id: bid },
    include: { unit: true, tax: true },
  });
  if (!row) return posErr("Not found", 404);
  return posOk(ser(row));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await posAuth())) return posErr("Unauthorized", 401);
  const { id } = await params;
  let bid: bigint;
  try {
    bid = BigInt(id);
  } catch {
    return posErr("Invalid id", 400);
  }
  const gate = await assertServiceAccess(bid);
  if (!gate.ok) return gate.response;

  const body = (await req.json()) as Record<string, unknown>;
  const row = await prisma.posService.update({
    where: { id: bid },
    data: {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.description !== undefined ? { description: body.description != null ? String(body.description) : null } : {}),
      ...(body.code !== undefined ? { code: body.code != null ? String(body.code) : null } : {}),
      ...(body.rate !== undefined ? { rate: body.rate as number | string } : {}),
      ...(body.unitId !== undefined ? { unitId: body.unitId ? BigInt(String(body.unitId)) : null } : {}),
      ...(body.taxId !== undefined ? { taxId: body.taxId ? BigInt(String(body.taxId)) : null } : {}),
      ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
    },
    include: { unit: true, tax: true },
  });
  return posOk(ser(row));
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await posAuth())) return posErr("Unauthorized", 401);
  const { id } = await params;
  let bid: bigint;
  try {
    bid = BigInt(id);
  } catch {
    return posErr("Invalid id", 400);
  }
  const gate = await assertServiceAccess(bid);
  if (!gate.ok) return gate.response;

  await prisma.posService.delete({ where: { id: bid } });
  return posOk({ success: true });
}
