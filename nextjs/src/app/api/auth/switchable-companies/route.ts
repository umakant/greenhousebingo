import { type NextRequest, NextResponse } from "next/server";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = req.cookies.get("pf_sensitive_switch")?.value;
  if (gate !== "1") {
    return NextResponse.json({ error: "Complete verification first." }, { status: 403 });
  }

  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") {
    return NextResponse.json({ companies: [] });
  }

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!perms.includes("*") && !hasPermission(perms, "impersonate-users")) {
    return NextResponse.json({ companies: [] });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const where: {
    type: { in: string[] };
    OR?: ({ name: { contains: string; mode: "insensitive" } } | { email: { contains: string; mode: "insensitive" } })[];
  } = {
    type: { in: ["company", "company_admin"] },
  };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, type: true },
    orderBy: [{ name: "asc" }],
    take: 100,
  });

  return NextResponse.json({
    companies: rows.map((r) => ({
      id: r.id.toString(),
      name: (r.name || r.email || "Company").trim() || "Company",
      email: r.email ?? "",
      type: r.type,
    })),
  });
}
