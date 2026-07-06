import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/authz";
import { actorIsSuperadmin, canActorAccessRole } from "@/lib/system-portal-roles";
import {
  isReservedPlatformRoleName,
  roleCanDeleteForActor,
  roleCanEditForActor,
} from "@/lib/role-management-access";
import { getHrmActor, getCompanyId, jsonR, serverError, unauthorized, forbidden, notFound, getHrmPerms, checkPerm } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

async function loadAccessibleRole(
  id: string,
  companyId: bigint,
  isSuperadmin: boolean,
) {
  const role = await prisma.role.findFirst({ where: { id: BigInt(id) } });
  if (!role || !canActorAccessRole(role, companyId, isSuperadmin)) return null;
  return role;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-user")) return forbidden();
  const companyId = getCompanyId(actor);
  const cookieRoles = safeJsonParse<string[]>(req.cookies.get("pf_roles")?.value, []);
  const isSuperadmin = actorIsSuperadmin(actor.type, cookieRoles);

  try {
    const role = await loadAccessibleRole(id, companyId, isSuperadmin);
    if (!role) return notFound();

    const [rhpRows, userRows] = await Promise.all([
      prisma.roleHasPermission.findMany({ where: { roleId: role.id }, select: { permissionId: true } }),
      prisma.$queryRaw<{ model_id: bigint; name: string | null; email: string }[]>`
        SELECT mhr.model_id, u.name, u.email
        FROM model_has_roles mhr
        JOIN users u ON u.id = mhr.model_id
        WHERE mhr.role_id = ${role.id}
          AND (u.created_by = ${companyId} OR u.creator_id = ${companyId} OR u.id = ${companyId})
      `,
    ]);

    const canEdit = roleCanEditForActor(role, isSuperadmin, companyId);

    return jsonR({
      data: {
        id: role.id.toString(),
        name: role.name,
        label: role.label,
        guardName: role.guardName,
        editable: role.editable,
        canEdit,
        systemRole: isReservedPlatformRoleName(role.name),
        permissionIds: rhpRows.map((r) => r.permissionId.toString()),
        users: userRows.map((u) => ({ id: u.model_id.toString(), name: u.name ?? u.email })),
      },
    });
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-user")) return forbidden();
  const companyId = getCompanyId(actor);
  const cookieRoles = safeJsonParse<string[]>(req.cookies.get("pf_roles")?.value, []);
  const isSuperadmin = actorIsSuperadmin(actor.type, cookieRoles);

  try {
    const role = await loadAccessibleRole(id, companyId, isSuperadmin);
    if (!role) return notFound();
    if (!roleCanEditForActor(role, isSuperadmin, companyId)) {
      return NextResponse.json({ error: "This role cannot be edited" }, { status: 403 });
    }

    const body = await req.json();
    const label = (body.label ?? "").trim();
    const permissionIds: string[] = Array.isArray(body.permissionIds) ? body.permissionIds : [];

    if (label) {
      await prisma.role.update({ where: { id: role.id }, data: { label, updatedAt: new Date() } });
    }

    await prisma.roleHasPermission.deleteMany({ where: { roleId: role.id } });
    if (permissionIds.length > 0) {
      const permsExist = await prisma.permission.findMany({
        where: { id: { in: permissionIds.map((p) => BigInt(p)) } },
        select: { id: true },
      });
      await prisma.roleHasPermission.createMany({
        data: permsExist.map((p) => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }

    return jsonR({ success: true });
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-user")) return forbidden();
  const companyId = getCompanyId(actor);
  const cookieRoles = safeJsonParse<string[]>(req.cookies.get("pf_roles")?.value, []);
  const isSuperadmin = actorIsSuperadmin(actor.type, cookieRoles);

  try {
    const role = await loadAccessibleRole(id, companyId, isSuperadmin);
    if (!role) return notFound();
    if (!roleCanDeleteForActor(role, isSuperadmin, companyId)) {
      return NextResponse.json({ error: "This role cannot be deleted" }, { status: 403 });
    }

    await prisma.roleHasPermission.deleteMany({ where: { roleId: role.id } });
    await prisma.modelHasRole.deleteMany({ where: { roleId: role.id } });
    await prisma.role.delete({ where: { id: role.id } });

    return jsonR({ success: true });
  } catch {
    return serverError();
  }
}
