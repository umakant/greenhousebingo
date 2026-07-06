import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { hasPermission, safeJsonParse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { decodePermissions } from "@/lib/read-user-cookies";
import { ProjectDetail } from "@/components/project-detail";
import { t } from "@/lib/admin-t";


function getCompanyId(actor: { type: string | null; createdBy: bigint | null; id: bigint }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.id;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  if (
    !hasPermission(permissions, "view-project") &&
    !hasPermission(permissions, "manage-project") &&
    !permissions.includes("*")
  ) {
    redirect("/dashboard");
  }

  const email = (store.get("pf_email")?.value ?? "").trim().toLowerCase();
  if (!email) redirect("/login");

  const actor = await prisma.user.findFirst({
    where: { email },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor) redirect("/login");

  const companyId = getCompanyId(actor);
  const projectId = BigInt(id);
  const isSuperadminAllAccess = role === "superadmin" || permissions.includes("*");

  const project = await prisma.project.findFirst({
    where: isSuperadminAllAccess
      ? { id: projectId }
      : { id: projectId, createdBy: companyId },
    select: {
      id: true,
      name: true,
      description: true,
      budget: true,
      startDate: true,
      endDate: true,
      status: true,
      createdBy: true,
      propertyName: true,
      city: true,
      state: true,
      usrNumber: true,
      securityDirectorName: true,
      securityDirectorPhone: true,
      securityDirectorEmail: true,
      timezone: true,
    },
  });

  if (!project) notFound();

  const stagesCompanyId = project.createdBy ?? companyId;

  const [taskCount, bugCount, milestoneCount, missionCount] = await Promise.all([
    prisma.projectTask.count({ where: { projectId } }),
    prisma.projectBug.count({ where: { projectId } }),
    prisma.projectMilestone.count({ where: { projectId } }),
    prisma.projectMission.count({ where: { projectId } }),
  ]);

  const [taskStages, bugStages, projectMembers] = await Promise.all([
    prisma.taskStage.findMany({
      where: { createdBy: stagesCompanyId },
      orderBy: { order: "asc" },
      select: { id: true, name: true, color: true, complete: true },
    }),
    prisma.bugStage.findMany({
      where: { createdBy: stagesCompanyId },
      orderBy: { order: "asc" },
      select: { id: true, name: true, color: true, complete: true },
    }),
    prisma.projectUser.findMany({
      where: { projectId },
    }),
  ]);

  const memberUserIds = projectMembers.map((m) => m.userId);
  const memberUsers = memberUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: memberUserIds } },
        select: { id: true, name: true, email: true },
      })
    : [];

  const canManage =
    permissions.includes("*") ||
    hasPermission(permissions, "manage-project") ||
    hasPermission(permissions, "manage-project-dashboard") ||
    hasPermission(permissions, "edit-project");

  const name = store.get("pf_name")?.value ?? "User";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  const projectData = {
    id: Number(project.id),
    name: project.name,
    description: project.description ?? null,
    budget: project.budget != null ? Number(project.budget) : null,
    start_date: project.startDate?.toISOString().slice(0, 10) ?? null,
    end_date: project.endDate?.toISOString().slice(0, 10) ?? null,
    status: project.status ?? null,
    property_name: project.propertyName ?? null,
    city: project.city ?? null,
    state: project.state ?? null,
    usr_number: project.usrNumber ?? null,
    security_director_name: project.securityDirectorName ?? null,
    security_director_phone: project.securityDirectorPhone ?? null,
    security_director_email: project.securityDirectorEmail ?? null,
    timezone: project.timezone ?? null,
  };

  return (
    <AuthenticatedLayout
      user={{ name, email: store.get("pf_email")?.value ?? "", roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("Project Dashboard"), url: "/project/dashboard" },
        { label: t("Projects"), url: "/projects" },
        { label: project.name },
      ]}
    >
      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading project…</div>}>
        <ProjectDetail
          project={projectData}
          taskStages={taskStages.map((s) => ({
            id: Number(s.id), name: s.name, color: s.color, complete: s.complete,
          }))}
          bugStages={bugStages.map((s) => ({
            id: Number(s.id), name: s.name, color: s.color, complete: s.complete,
          }))}
          members={memberUsers.map((u) => ({
            id: Number(u.id), name: u.name ?? u.email ?? "", email: u.email ?? "",
          }))}
          canManage={canManage}
          permissions={permissions}
          counts={{ tasks: taskCount, bugs: bugCount, milestones: milestoneCount, missions: missionCount }}
        />
      </Suspense>
    </AuthenticatedLayout>
  );
}
