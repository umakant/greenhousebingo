import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeProjectVisibleSections } from "@/lib/project-visible-sections";
import { normalizeLeadSectionAccess } from "@/lib/project-lead-sections";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.id;
}

export function canViewProject(perms: string[]) {
  return (
    perms.includes("*") ||
    perms.includes("view-project") ||
    perms.includes("manage-project") ||
    perms.includes("manage-project-dashboard")
  );
}

export function canManageProject(perms: string[]) {
  return (
    perms.includes("*") ||
    perms.includes("manage-project") ||
    perms.includes("manage-project-dashboard") ||
    perms.includes("edit-project")
  );
}

export async function getProjectOpsContext(req: NextRequest, projectId: bigint) {
  if (!req.cookies.get("pf_role")?.value) return { error: "Unauthorized" as const, status: 401 };

  const perms = await getPermissionsFromRequest(req);
  if (!canViewProject(perms)) return { error: "Forbidden" as const, status: 403 };

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return { error: "Unauthorized" as const, status: 401 };

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true, name: true, email: true },
  });
  if (!actor?.id) return { error: "Unauthorized" as const, status: 401 };

  const companyId = getCompanyId(actor);
  const role = req.cookies.get("pf_role")?.value ?? "";
  const isSuperadminAllAccess = role === "superadmin" || perms.includes("*");

  const project = await prisma.project.findFirst({
    where: isSuperadminAllAccess ? { id: projectId } : { id: projectId, createdBy: companyId },
    select: { id: true, createdBy: true },
  });
  if (!project) return { error: "Not found" as const, status: 404 };

  return {
    actor,
    companyId,
    perms,
    canManage: canManageProject(perms),
    project,
  };
}

export async function logProjectActivity(
  projectId: bigint,
  userId: bigint,
  userType: string,
  logType: string,
  remark: string,
) {
  try {
    await prisma.projectActivityLog.create({
      data: {
        projectId,
        userId,
        userType,
        logType,
        remark,
      },
    });
  } catch {
    // non-blocking
  }
}

export function serializeProjectOps(project: {
  id: bigint;
  name: string;
  description: string | null;
  budget: { toNumber?: () => number } | null;
  startDate: Date | null;
  endDate: Date | null;
  status: string | null;
  seedKey?: string | null;
  usrNumber?: string | null;
  timezone?: string | null;
  propertyName?: string | null;
  address?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  numAttendees?: number | null;
  numAgents?: number | null;
  numMedics?: number | null;
  numSecurity?: number | null;
  securityDirectorName?: string | null;
  securityDirectorPhone?: string | null;
  securityDirectorEmail?: string | null;
  visibleSections?: unknown;
  leadSectionAccess?: unknown;
  sowPerDiem?: string | null;
  sowDressCode?: string | null;
}) {
  return {
    id: Number(project.id),
    name: project.name,
    description: project.description ?? null,
    budget: project.budget != null ? Number(project.budget) : null,
    start_date: project.startDate?.toISOString().slice(0, 10) ?? null,
    end_date: project.endDate?.toISOString().slice(0, 10) ?? null,
    status: project.status ?? null,
    seed_key: project.seedKey ?? null,
    usr_number: project.usrNumber ?? null,
    timezone: project.timezone ?? null,
    property_name: project.propertyName ?? null,
    address: project.address ?? null,
    address_2: project.address2 ?? null,
    city: project.city ?? null,
    state: project.state ?? null,
    zip_code: project.zipCode ?? null,
    num_attendees: project.numAttendees ?? null,
    num_agents: project.numAgents ?? null,
    num_medics: project.numMedics ?? null,
    num_security: project.numSecurity ?? null,
    security_director_name: project.securityDirectorName ?? null,
    security_director_phone: project.securityDirectorPhone ?? null,
    security_director_email: project.securityDirectorEmail ?? null,
    visible_sections: normalizeProjectVisibleSections(
      project.visibleSections as Record<string, boolean> | null | undefined,
    ),
    lead_section_access: normalizeLeadSectionAccess(
      project.leadSectionAccess as Record<string, boolean> | null | undefined,
    ),
    sow_per_diem: project.sowPerDiem ?? null,
    sow_dress_code: project.sowDressCode ?? null,
  };
}
