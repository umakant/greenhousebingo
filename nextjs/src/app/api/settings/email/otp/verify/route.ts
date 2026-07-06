import { NextResponse, type NextRequest } from "next/server";

import { verifyEmailSettingsOtp, requireEmailSettingsOtpAuth } from "@/lib/email-settings-otp-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireEmailSettingsOtpAuth(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  const type = body?.type === "phone" ? "phone" : body?.type === "email" ? "email" : "";
  const value = typeof body?.value === "string" ? body.value.trim() : "";
  const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
  if (!type) return NextResponse.json({ ok: false, message: "type must be email or phone" }, { status: 400 });
  if (!value || !otp) {
    return NextResponse.json({ ok: false, message: "value and otp are required" }, { status: 400 });
  }

  const result = await verifyEmailSettingsOtp(auth.ownerId, type, value, otp);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, verifiedAt: result.verifiedAt, message: "Verified successfully" });
}
