/**
 * Company billing payment methods: aggregated accounting methods + saved card/PayPal records.
 * Auth: superadmin + manage-users, or tenant users for their own company. Full card numbers are never persisted (last 4 only).
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import {
  assertCompanyBillingPaymentMethodDelegate,
  COMPANY_BILLING_PRISMA_NOT_READY,
  hasPrismaDelegate,
} from "@/lib/company-billing-prisma";
import { canAccessCompanyBillingApis } from "@/lib/company-billing-route-auth";
import { prisma } from "@/lib/prisma";
import { cardBrandFromPanDigits, parseExpMmYy } from "@/lib/billing-payment-method-server";
import { billingPanIsValidForSave } from "@/lib/billing-payment-inputs";

function forbidden() {
  return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
}

function serverError(e: unknown, context: string) {
  console.error(`[${context}]`, e);
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Billing tables are missing in the database. Apply Prisma migrations (or run db push) so company_billing_payment_methods and related tables exist.",
      },
      { status: 500 },
    );
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (
    msg.includes("findMany") ||
    msg.includes("groupBy") ||
    msg.includes("Cannot read properties of undefined")
  ) {
    return NextResponse.json({ ok: false, error: COMPANY_BILLING_PRISMA_NOT_READY }, { status: 503 });
  }
  return NextResponse.json({ ok: false, error: msg || "Server error" }, { status: 500 });
}

type GroupRow = {
  paymentMethod: string | null;
  _count: { _all: number };
  _max: { paymentDate: Date | null };
};

function mergeGroups(rows: GroupRow[]) {
  const map = new Map<string, { method: string; count: number; lastUsed: Date | null }>();
  for (const g of rows) {
    const label = g.paymentMethod?.trim() || "";
    const key = label || "__unspecified";
    const last = g._max.paymentDate;
    const cur = map.get(key);
    if (!cur) {
      map.set(key, {
        method: label || "",
        count: g._count._all,
        lastUsed: last,
      });
    } else {
      cur.count += g._count._all;
      if (last && (!cur.lastUsed || last > cur.lastUsed)) cur.lastUsed = last;
    }
  }
  return Array.from(map.values());
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const companyId = parseInt(id, 10);
  if (Number.isNaN(companyId))
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });

  const tenantId = BigInt(companyId);
  if (!(await canAccessCompanyBillingApis(req, tenantId))) return forbidden();

  try {
    const company = await prisma.user.findFirst({
      where: { id: tenantId, type: { in: ["company", "company_admin"] } },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ ok: false, error: "Company not found" }, { status: 404 });
    }

    const hasCust = hasPrismaDelegate(prisma, "customerPayment", "groupBy");
    const hasVend = hasPrismaDelegate(prisma, "vendorPayment", "groupBy");
    const hasSaved = hasPrismaDelegate(prisma, "companyBillingPaymentMethod", "findMany");
    if (!hasCust || !hasVend || !hasSaved) {
      console.warn(
        "[billing-payment-methods GET] Prisma client missing billing delegates (customerPayment / vendorPayment / companyBillingPaymentMethod). Run `npx prisma generate` in the nextjs folder and restart the dev server.",
      );
    }

    const [custGroups, vendGroups, savedRows] = await Promise.all([
      hasCust
        ? prisma.customerPayment.groupBy({
            by: ["paymentMethod"],
            where: { createdBy: tenantId },
            _count: { _all: true },
            _max: { paymentDate: true },
          })
        : Promise.resolve([] as GroupRow[]),
      hasVend
        ? prisma.vendorPayment.groupBy({
            by: ["paymentMethod"],
            where: { createdBy: tenantId },
            _count: { _all: true },
            _max: { paymentDate: true },
          })
        : Promise.resolve([] as GroupRow[]),
      hasSaved
        ? prisma.companyBillingPaymentMethod.findMany({
            where: { companyId: tenantId },
            orderBy: [{ isDefault: "desc" }, { id: "desc" }],
          })
        : Promise.resolve([]),
    ]);

    const merged = mergeGroups([...custGroups, ...vendGroups]);

    merged.sort((a, b) => {
      const ta = a.lastUsed?.getTime() ?? 0;
      const tb = b.lastUsed?.getTime() ?? 0;
      if (tb !== ta) return tb - ta;
      return b.count - a.count;
    });

    return NextResponse.json({
      ok: true,
      billing_prisma_incomplete: !(hasCust && hasVend && hasSaved),
      accounting_summary: merged.map((row) => ({
        method: row.method || null,
        count: row.count,
        last_used: row.lastUsed ? row.lastUsed.toISOString().slice(0, 10) : null,
      })),
      saved_methods: savedRows.map((r) => ({
        id: r.id.toString(),
        kind: r.kind,
        card_last4: r.cardLast4,
        card_brand: r.cardBrand,
        cardholder_name: r.cardholderName,
        exp_month: r.expMonth,
        exp_year: r.expYear,
        paypal_email: r.paypalEmail,
        is_default: r.isDefault,
        created_at: r.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return serverError(e, "billing-payment-methods GET");
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const companyId = parseInt(id, 10);
  if (Number.isNaN(companyId))
    return NextResponse.json({ ok: false, error: "Invalid company id" }, { status: 400 });

  const tenantId = BigInt(companyId);
  if (!(await canAccessCompanyBillingApis(req, tenantId))) return forbidden();

  const notReadyPost = assertCompanyBillingPaymentMethodDelegate(prisma);
  if (notReadyPost) return notReadyPost;

  try {
    const company = await prisma.user.findFirst({
      where: { id: tenantId, type: { in: ["company", "company_admin"] } },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ ok: false, error: "Company not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
    }

    const kind = String(body.kind ?? "").trim().toLowerCase();
    if (kind !== "card" && kind !== "paypal") {
      return NextResponse.json({ ok: false, error: "kind must be card or paypal" }, { status: 400 });
    }

    const setPrimary = Boolean(body.set_primary ?? body.is_default ?? true);

    if (kind === "paypal") {
      const email = String(body.paypal_email ?? "").trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ ok: false, error: "Valid PayPal email is required" }, { status: 400 });
      }

      if (setPrimary) {
        await prisma.companyBillingPaymentMethod.updateMany({
          where: { companyId: tenantId },
          data: { isDefault: false },
        });
      }

      const created = await prisma.companyBillingPaymentMethod.create({
        data: {
          companyId: tenantId,
          kind: "paypal",
          paypalEmail: email,
          isDefault: setPrimary,
        },
      });

      return NextResponse.json({
        ok: true,
        id: created.id.toString(),
      });
    }

    const panRaw = String(body.card_number ?? "").replace(/\D/g, "");
    if (!billingPanIsValidForSave(panRaw)) {
      return NextResponse.json({ ok: false, error: "Enter a valid card number" }, { status: 400 });
    }

    const cardholderName = String(body.cardholder_name ?? "").trim();
    if (!cardholderName) {
      return NextResponse.json({ ok: false, error: "Name on card is required" }, { status: 400 });
    }

    const expStr = String(body.exp ?? body.expiry ?? "").trim();
    const exp = parseExpMmYy(expStr);
    if (!exp) {
      return NextResponse.json({ ok: false, error: "Exp. date must be MM/YY" }, { status: 400 });
    }

    const last4 = panRaw.slice(-4);
    const brand = cardBrandFromPanDigits(panRaw);

    if (setPrimary) {
      await prisma.companyBillingPaymentMethod.updateMany({
        where: { companyId: tenantId },
        data: { isDefault: false },
      });
    }

    const created = await prisma.companyBillingPaymentMethod.create({
      data: {
        companyId: tenantId,
        kind: "card",
        cardLast4: last4,
        cardBrand: brand,
        cardholderName,
        expMonth: exp.month,
        expYear: exp.year,
        isDefault: setPrimary,
      },
    });

    return NextResponse.json({ ok: true, id: created.id.toString() });
  } catch (e) {
    return serverError(e, "billing-payment-methods POST");
  }
}
