import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { guardPartnershipAdmin } from "@/lib/partnership-api-guard";
import {
  ensureReferralPartnerForOwnershipHolder,
  ensureUniquePartnerSlug,
  ensureUniqueReferralCode,
  nextPartnerId,
  slugify,
} from "@/lib/partner-service";
import { assignPartnerRoleToUser, ensureManagePartnershipsPermission } from "@/lib/partner-role";

async function nextUserId(): Promise<bigint> {
  const agg = await prisma.user.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

export type ReferralLinkItem = {
  partnerId: string | null;
  holderId: string | null;
  name: string;
  brandName: string | null;
  slug: string | null;
  referralCode: string | null;
  status: string;
  linkActive: boolean;
  companyCount: number;
  source: "ownership" | "standalone";
};

export async function GET(req: NextRequest) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const search = (new URL(req.url).searchParams.get("search") ?? "").trim().toLowerCase();

  const [partners, ownershipHolders] = await Promise.all([
    prisma.partner.findMany({ orderBy: { name: "asc" } }),
    prisma.ownershipBrandHolder.findMany({
      where: {
        isPrimaryBrandHolder: false,
        status: { in: ["active", "pending_agreement", "pending_brand_approval"] },
      },
      include: { brand: { select: { name: true } } },
      orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  const partnerById = new Map(partners.map((p) => [p.id.toString(), p]));
  const partnerIdsFromHolders = new Set<string>();
  const items: ReferralLinkItem[] = [];

  for (const h of ownershipHolders) {
    const partner = h.partnerId ? partnerById.get(h.partnerId.toString()) : null;
    if (partner) partnerIdsFromHolders.add(partner.id.toString());

    items.push({
      partnerId: partner?.id.toString() ?? null,
      holderId: h.id.toString(),
      name: h.name,
      brandName: h.brand.name,
      slug: partner?.slug ?? null,
      referralCode: partner?.referralCode ?? h.referralCode,
      status: partner?.status ?? h.status,
      linkActive: partner?.status === "active",
      companyCount: 0,
      source: "ownership",
    });
  }

  for (const p of partners) {
    if (partnerIdsFromHolders.has(p.id.toString())) continue;
    items.push({
      partnerId: p.id.toString(),
      holderId: null,
      name: p.name,
      brandName: p.brandName,
      slug: p.slug,
      referralCode: p.referralCode,
      status: p.status,
      linkActive: p.status === "active",
      companyCount: 0,
      source: "standalone",
    });
  }

  const partnerIds = items.map((i) => i.partnerId).filter((id): id is string => Boolean(id));
  if (partnerIds.length > 0) {
    const idBigints = partnerIds.map((id) => BigInt(id));
    const companies = await prisma.user.groupBy({
      by: ["partnerId"],
      where: { partnerId: { in: idBigints }, type: { in: ["company", "company_admin"] } },
      _count: { _all: true },
    });
    const companyCounts = new Map<string, number>();
    for (const c of companies) {
      if (c.partnerId) companyCounts.set(c.partnerId.toString(), c._count._all);
    }
    for (const item of items) {
      if (item.partnerId) item.companyCount = companyCounts.get(item.partnerId) ?? 0;
    }
  }

  let filtered = items;
  if (search) {
    filtered = items.filter(
      (i) =>
        i.name.toLowerCase().includes(search) ||
        (i.brandName?.toLowerCase().includes(search) ?? false) ||
        (i.slug?.toLowerCase().includes(search) ?? false) ||
        (i.referralCode?.toLowerCase().includes(search) ?? false),
    );
  }

  filtered.sort((a, b) => {
    const brandCmp = (a.brandName ?? "").localeCompare(b.brandName ?? "");
    if (brandCmp !== 0) return brandCmp;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ ok: true, items: filtered });
}

export async function POST(req: NextRequest) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  await ensureManagePartnershipsPermission();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const holderIdRaw = String(body.holderId ?? "").trim();

  if (holderIdRaw) {
    try {
      const holderId = BigInt(holderIdRaw);
      const partner = await ensureReferralPartnerForOwnershipHolder(holderId);
      const linked = await prisma.ownershipBrandHolder.findFirst({
        where: { id: holderId },
        include: { brand: { select: { name: true } } },
      });
      return NextResponse.json({
        ok: true,
        item: {
          partnerId: partner.id.toString(),
          holderId: holderId.toString(),
          name: partner.name,
          brandName: partner.brandName ?? linked?.brand.name ?? null,
          slug: partner.slug,
          referralCode: partner.referralCode,
          status: partner.status,
          linkActive: partner.status === "active",
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not generate referral link.";
      return NextResponse.json({ ok: false, message }, { status: 400 });
    }
  }

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
    return NextResponse.json({ ok: false, message: "Partner name is required." }, { status: 400 });
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

  return NextResponse.json(
    {
      ok: true,
      item: {
        partnerId: partner.id.toString(),
        holderId: null,
        name: partner.name,
        brandName: partner.brandName,
        slug: partner.slug,
        referralCode: partner.referralCode,
        status: partner.status,
        linkActive: partner.status === "active",
      },
    },
    { status: 201 },
  );
}
