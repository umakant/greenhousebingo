import { NextResponse, type NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { writeSaasAuditLog } from "@/lib/saas-audit-log";
import { t } from "@/lib/admin-t";


function asNumber(x: unknown, fallback = 0) {
  const n = typeof x === "number" ? x : Number(String(x ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

async function saveAddOnImage(module: string, file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buf = Buffer.from(bytes);
  const ext = path.extname(file.name || "").toLowerCase() || ".png";
  const safeExt = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext) ? ext : ".png";
  const base = `${module}${safeExt}`;
  const dir = path.join(process.cwd(), "public", "uploads", "add-ons");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, base), buf);
  return `/uploads/add-ons/${base}`;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ module: string }> }) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  const canEditPlans = hasPermission(perms, "edit-plans") || hasPermission(perms, "manage-plans");
  const canManageAddOns = hasPermission(perms, "manage-add-on");
  if (!canEditPlans && !canManageAddOns && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });
  }

  const { module } = await ctx.params;
  const mod = String(module ?? "").trim();
  if (!mod) return NextResponse.json({ ok: false, message: t("Module is required.") }, { status: 400 });

  const contentType = req.headers.get("content-type") ?? "";

  // Toggle enable/disable (Add-ons Manager).
  if (contentType.includes("application/json")) {
    const body: unknown = await req.json().catch(() => null);
    const obj = (body && typeof body === "object" ? (body as Record<string, unknown>) : null) as Record<string, unknown> | null;
    const isEnable = typeof obj?.is_enable === "boolean" ? obj.is_enable : null;
    if (isEnable === null) {
      return NextResponse.json({ ok: false, message: t("is_enable is required.") }, { status: 400 });
    }

    const existing = await prisma.addOn.findFirst({ where: { module: mod }, select: { id: true, isEnable: true } });
    if (!existing) return NextResponse.json({ ok: false, message: t("Module not found.") }, { status: 404 });

    const prev = existing.isEnable;
    await prisma.addOn.update({ where: { id: existing.id }, data: { isEnable, updatedAt: new Date() } });

    if (prev !== isEnable) {
      await writeSaasAuditLog({
        eventType: "addon_toggle",
        module: mod,
        actorEmail: req.cookies.get("pf_email")?.value ?? null,
        actorRole: role ?? null,
        path: req.nextUrl.pathname,
        metadata: { previous_enable: prev, next_enable: isEnable },
      });
    }

    return NextResponse.json({ ok: true });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, message: t("Invalid form data.") }, { status: 400 });

  const monthly = new Prisma.Decimal(asNumber(form.get("monthly_price"), 0));
  const yearly = new Prisma.Decimal(asNumber(form.get("yearly_price"), 0));
  const nameRaw = form.get("name");
  const maybeName = typeof nameRaw === "string" ? nameRaw.trim() : null;
  const imgRaw = form.get("image");
  const imageFile = imgRaw instanceof File ? imgRaw : null;

  const existing = await prisma.addOn.findFirst({ where: { module: mod }, select: { id: true } });
  if (!existing) return NextResponse.json({ ok: false, message: t("Module not found.") }, { status: 404 });

  const update: any = {
    monthlyPrice: monthly,
    yearlyPrice: yearly,
    updatedAt: new Date(),
  };
  if (maybeName) update.name = maybeName;
  if (imageFile && imageFile.size > 0) update.image = await saveAddOnImage(mod, imageFile);

  await prisma.addOn.update({ where: { id: existing.id }, data: update });
  return NextResponse.json({ ok: true });
}

