import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { buildGoogleCalendarAuthUrl, getGoogleCalendarRedirectUri, googleCalendarOAuthConfigured } from "@/lib/google-calendar-config";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "pf_gcal_oauth_state";
const RETURN_COOKIE = "pf_gcal_return_to";

export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  if (!googleCalendarOAuthConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Google Calendar OAuth is not configured (set GOOGLE_CALENDAR_CLIENT_ID/SECRET)." },
      { status: 503 },
    );
  }

  const state = randomBytes(24).toString("hex");
  const returnTo = req.nextUrl.searchParams.get("returnTo")?.trim() || "/lms/classes";
  const redirectUri = getGoogleCalendarRedirectUri(req.nextUrl.origin);
  const url = buildGoogleCalendarAuthUrl({ redirectUri, state });

  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  res.cookies.set(RETURN_COOKIE, returnTo.slice(0, 512), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
