import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-modules")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const moduleId = BigInt(id);
  const body = (await req.json().catch(() => null)) as any;

  const features = Array.isArray(body?.features) ? (body.features as any[]) : null;

  await prisma.$transaction(async (tx) => {
    const data: any = {};
    if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body?.description === "string") data.description = body.description.trim() || null;
    if (body?.is_active != null) data.isActive = Boolean(body.is_active);
    if (body?.sort_order != null && Number.isFinite(Number(body.sort_order))) data.sortOrder = Number(body.sort_order);
    data.updatedAt = new Date();

    await tx.businessModule.update({ where: { id: moduleId }, data });

    if (features) {
      const existing = await tx.businessModuleFeature.findMany({
        where: { businessModuleId: moduleId },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((x) => x.id.toString()));
      const keptIds = new Set<string>();

      const fAgg = await tx.businessModuleFeature.aggregate({ _max: { id: true } });
      let nextId = (fAgg._max.id ?? 0n) + 1n;

      for (let i = 0; i < features.length; i++) {
        const f = features[i] ?? {};
        const title = String(f?.title ?? "").trim();
        if (!title) continue;
        const fDesc = String(f?.description ?? "").trim();
        const fidRaw = f?.id != null ? String(f.id).trim() : "";
        const sortOrder = i;

        if (fidRaw && existingIds.has(fidRaw)) {
          const fid = BigInt(fidRaw);
          await tx.businessModuleFeature.update({
            where: { id: fid },
            data: { title, description: fDesc || null, sortOrder, updatedAt: new Date() },
          });
          keptIds.add(fidRaw);
        } else {
          await tx.businessModuleFeature.create({
            data: {
              id: nextId,
              businessModuleId: moduleId,
              title,
              description: fDesc || null,
              sortOrder,
              createdAt: new Date(),
            },
          });
          keptIds.add(nextId.toString());
          nextId += 1n;
        }
      }

      const toDelete = [...existingIds].filter((x) => !keptIds.has(x));
      if (toDelete.length > 0) {
        await tx.businessModuleFeature.deleteMany({
          where: { id: { in: toDelete.map((x) => BigInt(x)) } },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-modules")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const moduleId = BigInt(id);
  await prisma.$transaction(async (tx) => {
    await tx.businessModuleFeature.deleteMany({ where: { businessModuleId: moduleId } });
    await tx.businessModule.delete({ where: { id: moduleId } });
  });
  return NextResponse.json({ ok: true });
}

