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

export async function GET(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (!perms.includes("*") && !hasPermission(perms, "create-sales-proposals") && !hasPermission(perms, "edit-sales-proposals")) {
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
  try {
    const list = await prisma.warehouse.findMany({
      where: { isActive: true, createdBy: companyId },
      select: { id: true, name: true, address: true, city: true },
      orderBy: { name: "asc" },
      take: 500,
    });
    return NextResponse.json(
      list.map((w) => ({
        id: w.id.toString(),
        name: w.name,
        address: w.address,
        city: w.city ?? "",
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}
