import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const email = String(body?.email ?? "").trim();
  if (!email) {
    return NextResponse.json({ success: false, message: "Email is required." }, { status: 400 });
  }

  // MVP parity: accept subscription without wiring storage yet.
  // (Laravel stores subscribers via LandingPage module; we’ll wire DB once that table is finalized.)
  return NextResponse.json({ success: true, message: "Thank you for subscribing to our newsletter!" });
}

