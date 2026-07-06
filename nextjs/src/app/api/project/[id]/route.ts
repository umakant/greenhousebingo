import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import {
  canManageProject,
  canViewProject,
  getCompanyId,
  serializeProjectOps,
} from "@/lib/project-operations-api";
import { normalizeLeadSectionAccess } from "@/lib/project-lead-sections";
import { markGanttProjectDeleted, syncProjectToGantt } from "@/lib/gantt-project-sync";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const dynamic = "force-dynamic";

async function resolveProjectAccess(req: NextRequest, projectId: bigint) {
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return { error: "Unauthorized" as const, status: 401 };

  const perms = await getPermissionsFromRequest(req);
  if (!canViewProject(perms)) return { error: "Forbidden" as const, status: 403 };

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor?.id) return { error: "Unauthorized" as const, status: 401 };

  const role = req.cookies.get("pf_role")?.value ?? "";
  const isSuperadminAllAccess = role === "superadmin" || perms.includes("*");
  const companyId = getCompanyId(actor);

  const project = await prisma.project.findFirst({
    where: isSuperadminAllAccess ? { id: projectId } : { id: projectId, createdBy: companyId },
  });
  if (!project) return { error: "Not found" as const, status: 404 };

  return { perms, actor, project, canManage: canManageProject(perms) };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = BigInt(id);
    const access = await resolveProjectAccess(req, projectId);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const { project } = access;

    const lead = await prisma.projectLeadAssignment.findUnique({ where: { projectId } });
    let leadUser: { id: number; name: string; email: string } | null = null;
    if (lead) {
      const u = await prisma.user.findFirst({
        where: { id: lead.userId },
        select: { id: true, name: true, email: true },
      });
      if (u) {
        leadUser = {
          id: Number(u.id),
          name: u.name ?? u.email ?? "",
          email: u.email ?? "",
        };
      }
    }

    const sectionAccess = normalizeLeadSectionAccess(
      (project.leadSectionAccess as Record<string, boolean> | null | undefined) ??
        (lead?.sectionAccess as Record<string, boolean> | null | undefined),
    );

    return NextResponse.json({
      ...serializeProjectOps(project),
      created_at: project.createdAt?.toISOString() ?? null,
      updated_at: project.updatedAt?.toISOString() ?? null,
      lead: leadUser,
      lead_user_id: leadUser?.id ?? null,
      lead_section_access: sectionAccess,
    });
  } catch (e) {
    console.error("Project GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = BigInt(id);
    const access = await resolveProjectAccess(req, projectId);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    if (!access.canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const strField = (key: string) =>
      body?.[key] !== undefined
        ? typeof body[key] === "string"
          ? body[key].trim() || null
          : body[key] == null
            ? null
            : String(body[key])
        : undefined;

    await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(body?.name !== undefined && { name: String(body.name).trim() }),
        ...(body?.description !== undefined && { description: body.description ?? null }),
        ...(body?.budget !== undefined && { budget: body.budget != null ? Number(body.budget) : null }),
        ...(body?.start_date !== undefined && { startDate: body.start_date ? new Date(body.start_date) : null }),
        ...(body?.end_date !== undefined && { endDate: body.end_date ? new Date(body.end_date) : null }),
        ...(body?.status !== undefined && { status: body.status ?? null }),
        ...(strField("usr_number") !== undefined && { usrNumber: strField("usr_number") }),
        ...(strField("timezone") !== undefined && { timezone: strField("timezone") }),
        ...(strField("property_name") !== undefined && { propertyName: strField("property_name") }),
        ...(strField("address") !== undefined && { address: strField("address") }),
        ...(strField("address_2") !== undefined && { address2: strField("address_2") }),
        ...(strField("city") !== undefined && { city: strField("city") }),
        ...(strField("state") !== undefined && { state: strField("state") }),
        ...(strField("zip_code") !== undefined && { zipCode: strField("zip_code") }),
        ...(strField("security_director_name") !== undefined && {
          securityDirectorName: strField("security_director_name"),
        }),
        ...(strField("security_director_phone") !== undefined && {
          securityDirectorPhone: strField("security_director_phone"),
        }),
        ...(strField("security_director_email") !== undefined && {
          securityDirectorEmail: strField("security_director_email"),
        }),
        ...(strField("sow_per_diem") !== undefined && { sowPerDiem: strField("sow_per_diem") }),
        ...(strField("sow_dress_code") !== undefined && { sowDressCode: strField("sow_dress_code") }),
        ...(body?.lead_section_access != null &&
          typeof body.lead_section_access === "object" && {
            leadSectionAccess: normalizeLeadSectionAccess(
              body.lead_section_access as Record<string, boolean>,
            ),
          }),
        updatedAt: new Date(),
      },
    });

    const updated = await prisma.project.findFirst({
      where: { id: projectId },
      select: { id: true, name: true, startDate: true, endDate: true, status: true, createdBy: true },
    });
    if (updated) await syncProjectToGantt(updated);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Project PATCH error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = BigInt(id);
    const access = await resolveProjectAccess(req, projectId);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const perms = access.perms;
    if (!perms.includes("*") && !hasPermission(perms, "delete-project")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = getCompanyId(access.actor);

    await markGanttProjectDeleted(projectId, companyId);
    await prisma.project.delete({ where: { id: projectId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Project DELETE error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
