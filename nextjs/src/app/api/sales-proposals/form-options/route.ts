import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { listSalesProposalFormOptions } from "@/lib/sales-proposal-form-options";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null; creatorId: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.creatorId ?? actor.id;
}

function canUseProposalFormOptions(perms: string[]) {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-sales-proposals") ||
    hasPermission(perms, "create-sales-proposals") ||
    hasPermission(perms, "view-sales-proposals")
  );
}

export async function GET(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (!canUseProposalFormOptions(perms)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true, creatorId: true },
  });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const options = await listSalesProposalFormOptions(getCompanyId(actor));
    return NextResponse.json({ ok: true, ...options });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        leads: [],
        deals: [],
        projects: [],
        currencies: [],
        taxes: [],
        units: [],
        products: [],
        services: [],
        message: (e as Error).message ?? "Failed to load form options.",
      },
      { status: 500 },
    );
  }
}
