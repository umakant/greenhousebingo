import { NextRequest, NextResponse } from "next/server";

import {
  approvePartnershipAgreement,
  getAgreementByBrandApprovalToken,
} from "@/lib/partnership-agreement-service";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { token } = await params;
  const agreement = await getAgreementByBrandApprovalToken(token);
  if (!agreement) {
    return NextResponse.json({ ok: false, message: "Agreement not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, agreement });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { token } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const approvedByName = String(body.approvedByName ?? "").trim() || null;

  try {
    await approvePartnershipAgreement({
      brandApprovalToken: token,
      approvedByName,
      appUrl: req.nextUrl.origin,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not approve agreement.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
