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

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const blocked = requirePerm(req, "export-newsletter-subscribers");
  if (blocked) return blocked;

  const email = req.nextUrl.searchParams.get("email") || "";
  type SubRow = { email: string; subscribedAt: Date; ipAddress: string | null; country: string | null; city: string | null; region: string | null; isp: string | null; org: string | null; timezone: string | null; browser: string | null; os: string | null; device: string | null };
  // Cast: PrismaClient may not expose newsletterSubscriber until after `npx prisma generate`
  const db = prisma as unknown as { newsletterSubscriber: { findMany: (args: object) => Promise<SubRow[]> } };
  const subs = await db.newsletterSubscriber.findMany({
    where: email ? { email: { contains: email, mode: "insensitive" } } : undefined,
    orderBy: { subscribedAt: "desc" },
    select: {
      email: true,
      subscribedAt: true,
      ipAddress: true,
      country: true,
      city: true,
      region: true,
      isp: true,
      org: true,
      timezone: true,
      browser: true,
      os: true,
      device: true,
    },
    take: 5000,
  });

  const header = [
    "Email",
    "Subscribed At",
    "IP Address",
    "Country",
    "City",
    "Region",
    "ISP",
    "Organization",
    "Timezone",
    "Browser",
    "OS",
    "Device",
  ];
  const lines = [header.join(",")];
  for (const s of subs) {
    lines.push(
      [
        csvEscape(s.email),
        csvEscape(s.subscribedAt.toISOString().replace("T", " ").replace("Z", "")),
        csvEscape(s.ipAddress),
        csvEscape(s.country),
        csvEscape(s.city),
        csvEscape(s.region),
        csvEscape(s.isp),
        csvEscape(s.org),
        csvEscape(s.timezone),
        csvEscape(s.browser),
        csvEscape(s.os),
        csvEscape(s.device),
      ].join(","),
    );
  }

  const filename = `newsletter_subscribers_${new Date().toISOString().replace(/[:.]/g, "_")}.csv`;
  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

