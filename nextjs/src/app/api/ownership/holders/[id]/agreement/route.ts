import { NextRequest, NextResponse } from "next/server";

import { guardBrandOwnershipAdmin } from "@/lib/brand-ownership-api-guard";
import {
  approvePartnershipAgreement,
  getPartnershipAgreementForHolder,
  rejectPartnershipAgreement,
  resendPartnershipAgreementInvite,
} from "@/lib/partnership-agreement-service";

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

export async function GET(_req: NextRequest, { params }: Ctx) {
  const denied = await guardBrandOwnershipAdmin(_req);
  if (denied) return denied;

  const { id } = await params;
  let holderId: bigint;
  try {
    holderId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid holder id." }, { status: 400 });
  }

  try {
    const agreement = await getPartnershipAgreementForHolder(holderId);
    if (!agreement) {
      return NextResponse.json({ ok: false, message: "No agreement found for this partner." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, agreement });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load agreement.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const denied = await guardBrandOwnershipAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  let holderId: bigint;
  try {
    holderId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid holder id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "").trim().toLowerCase();

  try {
    if (action === "resend") {
      await resendPartnershipAgreementInvite(holderId, req.nextUrl.origin);
      return NextResponse.json({ ok: true, message: "Agreement email resent." });
    }
    if (action === "approve") {
      await approvePartnershipAgreement({
        holderId,
        approvedByUserId: await currentUserId(req),
        appUrl: req.nextUrl.origin,
      });
      return NextResponse.json({ ok: true, message: "Agreement approved." });
    }
    if (action === "reject") {
      await rejectPartnershipAgreement({
        holderId,
        notes: body.notes != null ? String(body.notes) : null,
        rejectedByUserId: await currentUserId(req),
        appUrl: req.nextUrl.origin,
      });
      return NextResponse.json({ ok: true, message: "Agreement rejected." });
    }
    return NextResponse.json({ ok: false, message: "action must be resend, approve, or reject." }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Action failed.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}