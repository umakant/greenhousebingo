import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";
import { posProductTenantWhere, requirePosOrgId } from "@/lib/pos-product-scope";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await posAuth())) return posErr("Unauthorized", 401);
  const tenant = await posProductTenantWhere();
  const rows = await prisma.posService.findMany({
    where: Object.keys(tenant).length ? tenant : undefined,
    include: { unit: true, tax: true },
    orderBy: { name: "asc" },
  });
  return posOk(ser(rows));
}

export async function POST(req: NextRequest) {
  if (!(await posAuth())) return posErr("Unauthorized", 401);
  const orgId = await requirePosOrgId();
  if (!orgId) return posErr("No company context for catalog.", 400);

  const body = (await req.json()) as Record<string, unknown>;
  if (!body.name?.toString().trim()) return posErr("Name is required");
  if (body.rate == null) return posErr("Rate is required");

  const row = await prisma.posService.create({
    data: {
      name: String(body.name).trim(),
      description: body.description != null ? String(body.description) : null,
      code: body.code != null ? String(body.code) : null,
      rate: body.rate as number | string,
      unitId: body.unitId ? BigInt(String(body.unitId)) : null,
      taxId: body.taxId ? BigInt(String(body.taxId)) : null,
      isActive: Boolean(body.isActive ?? true),
      organizationId: orgId,
      createdBy: orgId,
    },
    include: { unit: true, tax: true },
  });
  return posOk(ser(row));
}
