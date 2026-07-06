/**
 * Impersonation endpoint (admin UI, etc.). Accepts POST (JSON or form-urlencoded),
 * sets impersonation cookies, and returns 200 JSON {redirectUrl}.
 *
 * Profile menu "Switch company" uses `/api/auth/impersonate-after-otp` instead
 * so the user completes OTP first.
 */
import { NextRequest } from "next/server";

import { handleImpersonateFormPost } from "@/lib/impersonate-form-handler";

export async function POST(req: NextRequest) {
  return handleImpersonateFormPost(req, { requireSensitiveSwitchGate: false });
}
