import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectOpsContext } from "@/lib/project-operations-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const role = req.nextUrl.searchParams.get("role");
  const where: {
    createdBy: bigint;
    isActive?: boolean;
    OR?: Array<{ operationsRole?: string; type?: string }>;
  } = {
    createdBy: auth.companyId,
    isActive: true,
  };

  if (role === "agent" || role === "medic" || role === "security") {
    where.OR = [
      { operationsRole: role },
      { type: "staff" },
    ];
  } else {
    where.OR = [{ type: "staff" }];
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, operationsRole: true },
    orderBy: { name: "asc" },
    take: 200,
  });

  const filtered =
    role === "agent" || role === "medic" || role === "security"
      ? users.filter((u) => !u.operationsRole || u.operationsRole === role)
      : users;

  return NextResponse.json({
    data: filtered.map((u) => ({
      id: Number(u.id),
      name: u.name ?? u.email ?? "",
      email: u.email ?? "",
      operations_role: u.operationsRole,
    })),
  });
}
