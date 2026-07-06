import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { LARAVEL_USER_MORPH_TYPE } from "@/lib/laravel-user-model-type";
import { formatPhone } from "@/lib/phone";
import { sendWelcomeEmail } from "@/lib/send-welcome-email";
import { notifySuperadminsCompanyRegistrationPending } from "@/lib/send-company-approval-emails";
import { getMembershipPlan } from "@/lib/waterice/membership-plans";
import { resolveWaterIceStripe } from "@/lib/waterice/waterice-stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function nextUserId(): Promise<bigint> {
  const agg = await prisma.user.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

/** SaaS subscription plan for the new company tenant (env override → free → standard → any). */
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
  slug?: unknown;
  company_name?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  email?: unknown;
  phone?: unknown;
  password?: unknown;
  password_confirmation?: unknown;
  address?: unknown;
  city?: unknown;
  state?: unknown;
  zip?: unknown;
  country?: unknown;
  paymentIntentId?: unknown;
  mock?: unknown;
};

/** Persist captured company address (and contact basics) as Laravel-style settings rows. */
async function saveCompanySettings(
  companyId: bigint,
  values: Record<string, string>,
): Promise<void> {
  const entries = Object.entries(values).filter(([, v]) => v && v.trim());
  if (entries.length === 0) return;
  const agg = await prisma.setting.aggregate({ _max: { id: true } });
  let nextId = (agg._max.id ?? 0n) + 1n;
  for (const [key, value] of entries) {
    await prisma.setting.create({
      data: {
        id: nextId,
        key,
        value: value.trim(),
        isPublic: false,
        createdBy: companyId,
        createdAt: new Date(),
      },
    });
    nextId += 1n;
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;

  const plan = getMembershipPlan(body?.slug);
  if (!plan) {
    return NextResponse.json({ ok: false, message: "Unknown membership plan." }, { status: 400 });
  }

  const companyName = str(body?.company_name);
  const firstName = str(body?.first_name);
  const lastName = str(body?.last_name);
  const email = normalizeEmail(str(body?.email));
  const phoneRaw = str(body?.phone).replace(/\D/g, "");
  const phoneFormatted = formatPhone(phoneRaw);
  const password = String(body?.password ?? "");
  const passwordConfirm = String(body?.password_confirmation ?? "");
  const address = str(body?.address);
  const city = str(body?.city);
  const state = str(body?.state);
  const zip = str(body?.zip);
  const country = str(body?.country);

  if (!companyName) {
    return NextResponse.json({ ok: false, message: "Business name is required." }, { status: 400 });
  }
  if (!firstName) {
    return NextResponse.json({ ok: false, message: "First name is required." }, { status: 400 });
  }
  if (!lastName) {
    return NextResponse.json({ ok: false, message: "Last name is required." }, { status: 400 });
  }
  if (phoneRaw.length !== 10) {
    return NextResponse.json(
      { ok: false, message: "A valid 10-digit phone number is required." },
      { status: 400 },
    );
  }
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, message: "Valid email is required." }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json(
      { ok: false, message: "Password must be at least 6 characters." },
      { status: 400 },
    );
  }
  if (password !== passwordConfirm) {
    return NextResponse.json({ ok: false, message: "Passwords do not match." }, { status: 400 });
  }

  // Resolve Stripe credentials and authoritatively confirm the payment.
  const cfg = await resolveWaterIceStripe(req.headers.get("host"));
  const stripeEnabled = Boolean(cfg?.enabled && cfg.secretKey);
  const paymentIntentId = str(body?.paymentIntentId);

  let paymentMode: "stripe" | "mock";
  if (paymentIntentId) {
    if (!stripeEnabled || !cfg) {
      return NextResponse.json({ ok: false, message: "Card payments are not enabled." }, { status: 400 });
    }
    try {
      const stripe = new Stripe(cfg.secretKey, { typescript: true });
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (pi.status !== "succeeded") {
        return NextResponse.json({ ok: false, message: "Payment has not completed." }, { status: 402 });
      }
      if (pi.metadata?.source !== "waterice_membership" || pi.metadata?.membershipSlug !== plan.slug) {
        return NextResponse.json({ ok: false, message: "Payment mismatch." }, { status: 400 });
      }
      if (typeof pi.amount === "number" && pi.amount !== plan.priceCents) {
        return NextResponse.json(
          { ok: false, message: "Membership total does not match the payment." },
          { status: 400 },
        );
      }
      paymentMode = "stripe";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not verify payment.";
      return NextResponse.json({ ok: false, message }, { status: 502 });
    }
  } else {
    // No PaymentIntent: only allowed when Stripe is off (the mock fallback flow).
    if (stripeEnabled) {
      return NextResponse.json({ ok: false, message: "Payment required." }, { status: 402 });
    }
    paymentMode = "mock";
  }

  const existing = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (existing?.id) {
    return NextResponse.json(
      { ok: false, message: "An account with this email already exists." },
      { status: 409 },
    );
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

  // Paid membership → activate the company login immediately.
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
      isEnableLogin: true,
      isActive: true,
      activePlan: activePlanNum,
      creatorId: null,
      createdBy: null,
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
    },
    select: { id: true },
  });

  const companyRole = await prisma.role.findFirst({ where: { name: "company" }, select: { id: true } });
  if (companyRole?.id) {
    await prisma.modelHasRole.create({
      data: {
        roleId: companyRole.id,
        modelId: companyUser.id,
        modelType: LARAVEL_USER_MORPH_TYPE,
      },
    });
  }

  // Persist the company contact + address (from Google Places) on the new account (best-effort).
  try {
    await saveCompanySettings(companyUser.id, {
      company_name: companyName,
      company_telephone: phoneFormatted,
      company_address: address,
      company_city: city,
      company_state: state,
      company_zipcode: zip,
      company_country: country,
    });
  } catch (e) {
    console.warn("[waterice/membership/register] saving company settings failed:", e);
  }

  // Tag the PaymentIntent with the company so it can be reconciled later (best-effort).
  if (paymentMode === "stripe" && cfg) {
    try {
      const stripe = new Stripe(cfg.secretKey, { typescript: true });
      await stripe.paymentIntents.update(paymentIntentId, {
        metadata: {
          source: "waterice_membership",
          membershipSlug: plan.slug,
          membershipName: plan.name,
          companyUserId: companyUser.id.toString(),
        },
      });
    } catch {
      /* metadata tagging is best-effort */
    }
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim() || req.nextUrl.origin;
  const contactName = `${firstName} ${lastName}`.trim();

  // Welcome email with login credentials (best-effort).
  try {
    await sendWelcomeEmail({
      to: email,
      name: contactName || email,
      email,
      password,
      appUrl: appUrl || undefined,
      companyName,
      companyId: companyUser.id,
    });
  } catch (e) {
    console.warn("[waterice/membership/register] welcome email failed:", e);
  }

  // Let superadmins know a paid membership company joined (best-effort).
  try {
    await notifySuperadminsCompanyRegistrationPending({
      companyName,
      contactName,
      registrantEmail: email,
      phone: phoneFormatted,
      companyUserId: companyUser.id.toString(),
      appUrl,
      interestedModulesSummary: `Membership: ${plan.name} ($${plan.price.toFixed(2)}/${plan.billingPeriod})`,
    });
  } catch (e) {
    console.warn("[waterice/membership/register] superadmin notify failed:", e);
  }

  return NextResponse.json(
    {
      ok: true,
      id: companyUser.id.toString(),
      membership: plan.name,
      paymentMode,
    },
    { status: 201 },
  );
}
