import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { getCloudinaryCredentials, uploadImageToCloudinary } from "@/lib/cloudinary";
import { sendWelcomeEmail } from "@/lib/send-welcome-email";
import { syncCompanyUserAvatarFromSettings } from "@/lib/company-user-avatar";
import { getSettingsForOwner } from "@/lib/settings-service";
import { LARAVEL_USER_MORPH_TYPE } from "@/lib/laravel-user-model-type";

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

type CompanySettingKey = (typeof COMPANY_SETTING_KEYS)[number];

async function nextUserId(): Promise<bigint> {
  const agg = await prisma.user.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function nextSettingId(): Promise<bigint> {
  const agg = await prisma.setting.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function upsertCompanySetting(companyId: bigint, key: CompanySettingKey, value: string) {
  const existing = await prisma.setting.findFirst({
    where: { key, createdBy: companyId },
    select: { id: true },
  });

  if (existing?.id) {
    await prisma.setting.update({
      where: { id: existing.id },
      data: { value },
    });
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

export async function GET(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "manage-users")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const nameFilter = (url.searchParams.get("name") ?? "").trim();
  const emailFilter = (url.searchParams.get("email") ?? "").trim();
  const roleFilter = (url.searchParams.get("role") ?? "").trim(); // company|company_admin
  const isEnableLogin = (url.searchParams.get("is_enable_login") ?? "").trim(); // 1|0
  const sort = (url.searchParams.get("sort") ?? "").trim();
  const direction = (url.searchParams.get("direction") ?? "asc").trim().toLowerCase() === "desc" ? "desc" : "asc";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const perPage = Math.min(100, Math.max(5, Number(url.searchParams.get("per_page") ?? "10") || 10));
  const skip = (page - 1) * perPage;

  const where: any = {
    type: { in: ["company", "company_admin"] },
    ...(search || nameFilter || emailFilter
      ? {
          OR: [
            ...(search
              ? [
                  { name: { contains: search, mode: "insensitive" as const } },
                  { email: { contains: search, mode: "insensitive" as const } },
                  { slug: { contains: search, mode: "insensitive" as const } },
                ]
              : []),
            ...(nameFilter ? [{ name: { contains: nameFilter, mode: "insensitive" as const } }] : []),
            ...(emailFilter ? [{ email: { contains: emailFilter, mode: "insensitive" as const } }] : []),
          ],
        }
      : {}),
  };
  if (isEnableLogin === "1") where.isEnableLogin = true;
  if (isEnableLogin === "0") where.isEnableLogin = false;
  if (roleFilter === "company" || roleFilter === "company_admin") where.type = roleFilter;

  const orderBy: any = (() => {
    const dir = direction === "desc" ? "desc" : "asc";
    switch (sort) {
      case "name":
        return { name: dir };
      case "email":
        return { email: dir };
      case "type":
        return { type: dir };
      case "is_enable_login":
        return { isEnableLogin: dir };
      case "created_at":
        return { createdAt: dir };
      default:
        return { createdAt: "desc" };
    }
  })();

  type UserRow = {
    id: bigint;
    slug: string | null;
    name: string | null;
    email: string | null;
    mobileNo: string | null;
    lang: string | null;
    type: string | null;
    isEnableLogin: boolean | null;
    isActive: boolean | null;
    activePlan?: number | null;
    avatar: string | null;
    createdBy: bigint | null;
    createdAt: Date;
  };
  let total: number;
  let rows: UserRow[];
  let planNameByNumId = new Map<number, string>();

  try {
    const [totalCount, userRows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: perPage,
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
          avatar: true,
          createdBy: true,
          createdAt: true,
        },
      }),
    ]);
    total = totalCount;
    rows = userRows as UserRow[];

    const planIds = [...new Set(rows.map((r) => r.activePlan).filter((id): id is number => id != null && Number.isInteger(id)))];
    if (planIds.length > 0) {
      const plans = await prisma.plan.findMany({
        where: { id: { in: planIds.map((id) => BigInt(id)) } },
        select: { id: true, name: true, freePlan: true },
      });
      for (const p of plans) {
        const numId = Number(p.id);
        if (Number.isSafeInteger(numId)) planNameByNumId.set(numId, p.name ?? "—");
      }
    }
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    const msg = (err as Error)?.message ?? "";
    if (code === "P2022" || msg.includes("active_plan") || msg.includes("does not exist")) {
      const [totalCount, userRows] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          orderBy,
          skip,
          take: perPage,
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
            avatar: true,
            createdBy: true,
            createdAt: true,
          },
        }),
      ]);
      total = totalCount;
      rows = userRows as UserRow[];
      planNameByNumId = new Map();
    } else {
      throw err;
    }
  }

  const companyIds = rows.map((r) => r.id);
  const settingsRows =
    companyIds.length > 0
      ? await prisma.setting.findMany({
          where: { createdBy: { in: companyIds }, key: { in: [...COMPANY_SETTING_KEYS] } },
          select: { createdBy: true, key: true, value: true },
        })
      : [];

  const settingsByCompany = new Map<string, Record<string, string>>();
  for (const s of settingsRows) {
    const k = s.createdBy?.toString() ?? "";
    if (!k) continue;
    const current = settingsByCompany.get(k) ?? {};
    current[s.key] = s.value ?? "";
    settingsByCompany.set(k, current);
  }

  return NextResponse.json({
    ok: true,
    page,
    perPage,
    total,
    items: rows.map((c) => {
      const { createdBy, ...rest } = c;
      return {
        ...rest,
        id: c.id.toString(),
        // Self-registered companies (createdBy = null) awaiting superadmin approval are
        // "pending", not "disabled". Admin-created/managed companies have a creator.
        pendingApproval: c.isEnableLogin === false && createdBy == null,
        active_plan_name: c.activePlan != null ? planNameByNumId.get(c.activePlan) ?? "—" : null,
        company_settings: settingsByCompany.get(c.id.toString()) ?? {},
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "manage-users") && !hasPermission(perms, "create-users")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  const body =
    contentType.includes("multipart/form-data")
      ? Object.fromEntries((await req.formData()).entries())
      : ((await req.json().catch(() => null)) as any);

  const name = String((body as any)?.name ?? "").trim();
  const email = normalizeEmail(String((body as any)?.email ?? ""));
  const password = String((body as any)?.password ?? "");
  const passwordConfirm = String((body as any)?.passwordConfirm ?? (body as any)?.password_confirmation ?? "");

  if (!name) return NextResponse.json({ ok: false, message: "Name is required." }, { status: 400 });
  if (!email) return NextResponse.json({ ok: false, message: "Email is required." }, { status: 400 });
  if (!password || password.length < 6) {
    return NextResponse.json({ ok: false, message: "Password must be at least 6 characters." }, { status: 400 });
  }
  if (password !== passwordConfirm) {
    return NextResponse.json({ ok: false, message: "Passwords do not match." }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (existing?.id) return NextResponse.json({ ok: false, message: "Email already exists." }, { status: 409 });

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  const actor = actorEmail
    ? await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true } })
    : null;
  const actorId = actor?.id ?? null;

  const status = String((body as any)?.status ?? "active");
  const companyIdRaw = String((body as any)?.company_id ?? "").trim();
  const language = String((body as any)?.language ?? "").trim();
  const mobileNo = String((body as any)?.mobile_no ?? "").trim();

  const companyWebsite = String((body as any)?.company_website ?? "").trim();
  const companyPhone = String((body as any)?.company_phone ?? "").trim();
  const streetAddress = String((body as any)?.street_address ?? "").trim();
  const streetAddress2 = String((body as any)?.street_address_2 ?? "").trim();
  const city = String((body as any)?.city ?? "").trim();
  const state = String((body as any)?.state ?? "").trim();
  const zipCode = String((body as any)?.zip_code ?? "").trim();
  const defaultCurrency = String((body as any)?.default_currency ?? "").trim();
  const businessModuleId = String((body as any)?.business_module_id ?? "").trim();
  const companyGstVat = String((body as any)?.company_gst_vat ?? "").trim();
  const defaultLanguage = language || String((body as any)?.default_language ?? "").trim();

  const adminFirst = String((body as any)?.admin_first_name ?? "").trim();
  const adminLast = String((body as any)?.admin_last_name ?? "").trim();
  const adminEmail = normalizeEmail(String((body as any)?.admin_email ?? ""));
  const adminPassword = String((body as any)?.admin_password ?? "");

  const activePlanRaw = String((body as any)?.active_plan_id ?? "").trim();
  if (!activePlanRaw) {
    return NextResponse.json({ ok: false, message: "Subscription plan is required." }, { status: 400 });
  }
  let planIdBig: bigint;
  try {
    planIdBig = BigInt(activePlanRaw);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid subscription plan." }, { status: 400 });
  }
  const selectedPlan = await prisma.plan.findFirst({
    where: { id: planIdBig, status: true },
    select: { id: true, trialDays: true, trial: true, freePlan: true },
  });
  if (!selectedPlan) {
    return NextResponse.json({ ok: false, message: "Invalid or inactive subscription plan." }, { status: 400 });
  }
  const defaultPlanId = Number(selectedPlan.id);
  if (!Number.isSafeInteger(defaultPlanId)) {
    return NextResponse.json({ ok: false, message: "Plan id is out of supported range." }, { status: 400 });
  }

  const createdAt = new Date();
  const rawTrialDays = selectedPlan.trialDays ?? 0;
  const trialWindowDays =
    rawTrialDays > 0 ? rawTrialDays : selectedPlan.trial ? 30 : selectedPlan.freePlan ? 30 : 0;
  const planExpireDate = new Date(createdAt);
  if (trialWindowDays > 0) {
    planExpireDate.setDate(planExpireDate.getDate() + trialWindowDays);
  } else {
    planExpireDate.setMonth(planExpireDate.getMonth() + 1);
  }

  const companyUserId = await nextUserId();
  const passwordHash = await bcrypt.hash(password, 10);

  const companyUser = await prisma.user.create({
    data: {
      id: companyUserId,
      name,
      email,
      password: passwordHash,
      type: "company",
      slug: companyIdRaw || null,
      mobileNo: mobileNo || null,
      lang: language || "en",
      isEnableLogin: status !== "inactive",
      isActive: true,
      activePlan: defaultPlanId,
      planExpireDate,
      creatorId: actorId,
      createdBy: actorId,
      createdAt,
    },
    select: { id: true },
  });

  const companyRole = await prisma.role.findFirst({
    where: { name: "company" },
    select: { id: true },
  });
  if (companyRole?.id) {
    await prisma.modelHasRole.create({
      data: {
        roleId: companyRole.id,
        modelId: companyUser.id,
        modelType: LARAVEL_USER_MORPH_TYPE,
      },
    });
  }

  // Optional partner assignment when a superadmin selects a partner during company creation.
  const partnerIdRaw = String((body as any)?.partner_id ?? (body as any)?.partnerId ?? "").trim();
  if (partnerIdRaw) {
    try {
      const { resolveCompanyPartnerId, attributeCompanyToPartner } = await import("@/lib/partner-service");
      const resolvedPartnerId = await resolveCompanyPartnerId(partnerIdRaw);
      if (resolvedPartnerId) {
        const partner = await prisma.partner.findFirst({
          where: { id: resolvedPartnerId },
          select: { id: true, slug: true, referralCode: true },
        });
        if (partner) {
          await attributeCompanyToPartner({
            companyUserId: companyUser.id,
            slug: partner.slug,
            referralCode: partner.referralCode,
            sourceUrl: "company-create",
          });
        }
      }
    } catch (err) {
      console.warn("[Companies] Partner assignment skipped:", (err as Error)?.message ?? err);
    }
  }

  // IMPORTANT: these upserts assign IDs manually (legacy schema), so run sequentially
  // to avoid ID collisions (Promise.all would race nextSettingId()).
  if (companyWebsite) await upsertCompanySetting(companyUser.id, "companyWebsite", companyWebsite);
  if (companyPhone) await upsertCompanySetting(companyUser.id, "companyPhone", companyPhone);
  if (streetAddress) await upsertCompanySetting(companyUser.id, "companyAddress", streetAddress);
  if (streetAddress2) await upsertCompanySetting(companyUser.id, "companyAddress2", streetAddress2);
  if (city) await upsertCompanySetting(companyUser.id, "companyCity", city);
  if (state) await upsertCompanySetting(companyUser.id, "companyState", state);
  if (zipCode) await upsertCompanySetting(companyUser.id, "companyZipCode", zipCode);
  if (defaultCurrency) await upsertCompanySetting(companyUser.id, "defaultCurrency", defaultCurrency);
  if (businessModuleId) await upsertCompanySetting(companyUser.id, "businessModuleId", businessModuleId);
  if (companyGstVat) await upsertCompanySetting(companyUser.id, "companyGstVat", companyGstVat);
  if (defaultLanguage) await upsertCompanySetting(companyUser.id, "defaultLanguage", defaultLanguage);

  const logoFile = (body as any)?.logo;
  const logoLightUrl = String((body as any)?.logo_light ?? "").trim();
  if (logoFile && typeof logoFile === "object" && typeof (logoFile as File).arrayBuffer === "function") {
    let logoPath: string;
    const creds = await getCloudinaryCredentials();
    if (creds) {
      const bytes = await (logoFile as File).arrayBuffer();
      logoPath = await uploadImageToCloudinary(Buffer.from(bytes), (logoFile as File).name || "logo.png", { folder: "company-logos" });
    } else {
      logoPath = await saveLogoFile(logoFile as File);
    }
    await upsertCompanySetting(companyUser.id, "logo_light", logoPath);
  } else if (logoLightUrl) {
    await upsertCompanySetting(companyUser.id, "logo_light", logoLightUrl);
  }

  const companySettings = await getSettingsForOwner(companyUser.id);
  await syncCompanyUserAvatarFromSettings(companyUser.id, companySettings);

  // Optional: create a staff admin user for this company (Laravel does this as type=staff)
  const adminName = `${adminFirst} ${adminLast}`.trim();
  if (adminName && adminEmail && adminPassword && adminPassword.length >= 6) {
    const existsAdmin = await prisma.user.findFirst({ where: { email: adminEmail }, select: { id: true } });
    if (!existsAdmin?.id) {
      const staffRole = await prisma.role.findFirst({ where: { name: "staff" }, select: { id: true } });
      const adminUserId = await nextUserId();
      const adminHash = await bcrypt.hash(adminPassword, 10);
      const adminUser = await prisma.user.create({
        data: {
          id: adminUserId,
          name: adminName,
          email: adminEmail,
          password: adminHash,
          type: "staff",
          lang: language || "en",
          isEnableLogin: true,
          isActive: true,
          creatorId: companyUser.id,
          createdBy: companyUser.id,
          createdAt: new Date(),
        },
        select: { id: true },
      });
      if (staffRole?.id) {
        await prisma.modelHasRole.create({
          data: {
            roleId: staffRole.id,
            modelId: adminUser.id,
            modelType: LARAVEL_USER_MORPH_TYPE,
          },
        });
      }
    }
  }

  // Send welcome email with login details to the company (non-blocking)
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim() || req.nextUrl.origin;
  const welcomeResult = await sendWelcomeEmail({
    to: email,
    name,
    email,
    password,
    appUrl,
    companyName: name,
  });
  if (!welcomeResult.ok && welcomeResult.error) {
    console.warn("[Companies] Welcome email not sent:", welcomeResult.error);
  }

  return NextResponse.json(
    {
      ok: true,
      id: companyUser.id.toString(),
      welcomeEmailSent: welcomeResult.ok,
      ...(welcomeResult.error && { welcomeEmailError: welcomeResult.error }),
    },
    { status: 201 },
  );
}

