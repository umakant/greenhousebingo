import { NextRequest, NextResponse } from "next/server";

import { saveGoogleCalendarConnection } from "@/lib/google-calendar-api";
import { getGoogleCalendarRedirectUri, googleCalendarOAuthConfigured } from "@/lib/google-calendar-config";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "pf_gcal_oauth_state";
const RETURN_COOKIE = "pf_gcal_return_to";

export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  const returnTo = req.cookies.get(RETURN_COOKIE)?.value || "/lms/classes";
  const failRedirect = new URL(returnTo, req.nextUrl.origin);
  failRedirect.searchParams.set("gcal", "error");

  if (!actor) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }
  if (!googleCalendarOAuthConfigured()) {
    return NextResponse.redirect(failRedirect);
  }

  const err = req.nextUrl.searchParams.get("error");
  if (err) {
    return NextResponse.redirect(failRedirect);
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(failRedirect);
  }

  try {
    const redirectUri = getGoogleCalendarRedirectUri(req.nextUrl.origin);
    await saveGoogleCalendarConnection({
      userId: actor.userId,
      organizationId: actor.organizationId,
      code,
      redirectUri,
    });
  } catch {
    return NextResponse.redirect(failRedirect);
  }

  const okRedirect = new URL(returnTo, req.nextUrl.origin);
  okRedirect.searchParams.set("gcal", "connected");
  const res = NextResponse.redirect(okRedirect);
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(RETURN_COOKIE);
  return res;
}
