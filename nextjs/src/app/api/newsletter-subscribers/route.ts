import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

function requirePerm(req: NextRequest, perm: string) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, perm) && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const blocked = requirePerm(req, "manage-newsletter-subscribers");
  if (blocked) return blocked;

  const email = req.nextUrl.searchParams.get("email") || "";
  const subs = await prisma.newsletterSubscriber.findMany({
    where: email ? { email: { contains: email, mode: "insensitive" } } : undefined,
    orderBy: { subscribedAt: "desc" },
    select: {
      id: true,
      email: true,
      subscribedAt: true,
      ipAddress: true,
      country: true,
      city: true,
      region: true,
      browser: true,
      os: true,
      device: true,
    },
    take: 500,
  });

  return NextResponse.json({
    ok: true,
    subscribers: subs.map((s) => ({
      id: s.id.toString(),
      email: s.email,
      subscribedAt: s.subscribedAt.toISOString(),
      ipAddress: s.ipAddress,
      country: s.country,
      city: s.city,
      region: s.region,
      browser: s.browser,
      os: s.os,
      device: s.device,
    })),
  });
}

