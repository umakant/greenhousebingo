/**
 * Stop impersonating and restore the prior session.
 */
import { NextRequest, NextResponse } from "next/server";
import { handleLeaveImpersonation } from "@/lib/leave-impersonation";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true, redirect: "/companies" });
  const { restored, redirectUrl } = await handleLeaveImpersonation(req, res);
  if (!restored) {
    return NextResponse.json({ ok: false, message: "Not impersonating" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, redirect: redirectUrl });
}
