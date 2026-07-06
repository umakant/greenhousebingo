import { NextResponse, type NextRequest } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { mergeStorefrontWebsiteSetup } from "@/lib/storefront/setup-metadata";
import { assertStorefrontWebsiteMutationAllowed } from "@/lib/storefront/setup-mutation-context";
import {
  isManualStorefrontSetupStep,
  STOREFRONT_SETUP_STEP_IDS,
  type StorefrontSetupStepId,
  type StorefrontWebsiteSetupFlags,
} from "@/lib/storefront/setup-types";
import { prisma } from "@/lib/prisma";

const STEP_TO_FLAG: Record<string, keyof StorefrontWebsiteSetupFlags> = {
  first_product_created: "firstProductCreated",
  payment_configured: "paymentConfigured",
  shipping_configured: "shippingConfigured",
  taxes_configured: "taxesConfigured",
  customer_accounts_enabled: "customerAccountsEnabled",
};

type Body = {
  websiteId?: unknown;
  step?: unknown;
  done?: unknown;
};

export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.SETTINGS_MANAGE,
  });
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Body;
  const websiteIdRaw = String(body.websiteId ?? "").trim();
  const stepRaw = String(body.step ?? "").trim();
  const done = body.done === true;

  if (!websiteIdRaw || !/^\d+$/.test(websiteIdRaw)) {
    return NextResponse.json({ ok: false, message: "Invalid website." }, { status: 400 });
  }

  let websiteId: bigint;
  try {
    websiteId = BigInt(websiteIdRaw);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid website." }, { status: 400 });
  }

  if (!(STOREFRONT_SETUP_STEP_IDS as readonly string[]).includes(stepRaw)) {
    return NextResponse.json({ ok: false, message: "Unknown step." }, { status: 400 });
  }

  const step = stepRaw as StorefrontSetupStepId;
  if (!STEP_TO_FLAG[step] || !isManualStorefrontSetupStep(step)) {
    return NextResponse.json({ ok: false, message: "This step cannot be updated via the API." }, { status: 400 });
  }

  const gate = await assertStorefrontWebsiteMutationAllowed(req, websiteId);
  if (!gate.ok) return gate.response;

  const website = await prisma.website.findFirst({
    where: { id: websiteId, organizationId: gate.data.organizationId },
    select: { id: true, metadata: true },
  });
  if (!website) {
    return NextResponse.json({ ok: false, message: "Website not found." }, { status: 404 });
  }

  const flag = STEP_TO_FLAG[step];
  const nextMeta = mergeStorefrontWebsiteSetup(website.metadata, { [flag]: done });

  await prisma.website.update({
    where: { id: website.id },
    data: { metadata: nextMeta },
  });

  return NextResponse.json({ ok: true });
}
