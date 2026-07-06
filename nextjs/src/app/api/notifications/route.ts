import { NextResponse, type NextRequest } from "next/server";

import { listAppNotifications } from "@/lib/app-notifications";

export const dynamic = "force-dynamic";

function currentUserId(req: NextRequest): bigint | null {
  const raw = req.cookies.get("pf_user_id")?.value?.trim();
  if (!raw) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = currentUserId(req);
  if (userId == null) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 30);
  const unreadOnly = url.searchParams.get("unreadOnly") === "1";
  const { items, unreadCount } = await listAppNotifications(userId, { limit, unreadOnly });
  return NextResponse.json({ ok: true, items, unreadCount });
}
