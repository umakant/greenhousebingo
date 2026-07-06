import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LARAVEL_USER_MORPH_TYPE } from "@/lib/laravel-user-model-type";
import { getHrmActor, getCompanyId, jsonR, serverError, unauthorized, forbidden, notFound, getHrmPerms, checkPerm } from "@/lib/hrm-auth";
import bcrypt from "bcryptjs";
import { combineDisplayName } from "@/lib/display-name";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-user")) return forbidden();
  const companyId = getCompanyId(actor);

  try {
    const user = await prisma.user.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
    if (!user) return notFound();

    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.first_name !== undefined || body.last_name !== undefined || body.name !== undefined) {
      const firstName = String(body.first_name ?? "").trim();
      const lastName = String(body.last_name ?? "").trim();
      const combined = (body.name ?? "").trim() || combineDisplayName(firstName, lastName);
      if (combined) updates.name = combined;
      else if (firstName) updates.name = firstName;
    }
    if (body.email) {
      const emailLow = String(body.email).trim().toLowerCase();
      const exists = await prisma.user.findFirst({ where: { email: emailLow, id: { not: user.id } } });
      if (exists) return NextResponse.json({ error: "Email already in use" }, { status: 422 });
      updates.email = emailLow;
    }
    if (body.password && String(body.password).trim().length >= 6) {
      updates.password = await bcrypt.hash(String(body.password).trim(), 10);
    }
    if (body.status !== undefined) updates.isActive = body.status === "active";

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await prisma.user.update({ where: { id: user.id }, data: updates });
    }

    // Update role assignment
    if (body.roleId !== undefined) {
      await prisma.modelHasRole.deleteMany({ where: { modelId: user.id } });
      if (body.roleId) {
        const role = await prisma.role.findFirst({ where: { id: BigInt(body.roleId) } });
        if (role) {
          await prisma.modelHasRole
            .create({
              data: {
                roleId: role.id,
                modelId: user.id,
                modelType: LARAVEL_USER_MORPH_TYPE,
              },
            })
            .catch(() => null);
        }
      }
    }

    return jsonR({ success: true });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-user")) return forbidden();
  const companyId = getCompanyId(actor);

  try {
    const user = await prisma.user.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
    if (!user) return notFound();

    await prisma.modelHasRole.deleteMany({ where: { modelId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });

    return jsonR({ success: true });
  } catch { return serverError(); }
}
