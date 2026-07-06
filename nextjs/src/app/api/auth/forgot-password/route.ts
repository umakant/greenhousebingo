import { NextResponse, type NextRequest } from "next/server";

type Body = { email?: string };

/**
 * Accepts reset requests without revealing whether the email exists.
 * Email delivery / tokens can be wired later (e.g. nodemailer + DB token).
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ ok: false, message: "Email is required." }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for this email, you will receive password reset instructions shortly.",
  });
}
