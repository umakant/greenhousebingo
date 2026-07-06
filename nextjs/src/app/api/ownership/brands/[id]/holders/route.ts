import { NextRequest, NextResponse } from "next/server";

import { guardBrandOwnershipAdmin } from "@/lib/brand-ownership-api-guard";
import {
  addOwnershipPartner,
  recordOwnershipConflictRequest,
  recordOwnershipPartnerRequest,
  validateBrandOwnershipChange,
} from "@/lib/brand-ownership-service";
import { combineHolderName } from "@/lib/brand-ownership-holder-name";
import { createPartnershipAgreementForHolder } from "@/lib/partnership-agreement-service";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

async function currentUserId(req: NextRequest): Promise<bigint | null> {
  const raw = req.cookies.get("pf_user_id")?.value;
  if (!raw) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const denied = await guardBrandOwnershipAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  let brandId: bigint;
  try {
    brandId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid brand id." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const firstName = String(body?.firstName ?? "").trim();
  const lastName = String(body?.lastName ?? "").trim();
  const name = String(body?.name ?? "").trim() || combineHolderName(firstName, lastName);
  if (!name) {
    return NextResponse.json({ ok: false, message: "Partner first or last name is required." }, { status: 400 });
  }

  const currentOwnershipPercent = Number(body?.currentOwnershipPercent);
  const minimumOwnershipPercent = Number(body?.minimumOwnershipPercent);

  const validation = await validateBrandOwnershipChange(
    brandId,
    null,
    currentOwnershipPercent,
    minimumOwnershipPercent,
  );
  if (!validation.isValid) {
    await recordOwnershipConflictRequest({
      brandId,
      partnerName: name,
      email: body?.email ?? null,
      phone: body?.phone ?? null,
      referralCode: body?.referralCode ?? null,
      requestedCurrentOwnership: currentOwnershipPercent,
      requestedMinimumOwnership: minimumOwnershipPercent,
      conflictMessage: validation.conflictMessage,
      notes: body?.notes ?? null,
      requestedByUserId: await currentUserId(req),
    }).catch(() => null);

    return NextResponse.json(
      { ok: false, message: validation.conflictMessage, validation },
      { status: 409 },
    );
  }

  const email = String(body?.email ?? "").trim() || null;
  if (!email?.includes("@")) {
    return NextResponse.json(
      { ok: false, message: "Partner email is required to send the partnership agreement." },
      { status: 400 },
    );
  }

  try {
    const holder = await addOwnershipPartner({
      brandId,
      name,
      firstName: firstName || null,
      lastName: lastName || null,
      email,
      phone: body?.phone ?? null,
      referralCode: body?.referralCode ?? null,
      currentOwnershipPercent,
      minimumOwnershipPercent,
      status: "pending_agreement",
      payoutMethod: body?.payoutMethod ?? null,
      payoutEmail: body?.payoutEmail ?? null,
      notes: body?.notes ?? null,
      changedByUserId: await currentUserId(req),
    });

    await recordOwnershipPartnerRequest({
      brandId,
      holderId: holder.id,
      partnerName: name,
      email,
      phone: body?.phone ?? null,
      referralCode: body?.referralCode ?? null,
      requestedCurrentOwnership: currentOwnershipPercent,
      requestedMinimumOwnership: minimumOwnershipPercent,
      notes: body?.notes ?? null,
      requestedByUserId: await currentUserId(req),
    }).catch((err) => {
      console.warn("[ownership/holders] Could not record ownership request:", err);
    });

    let emailSent = false;
    let emailError: string | undefined;
    try {
      const userId = await currentUserId(req);
      let invitedBy = "Administrator";
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        });
        invitedBy = (user?.name ?? user?.email ?? invitedBy).trim() || invitedBy;
      }
      await createPartnershipAgreementForHolder(holder.id, req.nextUrl.origin, invitedBy);
      emailSent = true;
    } catch (e) {
      emailError = e instanceof Error ? e.message : "Could not send agreement email.";
    }

    return NextResponse.json({
      ok: true,
      holder: { id: holder.id.toString(), name: holder.name },
      emailSent,
      emailError,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not add partner.";
    const validation = (e as Error & { validation?: unknown }).validation;
    return NextResponse.json({ ok: false, message, validation }, { status: 400 });
  }
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const denied = await guardBrandOwnershipAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  const current = Number(new URL(req.url).searchParams.get("current") ?? "");
  const minimum = Number(new URL(req.url).searchParams.get("minimum") ?? "");
  const holderIdRaw = new URL(req.url).searchParams.get("holderId");

  let brandId: bigint;
  try {
    brandId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid brand id." }, { status: 400 });
  }

  let holderId: bigint | null = null;
  if (holderIdRaw) {
    try {
      holderId = BigInt(holderIdRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid holder id." }, { status: 400 });
    }
  }

  const validation = await validateBrandOwnershipChange(brandId, holderId, current, minimum);
  return NextResponse.json({ ok: true, validation });
}
