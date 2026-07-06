import { NextResponse, type NextRequest } from "next/server";

import { requireAffiliateApiAccess } from "@/lib/affiliate-access";
import {
  buildAffiliateTrackingUrl,
  slugifyAffiliateLink,
} from "@/lib/affiliate-link-utils";
import {
  ensureAffiliateDemoForOrg,
  getAffiliateDefaultLandingUrl,
  serializeLink,
} from "@/lib/affiliate-business-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const linkInclude = {
  partner: { select: { id: true, name: true, referralCode: true } },
  program: { select: { id: true, name: true } },
} as const;

export async function GET(req: NextRequest) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-links");
  if (!gate.ok) return gate.response;

  const { organizationId } = gate.actor;
  await ensureAffiliateDemoForOrg(organizationId);

  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const partnerId = (req.nextUrl.searchParams.get("partnerId") ?? "").trim();
  const programId = (req.nextUrl.searchParams.get("programId") ?? "").trim();

  let partnerIdBig: bigint | undefined;
  let programIdBig: bigint | undefined;
  try {
    if (partnerId) partnerIdBig = BigInt(partnerId);
    if (programId) programIdBig = BigInt(programId);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid filter id." }, { status: 400 });
  }

  const rows = await prisma.affiliateLink.findMany({
    where: {
      organizationId,
      ...(status ? { status } : {}),
      ...(partnerIdBig ? { partnerId: partnerIdBig } : {}),
      ...(programIdBig ? { programId: programIdBig } : {}),
      ...(search
        ? {
            OR: [
              { label: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
              { trackingUrl: { contains: search, mode: "insensitive" } },
              { partner: { name: { contains: search, mode: "insensitive" } } },
              { partner: { referralCode: { contains: search, mode: "insensitive" } } },
              { program: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 500,
    include: linkInclude,
  });

  return NextResponse.json({ ok: true, items: rows.map(serializeLink) });
}

export async function POST(req: NextRequest) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-links");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const partnerIdRaw = String(body.partnerId ?? body.partner_id ?? "").trim();
  const programIdRaw = String(body.programId ?? body.program_id ?? "").trim();
  if (!partnerIdRaw || !programIdRaw) {
    return NextResponse.json({ ok: false, message: "Partner and program are required." }, { status: 400 });
  }

  let partnerId: bigint;
  let programId: bigint;
  try {
    partnerId = BigInt(partnerIdRaw);
    programId = BigInt(programIdRaw);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid partner or program id." }, { status: 400 });
  }

  const { organizationId } = gate.actor;

  const [partner, program] = await Promise.all([
    prisma.affiliatePartner.findFirst({
      where: { id: partnerId, organizationId },
      select: { id: true, name: true, referralCode: true },
    }),
    prisma.affiliateProgram.findFirst({
      where: { id: programId, organizationId },
      select: { id: true, name: true },
    }),
  ]);

  if (!partner || !program) {
    return NextResponse.json({ ok: false, message: "Partner or program not found." }, { status: 404 });
  }

  const programIdStr = program.id.toString();
  const customSlug = String(body.slug ?? "").trim().toLowerCase();
  let slug =
    customSlug ||
    slugifyAffiliateLink(partner.referralCode, program.name, programIdStr);

  const existingSlug = await prisma.affiliateLink.findFirst({
    where: { organizationId, slug },
    select: { id: true },
  });
  if (existingSlug) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`.slice(0, 64);
  }

  const baseUrl = await getAffiliateDefaultLandingUrl(organizationId);
  const destinationUrl = String(body.destinationUrl ?? body.destination_url ?? "").trim() || null;
  const trackingUrl = buildAffiliateTrackingUrl({
    baseUrl,
    referralCode: partner.referralCode,
    programId: programIdStr,
    slug,
    destinationUrl,
  });

  if (!trackingUrl) {
    return NextResponse.json(
      { ok: false, message: "Could not build tracking URL. Check default landing URL in settings." },
      { status: 400 },
    );
  }

  const label =
    String(body.label ?? "").trim() ||
    `${partner.name} — ${program.name}`;

  const row = await prisma.affiliateLink.create({
    data: {
      organizationId,
      partnerId: partner.id,
      programId: program.id,
      label,
      destinationUrl,
      slug,
      trackingUrl,
      status: String(body.status ?? "active").trim() || "active",
    },
    include: linkInclude,
  });

  return NextResponse.json({ ok: true, item: serializeLink(row) });
}
