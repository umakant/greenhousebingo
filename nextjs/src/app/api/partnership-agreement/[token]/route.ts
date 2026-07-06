import { NextRequest, NextResponse } from "next/server";

import {
  getAgreementBySignToken,
  signPartnershipAgreement,
} from "@/lib/partnership-agreement-service";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { token } = await params;
  const agreement = await getAgreementBySignToken(token);
  if (!agreement) {
    return NextResponse.json({ ok: false, message: "Agreement not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, agreement });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { token } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const signedName = String(body.signedName ?? "").trim();
  const signatureData = String(body.signatureData ?? "").trim();

  try {
    await signPartnershipAgreement({
      signToken: token,
      signedName,
      signatureData,
      appUrl: req.nextUrl.origin,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not sign agreement.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
