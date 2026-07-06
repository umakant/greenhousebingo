import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { LARAVEL_USER_MORPH_TYPE } from "@/lib/laravel-user-model-type";
import {
  notifyRegistrantRegistrationPending,
  notifySuperadminsCompanyRegistrationPending,
} from "@/lib/send-company-approval-emails";
import { formatPhone } from "@/lib/phone";
import { attributeCompanyToPartner } from "@/lib/partner-service";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function nextUserId(): Promise<bigint> {
  const agg = await prisma.user.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

/**
 * Plan for self-serve company signup: env override, else first active free plan, else first active non-custom plan.
 */
async function resolvePublicRegistrationPlanId(): Promise<bigint | null> {
  const raw = process.env.PUBLIC_COMPANY_REGISTRATION_PLAN_ID?.trim();
  if (raw && /^\d+$/.test(raw)) {
    const id = BigInt(raw);
    const p = await prisma.plan.findFirst({ where: { id, status: true }, select: { id: true } });
    if (p) return p.id;
  }
  const free = await prisma.plan.findFirst({
    where: { status: true, freePlan: true, customPlan: false },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (free) return free.id;
  const standard = await prisma.plan.findFirst({
    where: { status: true, customPlan: false },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (standard) return standard.id;
  const fallback = await prisma.plan.findFirst({
    where: { status: true },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

type Body = {
  company_name?: unknown;
  name?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  contact_name?: unknown;
  phone?: unknown;
  mobile_no?: unknown;
  email?: unknown;
  password?: unknown;
  password_confirmation?: unknown;
  passwordConfirm?: unknown;
  /** Wizard step: selected industry module ids (`business_modules.id` as strings); used only for admin notification. */
  interested_modules?: unknown;
  /** Partner referral attribution (from /p/[slug] or ?partner=slug or pf_partner_ref cookie). */
  partner_slug?: unknown;
  referral_code?: unknown;
};

function parseInterestedIndustryModuleIds(raw: unknown): bigint[] {
  if (!Array.isArray(raw)) return [];
  const out: bigint[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    const s =
      typeof x === "string"
        ? x.trim()
        : typeof x === "number" && Number.isFinite(x) && Number.isInteger(x)
          ? String(x)
          : "";
    if (!/^\d{1,32}$/.test(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    try {
      out.push(BigInt(s));
    } catch {
      continue;
    }
    if (out.length >= 40) break;
  }
  return out;
}

/**
 * Public endpoint: creates a tenant company user (`type: company`) with login disabled until a superadmin approves
 * (enables login in Companies). Notifies superadmins and the registrant by email. Disabled when `COMPANY_SELF_REGISTRATION_ENABLED=false`.
 */
export async function POST(req: NextRequest) {
  if (process.env.COMPANY_SELF_REGISTRATION_ENABLED === "false") {
    return NextResponse.json({ ok: false, message: "Registration is disabled." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const companyName = String(body?.company_name ?? body?.name ?? "").trim();
  const firstName = String(body?.first_name ?? "").trim();
  const lastName = String(body?.last_name ?? "").trim();
  const contactFromParts = `${firstName} ${lastName}`.trim();
  const contactName = contactFromParts || String(body?.contact_name ?? "").trim();
  const phoneRaw = String(body?.phone ?? body?.mobile_no ?? "").replace(/\D/g, "");
  const phoneFormatted = formatPhone(phoneRaw);
  const email = normalizeEmail(String(body?.email ?? ""));
  const password = String(body?.password ?? "");
  const passwordConfirm = String(body?.password_confirmation ?? body?.passwordConfirm ?? "");

  if (!companyName) {
    return NextResponse.json({ ok: false, message: "Company name is required." }, { status: 400 });
  }
  if (!firstName) {
    return NextResponse.json({ ok: false, message: "First name is required." }, { status: 400 });
  }
  if (!lastName) {
    return NextResponse.json({ ok: false, message: "Last name is required." }, { status: 400 });
  }
  if (phoneRaw.length !== 10) {
    return NextResponse.json({ ok: false, message: "A valid 10-digit phone number is required." }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, message: "Valid email is required." }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ ok: false, message: "Password must be at least 6 characters." }, { status: 400 });
  }
  if (password !== passwordConfirm) {
    return NextResponse.json({ ok: false, message: "Passwords do not match." }, { status: 400 });
  }

  const interestedIndustryIds = parseInterestedIndustryModuleIds(body?.interested_modules);
  let interestedModulesSummary = "";
  if (interestedIndustryIds.length > 0) {
    const industryRows = await prisma.businessModule.findMany({
      where: {
        id: { in: interestedIndustryIds },
        isActive: true,
      },
      select: { id: true, name: true },
    });
    const nameById = new Map(industryRows.map((r) => [r.id.toString(), r.name]));
    interestedModulesSummary = interestedIndustryIds
      .map((id) => nameById.get(id.toString()))
      .filter((n): n is string => Boolean(n && n.trim()))
      .join(", ");
  }

  const existing = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (existing?.id) {
    return NextResponse.json({ ok: false, message: "An account with this email already exists." }, { status: 409 });
  }

  const planId = await resolvePublicRegistrationPlanId();
  if (!planId) {
    return NextResponse.json(
      { ok: false, message: "Registration is not available: no subscription plan is configured." },
      { status: 503 },
    );
  }
  const activePlanNum = Number(planId);
  if (!Number.isSafeInteger(activePlanNum)) {
    return NextResponse.json({ ok: false, message: "Plan configuration error." }, { status: 503 });
  }

  const companyUserId = await nextUserId();
  const passwordHash = await bcrypt.hash(password, 10);

  const companyUser = await prisma.user.create({
    data: {
      id: companyUserId,
      name: companyName,
      email,
      password: passwordHash,
      type: "company",
      slug: null,
      mobileNo: phoneFormatted,
      lang: "en",
      isEnableLogin: false,
      isActive: true,
      activePlan: activePlanNum,
      creatorId: null,
      createdBy: null,
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
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

  // Partner referral attribution (from query/cookie passed by the register wizard).
  const partnerSlug = String(body?.partner_slug ?? "").trim();
  const referralCode = String(body?.referral_code ?? "").trim();
  const cookiePartnerRef = req.cookies.get("pf_partner_ref")?.value?.trim() ?? "";
  if (partnerSlug || referralCode || cookiePartnerRef) {
    await attributeCompanyToPartner({
      companyUserId: companyUser.id,
      slug: partnerSlug || cookiePartnerRef || null,
      referralCode: referralCode || null,
      sourceUrl: req.headers.get("referer"),
    });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim() || req.nextUrl.origin;

  const adminNotify = await notifySuperadminsCompanyRegistrationPending({
    companyName,
    contactName,
    registrantEmail: email,
    phone: phoneFormatted,
    companyUserId: companyUser.id.toString(),
    appUrl,
    interestedModulesSummary: interestedModulesSummary || undefined,
  });
  if (!adminNotify.ok && adminNotify.error) {
    console.warn("[register-company] Superadmin approval email not sent:", adminNotify.error);
  }

  const registrantNotify = await notifyRegistrantRegistrationPending({
    to: email,
    contactName,
    companyName,
  });
  if (!registrantNotify.ok && registrantNotify.error) {
    console.warn("[register-company] Registrant pending email not sent:", registrantNotify.error);
  }

  return NextResponse.json(
    {
      ok: true,
      redirect: "/register?pending=1",
      id: companyUser.id.toString(),
      adminNotifySent: adminNotify.ok,
      registrantNotifySent: registrantNotify.ok,
    },
    { status: 201 },
  );
}
