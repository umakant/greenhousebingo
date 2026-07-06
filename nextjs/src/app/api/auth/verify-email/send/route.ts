import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { sendEmailVerificationForUser } from "@/lib/send-email-verification";

export const dynamic = "force-dynamic";

function appUrlFromReq(req: NextRequest): string {
  const env = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (env) return env.replace(/\/+$/, "");
  return req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, message: "Not authenticated." }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, name: true, type: true, createdBy: true, emailVerifiedAt: true },
  });
  if (!user) {
    return NextResponse.json({ ok: false, message: "User not found." }, { status: 404 });
  }

  const userEmail = user.email?.trim().toLowerCase() ?? "";
  if (!userEmail) {
    return NextResponse.json({ ok: false, message: "No email address on this account." }, { status: 400 });
  }

  const result = await sendEmailVerificationForUser(
    { id: user.id, email: userEmail, name: user.name, type: user.type, createdBy: user.createdBy },
    appUrlFromReq(req),
  );
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    message: result.message,
    ...(result.devLink ? { devLink: result.devLink } : {}),
  });
}
