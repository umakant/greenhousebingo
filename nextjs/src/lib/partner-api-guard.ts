import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { resolvePartnerFromRequest } from "@/lib/require-partner-page";

export type GuardedPartner = { id: bigint; slug: string; referralCode: string };

/**
 * Resolve and authorize the partner for a `/api/partner/*` request.
 * Returns either the partner (authorized) or a NextResponse error to short-circuit.
 */
export async function guardPartnerApi(
  req: NextRequest,
): Promise<{ partner: GuardedPartner } | { error: NextResponse }> {
  const partner = await resolvePartnerFromRequest(req);
  if (!partner) {
    return { error: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) };
  }
  return { partner };
}
