import "server-only";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function googleCalendarOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim(),
  );
}

export function getGoogleCalendarRedirectUri(origin: string): string {
  const env = process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim();
  if (env) return env.replace(/\/$/, "");
  return `${origin.replace(/\/$/, "")}/api/integrations/google-calendar/callback`;
}

export function buildGoogleCalendarAuthUrl(params: {
  redirectUri: string;
  state: string;
}): string {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID!.trim();
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: params.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`;
}

export { CALENDAR_SCOPE };
