/**
 * Same as impersonate-form but requires a fresh profile OTP (`pf_sensitive_switch` cookie).
 */
import { NextRequest } from "next/server";

import { handleImpersonateFormPost } from "@/lib/impersonate-form-handler";

export async function POST(req: NextRequest) {
  return handleImpersonateFormPost(req, { requireSensitiveSwitchGate: true });
}
