import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectOpsContext } from "@/lib/project-operations-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const logs = await prisma.projectActivityLog.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const userIds = logs.map((l) => l.userId);
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    data: logs.map((l) => {
      const u = userMap.get(l.userId);
      return {
        id: Number(l.id),
        author: u?.name ?? u?.email ?? "User",
        log_type: l.logType,
        remark: l.remark,
        created_at: l.createdAt.toISOString(),
      };
    }),
  });
}
