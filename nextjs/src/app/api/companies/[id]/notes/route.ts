/**
 * Company notes — task and bug comments on projects owned by the tenant.
 * Auth: superadmin + manage-users.
 */
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  companyRouteForbidden,
  parseCompanyIdFromParam,
  requireSuperadminManageUsers,
  verifyCompanyTenant,
} from "@/lib/company-route-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireSuperadminManageUsers(req))) return companyRouteForbidden();

  const { id } = await params;
  const companyId = parseCompanyIdFromParam(id);
  if (companyId == null) {
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });
  }

  const company = await verifyCompanyTenant(companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const tenantId = companyId;

  const projects = await prisma.project.findMany({
    where: { createdBy: tenantId },
    select: { id: true, name: true },
  });
  const projectIds = projects.map((p) => p.id);
  const projName = new Map(projects.map((p) => [p.id.toString(), p.name]));

  if (projectIds.length === 0) {
    return NextResponse.json({ notes: [] });
  }

  const [taskComments, bugComments] = await Promise.all([
    prisma.taskComment.findMany({
      where: { task: { projectId: { in: projectIds } } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        task: { select: { title: true, projectId: true } },
      },
    }),
    prisma.bugComment.findMany({
      where: { bug: { projectId: { in: projectIds } } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        bug: { select: { title: true, projectId: true } },
      },
    }),
  ]);

  type Note = {
    id: string;
    source: "task" | "bug";
    project_name: string;
    context_title: string;
    body: string;
    created_at: string;
  };

  const fromTasks: Note[] = taskComments.map((c) => ({
    id: `t-${c.id.toString()}`,
    source: "task",
    project_name: projName.get(c.task.projectId.toString()) ?? "—",
    context_title: c.task.title,
    body: c.comment,
    created_at: c.createdAt.toISOString(),
  }));

  const fromBugs: Note[] = bugComments.map((c) => ({
    id: `b-${c.id.toString()}`,
    source: "bug",
    project_name: projName.get(c.bug.projectId.toString()) ?? "—",
    context_title: c.bug.title,
    body: c.comment,
    created_at: c.createdAt.toISOString(),
  }));

  const notes = [...fromTasks, ...fromBugs]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 300);

  return NextResponse.json({ notes });
}
