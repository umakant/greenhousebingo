import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

function normalizeEmail(e: string) { return e.trim().toLowerCase(); }

export async function POST(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!perms.includes("*") && !hasPermission(perms, "manage-messenger") && !hasPermission(perms, "send-messages")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const favoriteId = body.favorite_id ? BigInt(body.favorite_id) : null;
  if (!favoriteId) return NextResponse.json({ error: "favorite_id required" }, { status: 422 });

  const existing = await prisma.messengerFavorite.findUnique({
    where: { userId_favoriteId: { userId: actor.id, favoriteId } },
  });

  if (existing) {
    await prisma.messengerFavorite.delete({
      where: { userId_favoriteId: { userId: actor.id, favoriteId } },
    });
    return NextResponse.json({ is_favorite: false });
  } else {
    await prisma.messengerFavorite.create({
      data: { userId: actor.id, favoriteId },
    });
    return NextResponse.json({ is_favorite: true });
  }
}
