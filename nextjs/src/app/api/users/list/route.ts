import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}

export async function GET(req: NextRequest) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const url = new URL(req.url);
  const perPage = Math.min(200, parseInt(url.searchParams.get("per_page") ?? "50") || 50);
  const type = url.searchParams.get("type");
  const search = (url.searchParams.get("search") ?? "").trim();

  const where: Record<string, unknown> = { createdBy: companyId };
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
    take: perPage,
    select: { id: true, name: true, email: true, type: true },
  });

  const includeEmployees = (url.searchParams.get("include_employees") ?? "1") !== "0";
  if (!includeEmployees) {
    return NextResponse.json({
      data: users.map((u) => ({ id: Number(u.id), name: u.name ?? u.email, email: u.email, type: u.type, source: "user" })),
    });
  }

  const employees = await prisma.hrmEmployee.findMany({
    where: {
      createdBy: companyId,
      OR: search
        ? [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: perPage,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      userId: true,
    },
  });

  const seenUserIds = new Set(users.map((u) => String(u.id)));
  const data: Array<{
    id: number;
    name: string;
    email: string;
    type: string | null;
    source: "user" | "employee";
    employee_id?: number;
  }> = users.map((u) => ({
    id: Number(u.id),
    name: u.name ?? u.email ?? "User",
    email: u.email ?? "",
    type: u.type,
    source: "user",
  }));

  for (const e of employees) {
    const fullName = [e.firstName, e.lastName].filter(Boolean).join(" ").trim() || "Employee";
    const emailLabel = e.email ?? "";
    if (e.userId) {
      const uid = String(e.userId);
      if (seenUserIds.has(uid)) continue;
      data.push({
        id: Number(e.userId),
        name: fullName,
        email: emailLabel,
        type: "staff",
        source: "user",
      });
      seenUserIds.add(uid);
      continue;
    }
    data.push({
      id: Number(-e.id),
      name: fullName,
      email: emailLabel,
      type: "employee",
      source: "employee",
      employee_id: Number(e.id),
    });
  }

  return NextResponse.json({
    data,
  });
}
