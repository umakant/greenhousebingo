import { NextResponse, type NextRequest } from "next/server";

import { requireEmailSettingsOtpAuth, sendEmailSettingsOtp } from "@/lib/email-settings-otp-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireEmailSettingsOtpAuth(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  const type = body?.type === "phone" ? "phone" : body?.type === "email" ? "email" : "";
  const value = typeof body?.value === "string" ? body.value.trim() : "";
  if (!type) return NextResponse.json({ ok: false, message: "type must be email or phone" }, { status: 400 });
  if (!value) return NextResponse.json({ ok: false, message: `${type} is required` }, { status: 400 });

  const result = await sendEmailSettingsOtp(auth.ownerId, type, value);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.error }, { status: result.status });
  }

  const payload: Record<string, unknown> = { ok: true, message: result.message };
  if (result.otp && process.env.NODE_ENV !== "production") {
    payload.otp = result.otp;
  }
  return NextResponse.json(payload);
}
