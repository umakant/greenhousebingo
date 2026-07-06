import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

type DetailsShape = {
  user_agent?: string;
  success?: boolean;
};

export async function GET(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "manage-users")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const userIdRaw = (url.searchParams.get("user_id") ?? "").trim();
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "25", 10) || 25));

  const where =
    userIdRaw && /^\d+$/.test(userIdRaw)
      ? { userId: BigInt(userIdRaw) }
      : {};

  let filteredUser: { id: string; name: string | null; email: string | null } | null = null;
  if (userIdRaw && /^\d+$/.test(userIdRaw)) {
    const uid = BigInt(userIdRaw);
    const u = await prisma.user.findFirst({
      where: { id: uid },
      select: { id: true, name: true, email: true },
    });
    if (u) {
      filteredUser = { id: u.id.toString(), name: u.name, email: u.email };
    }
  }

  const [total, rows] = await Promise.all([
    prisma.loginHistory.count({ where }),
    prisma.loginHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        userId: true,
        ip: true,
        date: true,
        details: true,
        type: true,
        createdAt: true,
      },
    }),
  ]);

  const userIds = [...new Set(rows.map((r) => r.userId).filter((x): x is bigint => x != null))];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const userMap = new Map(users.map((u) => [u.id.toString(), u]));

  const items = rows.map((r) => {
    const uid = r.userId?.toString();
    const u = uid ? userMap.get(uid) : undefined;
    const details = (r.details as DetailsShape | null) ?? {};
    return {
      id: r.id.toString(),
      userId: uid ?? null,
      userName: u?.name ?? null,
      userEmail: u?.email ?? null,
      ip: r.ip,
      userAgent: typeof details.user_agent === "string" ? details.user_agent : "",
      type: r.type ?? "login",
      success: details.success !== false,
      createdAt: r.createdAt.toISOString(),
      date: r.date.toISOString().slice(0, 10),
    };
  });

  return NextResponse.json({
    ok: true,
    page,
    perPage,
    total,
    filteredUser,
    items,
  });
}
