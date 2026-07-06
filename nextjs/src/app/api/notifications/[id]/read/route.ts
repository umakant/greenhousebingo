import { NextResponse, type NextRequest } from "next/server";

import { markAppNotificationRead } from "@/lib/app-notifications";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const raw = req.cookies.get("pf_user_id")?.value?.trim();
  let userId: bigint;
  try {
    userId = BigInt(raw ?? "");
  } catch {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let notificationId: bigint;
  try {
    notificationId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }

  await markAppNotificationRead(userId, notificationId);
  return NextResponse.json({ ok: true });
}
