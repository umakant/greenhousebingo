import "server-only";

import { googleCalendarOAuthConfigured } from "@/lib/google-calendar-config";
import { prisma } from "@/lib/prisma";

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
};

type GoogleEventPayload = {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  status?: "confirmed" | "cancelled";
};

export type GoogleCalendarConnectionRow = {
  id: bigint;
  userId: bigint;
  organizationId: bigint;
  googleEmail: string | null;
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: Date | null;
  calendarId: string;
  syncLiveSessions: boolean;
};

async function exchangeCodeForTokens(params: {
  code: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!.trim(),
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const json = (await res.json().catch(() => null)) as TokenResponse & { error?: string };
  if (!res.ok || !json?.access_token) {
    throw new Error(json?.error ?? "Google token exchange failed.");
  }
  return json;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!.trim(),
      grant_type: "refresh_token",
    }),
  });
  const json = (await res.json().catch(() => null)) as TokenResponse & { error?: string };
  if (!res.ok || !json?.access_token) {
    throw new Error(json?.error ?? "Google token refresh failed.");
  }
  return json;
}

export async function getGoogleUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json().catch(() => null)) as { email?: string } | null;
  if (!res.ok) return null;
  return json?.email?.trim() ?? null;
}

export async function saveGoogleCalendarConnection(params: {
  userId: bigint;
  organizationId: bigint;
  code: string;
  redirectUri: string;
}) {
  if (!googleCalendarOAuthConfigured()) {
    throw new Error("Google Calendar OAuth is not configured.");
  }
  const tokens = await exchangeCodeForTokens({ code: params.code, redirectUri: params.redirectUri });
  const email = await getGoogleUserEmail(tokens.access_token);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.userGoogleCalendarConnection.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      organizationId: params.organizationId,
      googleEmail: email,
      refreshToken: tokens.refresh_token ?? "",
      accessToken: tokens.access_token,
      accessTokenExpiresAt: expiresAt,
      calendarId: "primary",
      syncLiveSessions: true,
    },
    update: {
      organizationId: params.organizationId,
      ...(email ? { googleEmail: email } : {}),
      ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
      accessToken: tokens.access_token,
      accessTokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    },
  });

  return { email };
}

export async function disconnectGoogleCalendar(userId: bigint) {
  await prisma.userGoogleCalendarConnection.deleteMany({ where: { userId } });
  await prisma.lmsUserCalendarEventLink.deleteMany({ where: { userId } });
}

export async function getGoogleCalendarConnection(
  userId: bigint,
): Promise<GoogleCalendarConnectionRow | null> {
  return prisma.userGoogleCalendarConnection.findUnique({ where: { userId } });
}

async function ensureAccessToken(conn: GoogleCalendarConnectionRow): Promise<string> {
  const now = Date.now();
  if (
    conn.accessToken &&
    conn.accessTokenExpiresAt &&
    conn.accessTokenExpiresAt.getTime() > now + 60_000
  ) {
    return conn.accessToken;
  }
  const tokens = await refreshAccessToken(conn.refreshToken);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  await prisma.userGoogleCalendarConnection.update({
    where: { userId: conn.userId },
    data: {
      accessToken: tokens.access_token,
      accessTokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    },
  });
  return tokens.access_token;
}

async function calendarFetch(
  conn: GoogleCalendarConnectionRow,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await ensureAccessToken(conn);
  return fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export async function upsertGoogleCalendarEvent(
  conn: GoogleCalendarConnectionRow,
  event: GoogleEventPayload,
  existingEventId?: string | null,
): Promise<string> {
  const calendarId = encodeURIComponent(conn.calendarId || "primary");
  if (existingEventId) {
    const res = await calendarFetch(
      conn,
      `/calendars/${calendarId}/events/${encodeURIComponent(existingEventId)}`,
      { method: "PUT", body: JSON.stringify(event) },
    );
    const json = (await res.json().catch(() => null)) as { id?: string; error?: { message?: string } };
    if (!res.ok || !json?.id) {
      throw new Error(json?.error?.message ?? "Failed to update Google Calendar event.");
    }
    return json.id;
  }
  const res = await calendarFetch(conn, `/calendars/${calendarId}/events`, {
    method: "POST",
    body: JSON.stringify(event),
  });
  const json = (await res.json().catch(() => null)) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json?.id) {
    throw new Error(json?.error?.message ?? "Failed to create Google Calendar event.");
  }
  return json.id;
}

export async function deleteGoogleCalendarEvent(
  conn: GoogleCalendarConnectionRow,
  eventId: string,
): Promise<void> {
  const calendarId = encodeURIComponent(conn.calendarId || "primary");
  const res = await calendarFetch(
    conn,
    `/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
  if (res.status !== 204 && res.status !== 410 && !res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } };
    throw new Error(json?.error?.message ?? "Failed to delete Google Calendar event.");
  }
}

export function liveSessionToGoogleEvent(input: {
  title: string;
  description?: string | null;
  startsAt: Date;
  endsAt: Date;
  meetingUrl?: string | null;
  courseTitle?: string | null;
  cancelled?: boolean;
}): GoogleEventPayload {
  const parts: string[] = [];
  if (input.courseTitle?.trim()) parts.push(`Course: ${input.courseTitle.trim()}`);
  if (input.description?.trim()) parts.push(input.description.trim());
  if (input.meetingUrl?.trim()) parts.push(`Join: ${input.meetingUrl.trim()}`);

  return {
    summary: input.title.trim() || "Live class",
    description: parts.join("\n\n") || undefined,
    location: input.meetingUrl?.trim() || undefined,
    start: { dateTime: input.startsAt.toISOString() },
    end: { dateTime: input.endsAt.toISOString() },
    ...(input.cancelled ? { status: "cancelled" as const } : {}),
  };
}
