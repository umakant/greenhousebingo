import { NextResponse, type NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { getCloudinaryCredentials, uploadImageToCloudinary } from "@/lib/cloudinary";
import { syncCompanyUserAvatarFromSettings } from "@/lib/company-user-avatar";
import { getSettingsForOwner } from "@/lib/settings-service";

const COMPANY_SETTING_KEYS = [
  "companyWebsite",
  "companyPhone",
  "companyAddress",
  "companyAddress2",
  "companyCity",
  "companyState",
  "companyZipCode",
  "defaultCurrency",
  "businessModuleId",
  "logo_light",
  "logo_dark",
  "logo_icon",
  "favicon",
  "titleText",
  "footerText",
  "companyGstVat",
  "defaultLanguage",
] as const;

async function nextSettingId(): Promise<bigint> {
  const agg = await prisma.setting.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function upsertSetting(companyId: bigint, key: string, value: string) {
  const existing = await prisma.setting.findFirst({
    where: { key, createdBy: companyId },
    select: { id: true },
  });
  if (existing?.id) {
    await prisma.setting.update({ where: { id: existing.id }, data: { value } });
    return;
  }
  await prisma.setting.create({
    data: {
      id: await nextSettingId(),
      key,
      value,
      isPublic: true,
      createdBy: companyId,
      createdAt: new Date(),
    },
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function prismaErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: string }).code);
    if (code === "P2002") {
      return "Email or another unique value is already in use.";
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return "Failed to save company.";
}

async function saveLogoFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buf = Buffer.from(bytes);
  const ext = path.extname(file.name || "").toLowerCase() || ".png";
  const safeExt = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext) ? ext : ".png";
  const base = `logo-${Date.now()}-${Math.random().toString(16).slice(2)}` + safeExt;
  const dir = path.join(process.cwd(), "public", "uploads", "logos");
  await mkdir(dir, { recursive: true });
  const full = path.join(dir, base);
  await writeFile(full, buf);
  return `/uploads/logos/${base}`;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "manage-users")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const companyId = BigInt(id);

  const company = await prisma.user.findFirst({
    where: { id: companyId, type: { in: ["company", "company_admin"] } },
    select: {
      id: true,
      slug: true,
      name: true,
      email: true,
      mobileNo: true,
      lang: true,
      type: true,
      isEnableLogin: true,
      isActive: true,
      activePlan: true,
      createdAt: true,
    },
  });

  if (!company) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }

  const settingsRows = await prisma.setting.findMany({
    where: { createdBy: company.id, key: { in: [...COMPANY_SETTING_KEYS] } },
    select: { key: true, value: true },
  });
  const settings: Record<string, string> = {};
  for (const s of settingsRows) settings[s.key] = s.value ?? "";

  const employeeCount = await prisma.user.count({
    where: { createdBy: company.id, type: { notIn: ["company", "company_admin", "superadmin"] } },
  });

  const moduleIdRaw = settings.businessModuleId;
  const businessModule =
    moduleIdRaw && /^\d+$/.test(moduleIdRaw)
      ? await prisma.businessModule.findFirst({ where: { id: BigInt(moduleIdRaw) }, select: { id: true, name: true } })
      : null;

  const { activePlan, ...companyRest } = company;
  return NextResponse.json({
    ok: true,
    company: {
      ...companyRest,
      id: company.id.toString(),
      active_plan_id: activePlan != null ? String(activePlan) : "",
    },
    company_settings: settings,
    businessModule: businessModule ? { id: businessModule.id.toString(), name: businessModule.name } : null,
    stats: { total_employees: employeeCount },
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "edit-users")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const companyId = BigInt(id);
    const contentType = req.headers.get("content-type") ?? "";
    const body =
      contentType.includes("multipart/form-data")
        ? Object.fromEntries((await req.formData()).entries())
        : ((await req.json().catch(() => null)) as Record<string, unknown>);

    const status = String(body?.status ?? "").trim(); // active|inactive
    const name = String(body?.name ?? "").trim();
    const email = normalizeEmail(String(body?.email ?? ""));
    const mobileNo = String(body?.mobile_no ?? "").trim();
    const companyIdRaw = String(body?.company_id ?? "").trim();
    const language = String(body?.language ?? "").trim();
    const clearSubscription = Boolean((body as Record<string, unknown>)?.clear_subscription);
    const activePlanRaw = String(body?.active_plan_id ?? "").trim();
    const pricingPeriodRaw = String(body?.pricing_period ?? "monthly").trim().toLowerCase();
    const pricingPeriod = pricingPeriodRaw === "yearly" ? "yearly" : "monthly";

    const existingCompany = await prisma.user.findFirst({
      where: { id: companyId, type: { in: ["company", "company_admin"] } },
      select: { id: true },
    });
    if (!existingCompany) {
      return NextResponse.json({ ok: false, message: "Company not found." }, { status: 404 });
    }

    if (clearSubscription) {
      await prisma.user.update({
        where: { id: companyId },
        data: { activePlan: null, planExpireDate: null },
      });
      return NextResponse.json({ ok: true });
    }

    if (email) {
      const emailTaken = await prisma.user.findFirst({
        where: { email, id: { not: companyId } },
        select: { id: true },
      });
      if (emailTaken) {
        return NextResponse.json({ ok: false, message: "Email already exists." }, { status: 409 });
      }
    }

    const data: Record<string, unknown> = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (mobileNo) data.mobileNo = mobileNo;
    if (companyIdRaw) data.slug = companyIdRaw;
    if (language) data.lang = language;
    if (status) data.isEnableLogin = status !== "inactive";

    if (activePlanRaw) {
      try {
        const planIdBig = BigInt(activePlanRaw);
        const selectedPlan = await prisma.plan.findFirst({
          where: { id: planIdBig, status: true },
          select: { id: true },
        });
        if (!selectedPlan) {
          return NextResponse.json({ ok: false, message: "Invalid or inactive subscription plan." }, { status: 400 });
        }
        const n = Number(selectedPlan.id);
        if (!Number.isSafeInteger(n)) {
          return NextResponse.json({ ok: false, message: "Plan id is out of supported range." }, { status: 400 });
        }
        data.activePlan = n;
        const expire = new Date();
        if (pricingPeriod === "yearly") expire.setFullYear(expire.getFullYear() + 1);
        else expire.setMonth(expire.getMonth() + 1);
        data.planExpireDate = expire;
      } catch {
        return NextResponse.json({ ok: false, message: "Invalid subscription plan." }, { status: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: companyId },
      data,
      select: { id: true },
    });

    let settings: unknown = body?.settings ?? null;
    if (typeof settings === "string") {
      try {
        settings = JSON.parse(settings) as unknown;
      } catch {
        settings = null;
      }
    }
    if (settings && typeof settings === "object") {
      const entries = Object.entries(settings).filter(
        ([, v]) => typeof v === "string" && String(v).length > 0,
      ) as Array<[string, string]>;
      // Sequential upserts — parallel nextSettingId() calls cause duplicate PK errors.
      for (const [k, v] of entries) {
        await upsertSetting(updated.id, k, v);
      }
    }

    const logoFile = (body as Record<string, unknown>)?.logo;
    if (logoFile && typeof logoFile === "object" && typeof (logoFile as File).arrayBuffer === "function") {
      const file = logoFile as File;
      if (file.size > 0) {
        let logoPath: string;
        const creds = await getCloudinaryCredentials();
        if (creds) {
          const bytes = await file.arrayBuffer();
          logoPath = await uploadImageToCloudinary(
            Buffer.from(bytes),
            file.name || "logo.png",
            { folder: "company-logos" },
          );
        } else {
          logoPath = await saveLogoFile(file);
        }
        await upsertSetting(updated.id, "logo_light", logoPath);
      }
    }

    const ownerSettings = await getSettingsForOwner(updated.id);
    await syncCompanyUserAvatarFromSettings(updated.id, ownerSettings);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[companies PATCH]", err);
    return NextResponse.json({ ok: false, message: prismaErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "delete-users")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const companyId = BigInt(id);

  await prisma.modelHasRole.deleteMany({ where: { modelId: companyId } });
  await prisma.setting.deleteMany({ where: { createdBy: companyId } });
  await prisma.user.delete({ where: { id: companyId } });

  return NextResponse.json({ ok: true });
}

