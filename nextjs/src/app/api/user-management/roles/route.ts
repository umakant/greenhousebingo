import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/authz";
import {
  actorIsSuperadmin,
  buildRolesListWhere,
  ensureSystemPortalRolesIfMissing,
  isSystemPortalRoleName,
} from "@/lib/system-portal-roles";
import { isReservedPlatformRoleName, roleCanEditForActor } from "@/lib/role-management-access";
import { getHrmActor, getCompanyId, jsonR, serverError, unauthorized, forbidden, getHrmPerms, checkPerm } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

function ser(
  r: { id: bigint; name: string; label: string; guardName: string; editable: boolean; createdBy: bigint | null },
  permCount: number,
  users: { id: string; name: string }[],
  opts: { isSuperadmin: boolean; companyId: bigint },
) {
  const canEdit = roleCanEditForActor(r, opts.isSuperadmin, opts.companyId);
  return {
    id: r.id.toString(),
    name: r.name,
    label: r.label,
    guardName: r.guardName,
    editable: r.editable,
    canEdit,
    systemRole: isReservedPlatformRoleName(r.name),
    permissionsCount: permCount,
    users,
  };
}

export async function GET(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-user")) return forbidden();
  const companyId = getCompanyId(actor);
  const cookieRoles = safeJsonParse<string[]>(req.cookies.get("pf_roles")?.value, []);
  const isSuperadmin = actorIsSuperadmin(actor.type, cookieRoles);

  await ensureSystemPortalRolesIfMissing();

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1") || 1);
  const perPage = Math.min(100, parseInt(url.searchParams.get("per_page") ?? "10") || 10);
  const search = (url.searchParams.get("search") ?? "").trim();

  const where: Record<string, unknown> = buildRolesListWhere(companyId, { isSuperadmin });
  if (search) {
    where.AND = [
      {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { label: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

  const [total, roles] = await Promise.all([
    prisma.role.count({ where }),
    prisma.role.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: [{ name: "asc" }],
    }),
  ]);

  if (roles.length === 0) return jsonR({ data: [], total, page, per_page: perPage });

  const roleIds = roles.map((r) => r.id);

  const permCounts = await prisma.$queryRaw<{ role_id: bigint; cnt: bigint }[]>`
    SELECT role_id, COUNT(*) as cnt FROM role_has_permissions WHERE role_id = ANY(${roleIds}::bigint[]) GROUP BY role_id
  `;
  const permCountMap = new Map<string, number>();
  for (const row of permCounts) permCountMap.set(row.role_id.toString(), Number(row.cnt));

  const userRoleRows = await prisma.$queryRaw<{ model_id: bigint; role_id: bigint; name: string | null; email: string }[]>`
    SELECT mhr.model_id, mhr.role_id, u.name, u.email
    FROM model_has_roles mhr
    JOIN users u ON u.id = mhr.model_id
    WHERE mhr.role_id = ANY(${roleIds}::bigint[])
      AND (u.created_by = ${companyId} OR u.creator_id = ${companyId} OR u.id = ${companyId})
    ORDER BY u.name ASC
  `;
  const usersMap = new Map<string, { id: string; name: string }[]>();
  for (const row of userRoleRows) {
    const key = row.role_id.toString();
    if (!usersMap.has(key)) usersMap.set(key, []);
    usersMap.get(key)!.push({ id: row.model_id.toString(), name: row.name ?? row.email });
  }

  const data = roles.map((r) =>
    ser(r, permCountMap.get(r.id.toString()) ?? 0, usersMap.get(r.id.toString()) ?? [], {
      isSuperadmin,
      companyId,
    }),
  );

  return jsonR({ data, total, page, per_page: perPage });
}

export async function POST(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-user")) return forbidden();
  const companyId = getCompanyId(actor);

  try {
    const body = await req.json();
    const name = (body.name ?? "").trim().toLowerCase().replace(/\s+/g, "-");
    const label = (body.label ?? "").trim();
    const permissionIds: string[] = Array.isArray(body.permissionIds) ? body.permissionIds : [];

    if (!name || !label) return NextResponse.json({ error: "Name and label are required" }, { status: 422 });

    if (isSystemPortalRoleName(name) || name === "superadmin" || name === "company") {
      return NextResponse.json({ error: "This role name is reserved for system portal roles." }, { status: 422 });
    }

    const exists = await prisma.role.findFirst({ where: { name, guardName: "web" } });
    if (exists) return NextResponse.json({ error: "A role with this name already exists" }, { status: 422 });

    const maxId = await prisma.$queryRaw<{ max: bigint | null }[]>`SELECT MAX(id) as max FROM roles`;
    const nextId = (maxId[0]?.max ?? BigInt(0)) + BigInt(1);

    const role = await prisma.role.create({
      data: {
        id: nextId,
        name,
        label,
        guardName: "web",
        editable: true,
        createdBy: companyId,
      },
    });

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

    const cookieRoles = safeJsonParse<string[]>(req.cookies.get("pf_roles")?.value, []);
    const isSuperadmin = actorIsSuperadmin(actor.type, cookieRoles);
    return jsonR(
      { data: ser(role, permissionIds.length, [], { isSuperadmin, companyId }) },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
