import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectOpsContext } from "@/lib/project-operations-api";
import { loadSowProjectContext, loadStaffByUser } from "@/lib/project-sow-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const projectCtx = await loadSowProjectContext(projectId);
  if (!projectCtx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const staffMap = await loadStaffByUser(projectId);
  const userIds = [...staffMap.keys()];
  const sowRows = userIds.length
    ? await prisma.projectStaffSow.findMany({ where: { projectId, userId: { in: userIds } } })
    : [];
  const sowMap = new Map(sowRows.map((s) => [s.userId, s]));

  const data = [...staffMap.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => {
      const sow = sowMap.get(BigInt(s.user_id));
      return {
        user_id: s.user_id,
        name: s.name,
        email: s.email,
        roles: [...s.roles],
        assignment_count: s.assignment_count,
        has_sow: !!sow,
        status: sow?.status ?? "none",
        signed_at: sow?.signedAt?.toISOString() ?? null,
        signed_file_path: sow?.signedFilePath ?? null,
      };
    });

  return NextResponse.json({ data, project: projectCtx });
}