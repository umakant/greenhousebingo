import { NextResponse, type NextRequest } from "next/server";

import { loadEmailSettingsOtpStatus, requireEmailSettingsOtpAuth } from "@/lib/email-settings-otp-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireEmailSettingsOtpAuth(req);
  if (!auth.ok) return auth.res;

  const [status, profile] = await Promise.all([
    loadEmailSettingsOtpStatus(auth.ownerId),
    prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { email: true, mobileNo: true },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    ...status,
    userEmail: (profile?.email ?? "").trim().toLowerCase(),
    userPhone: (profile?.mobileNo ?? "").trim(),
  });
}
