/**
 * Leave-impersonation endpoint.
 * Restores the prior session (supports nested superadmin → company → portal).
 */
import { NextRequest, NextResponse } from "next/server";
import { handleLeaveImpersonation } from "@/lib/leave-impersonation";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true, redirectUrl: "" });
  const { redirectUrl } = await handleLeaveImpersonation(req, res);
  return new NextResponse(JSON.stringify({ success: true, redirectUrl }), {
    status: 200,
    headers: res.headers,
  });
}
