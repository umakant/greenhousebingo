import { NextResponse } from "next/server";

import {
  sendLiveSessionReminders,
  type LiveSessionReminderWindow,
} from "@/lib/lms-notification-service";

function cronAuthorized(req: Request): boolean {
  const secret = (process.env.LMS_CRON_SECRET ?? process.env.CRON_SECRET ?? "").trim();
  if (!secret) return false;
  const header = req.headers.get("x-cron-secret")?.trim();
  const url = new URL(req.url);
  const query = url.searchParams.get("secret")?.trim();
  return header === secret || query === secret;
}

/** POST /api/lms/cron/live-session-reminders?window=24h|1h|both&secret=... */
export async function POST(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const windowParam = new URL(req.url).searchParams.get("window")?.trim().toLowerCase();
  const windows: LiveSessionReminderWindow[] =
    windowParam === "1h"
      ? ["1h"]
      : windowParam === "both"
        ? ["24h", "1h"]
        : ["24h"];

  const results = [];
  for (const window of windows) {
    results.push(await sendLiveSessionReminders({ window }));
  }

  return NextResponse.json({ ok: true, results });
}
