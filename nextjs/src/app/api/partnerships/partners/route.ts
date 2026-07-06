import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { guardPartnershipAdmin } from "@/lib/partnership-api-guard";
import {
  ensureUniquePartnerSlug,
  ensureUniqueReferralCode,
  nextPartnerId,
  serializePartner,
  slugify,
} from "@/lib/partner-service";
import { assignPartnerRoleToUser, ensureManagePartnershipsPermission } from "@/lib/partner-role";

async function nextUserId(): Promise<bigint> {
  const agg = await prisma.user.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

export async function GET(req: NextRequest) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const statusFilter = (url.searchParams.get("status") ?? "").trim();

  const where: Record<string, unknown> = {};
  if (statusFilter) where.status = statusFilter;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { brandName: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { referralCode: { contains: search, mode: "insensitive" } },
    ];
  }

  const partners = await prisma.partner.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const ids = partners.map((p) => p.id);
  const companyCounts = new Map<string, number>();
  const commissionTotals = new Map<string, number>();
  if (ids.length > 0) {
    const companies = await prisma.user.groupBy({
      by: ["partnerId"],
      where: { partnerId: { in: ids }, type: { in: ["company", "company_admin"] } },
      _count: { _all: true },
    });
    for (const c of companies) {
      if (c.partnerId) companyCounts.set(c.partnerId.toString(), c._count._all);
    }
    const commissions = await prisma.partnerCommission.findMany({
      where: { partnerId: { in: ids } },
      select: { partnerId: true, commissionAmount: true },
    });
    for (const c of commissions) {
      const key = c.partnerId.toString();
      commissionTotals.set(key, (commissionTotals.get(key) ?? 0) + Number(c.commissionAmount));
    }
  }

  return NextResponse.json({
    ok: true,
    items: partners.map((p) => ({
      ...serializePartner(p),
      companyCount: companyCounts.get(p.id.toString()) ?? 0,
      commissionTotal: commissionTotals.get(p.id.toString()) ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  await ensureManagePartnershipsPermission();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();
  const brandName = String(body.brandName ?? body.brand_name ?? "").trim();
  const slugInput = String(body.slug ?? "").trim();
  const commissionRateRaw = body.commissionRate ?? body.commission_rate;
  const status = String(body.status ?? "active").trim() || "active";
  const payoutMethod = String(body.payoutMethod ?? body.payout_method ?? "").trim();
  const payoutEmail = String(body.payoutEmail ?? body.payout_email ?? "").trim();
  const notes = String(body.notes ?? "").trim();
  const password = String(body.password ?? "").trim();
  const createLogin = Boolean(body.createLogin ?? body.create_login ?? (email && password));

  if (!name) {
    return NextResponse.json({ ok: false, message: "Name is required." }, { status: 400 });
  }

  let commissionRate: number | null = null;
  if (commissionRateRaw != null && String(commissionRateRaw).trim() !== "") {
    const n = Number(commissionRateRaw);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json({ ok: false, message: "Commission rate must be between 0 and 100." }, { status: 400 });
    }
    commissionRate = n;
  }

  const slug = await ensureUniquePartnerSlug(slugInput || name);
  const referralCode = await ensureUniqueReferralCode(slugInput || name);

  let userId: bigint | null = null;
  if (createLogin) {
    if (!email) {
      return NextResponse.json({ ok: false, message: "Email is required to create a partner login." }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ ok: false, message: "Password must be at least 6 characters." }, { status: 400 });
    }
    const existingUser = await prisma.user.findFirst({ where: { email }, select: { id: true } });
    if (existingUser?.id) {
      return NextResponse.json({ ok: false, message: "A user with this email already exists." }, { status: 409 });
    }
    const newUserId = await nextUserId();
    await prisma.user.create({
      data: {
        id: newUserId,
        name,
        email,
        password: await bcrypt.hash(password, 10),
        type: "partner",
        slug: slugify(name) || null,
        mobileNo: phone || null,
        lang: "en",
        isEnableLogin: true,
        isActive: true,
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
      },
    });
    userId = newUserId;
  }

  const partnerId = await nextPartnerId();
  const partner = await prisma.partner.create({
    data: {
      id: partnerId,
      userId,
      name,
      email: email || null,
      phone: phone || null,
      brandName: brandName || null,
      slug,
      referralCode,
      commissionRate,
      status,
      payoutMethod: payoutMethod || null,
      payoutEmail: payoutEmail || null,
      notes: notes || null,
      createdAt: new Date(),
    },
  });

  if (userId) {
    await assignPartnerRoleToUser(userId);
  }

  return NextResponse.json({ ok: true, item: serializePartner(partner) }, { status: 201 });
}
