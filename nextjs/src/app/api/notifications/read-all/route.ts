import { NextResponse, type NextRequest } from "next/server";

import { markAllAppNotificationsRead } from "@/lib/app-notifications";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const raw = req.cookies.get("pf_user_id")?.value?.trim();
  let userId: bigint;
  try {
    userId = BigInt(raw ?? "");
  } catch {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  const count = await markAllAppNotificationsRead(userId);
  return NextResponse.json({ ok: true, count });
}
