import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { getSettingsForOwner } from "@/lib/settings-service";
import { isCompanyEmailNotificationEnabled, sendTemplatedEmail } from "@/lib/send-templated-email";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null; creatorId: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.creatorId ?? actor.id;
}

/**
 * Explicit "Proposal Send" (parity with a dedicated send action). Respects company "Proposal Send" notification toggle.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = await getPermissionsFromRequest(req);
  if (!perms.includes("*") && !hasPermission(perms, "manage-sales-proposals") && !hasPermission(perms, "edit-sales-proposals")) {
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
  const { id } = await params;
  let proposalId: bigint;
  try {
    proposalId = BigInt(id);
  } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const where: Record<string, unknown> = { id: proposalId };
  if (hasPermission(perms, "manage-any-sales-proposals") || hasPermission(perms, "manage-sales-proposals")) {
    where.createdBy = companyId;
  } else if (hasPermission(perms, "manage-own-sales-proposals")) {
    where.OR = [{ creatorId: actor.id }, { customerId: actor.id }];
  } else if (hasPermission(perms, "edit-sales-proposals")) {
    where.createdBy = companyId;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const proposal = await prisma.salesProposal.findFirst({
    where,
  });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await prisma.user.findUnique({
    where: { id: proposal.customerId },
    select: { email: true, name: true },
  });
  const email = user?.email?.trim();
  if (!email?.includes("@")) {
    return NextResponse.json({ ok: false, message: "Customer email not found" }, { status: 400 });
  }

  const settings = await getSettingsForOwner(companyId);
  if (!isCompanyEmailNotificationEnabled(settings, "Proposal Send")) {
    return NextResponse.json({ ok: false, message: "Proposal Send email is disabled in company settings" }, { status: 400 });
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const proposalUrl = base ? `${base}/sales-proposals/${proposalId.toString()}` : "-";

  const result = await sendTemplatedEmail({
    templateName: "Proposal Send",
    mailTo: [email],
    ownerId: companyId,
    variables: {
      proposal_name: (user?.name ?? "").trim() || email,
      proposal_number: proposal.proposalNumber,
      proposal_url: proposalUrl,
    },
  });

  if (!result.is_success) {
    return NextResponse.json(
      { ok: false, message: typeof result.error === "string" ? result.error : "Failed to send email" },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
