import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null; creatorId: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.creatorId ?? actor.id;
}

function decimalToNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "object" && v !== null && "toNumber" in v) {
    return (v as { toNumber: () => number }).toNumber();
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (!perms.includes("*") && !hasPermission(perms, "create-sales-proposals") && !hasPermission(perms, "edit-sales-proposals")) {
    return NextResponse.json([], { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json([], { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true, creatorId: true },
  });
  if (!actor?.id) return NextResponse.json([], { status: 401 });

  const companyId = getCompanyId(actor);

  try {
    const rows = await prisma.posProduct.findMany({
      where: {
        isActive: true,
        OR: [{ organizationId: companyId }, { createdBy: companyId }],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        stock: true,
        unit: { select: { name: true, shortName: true } },
        tax: { select: { id: true, name: true, rate: true } },
      },
      orderBy: { name: "asc" },
      take: 500,
    });

    return NextResponse.json(
      rows.map((p) => ({
        id: p.id.toString(),
        name: p.name,
        sku: p.sku,
        sale_price: decimalToNumber(p.price),
        unit: p.unit?.shortName ?? p.unit?.name ?? "Pcs",
        type: "product",
        stock_quantity: p.stock,
        taxes: p.tax
          ? [{ id: p.tax.id.toString(), name: p.tax.name, rate: decimalToNumber(p.tax.rate) }]
          : [],
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}
