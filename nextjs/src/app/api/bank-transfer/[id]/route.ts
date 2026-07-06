import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { t } from "@/lib/admin-t";


async function nextOrderId(): Promise<bigint> {
  const agg = await prisma.order.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  // Mirrors Laravel: bank-transfer.update uses POST with status approved/rejected.
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "approve-bank-transfer-requests")) {
    return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });
  }

  const { id } = await ctx.params;
  const pk = BigInt(id);

  const payment = await prisma.bankTransferPayment.findFirst({
    where: { id: pk },
    select: {
      id: true,
      status: true,
      userId: true,
      orderId: true,
      price: true,
      priceCurrency: true,
      attachment: true,
      request: true,
    },
  });
  if (!payment) return NextResponse.json({ ok: false, message: t("Not found") }, { status: 404 });
  if (payment.status !== "pending") return NextResponse.json({ ok: false, message: t("Request is not pending.") }, { status: 400 });

  const body = (await req.json().catch(() => null)) as any;
  const status = String(body?.status ?? "").trim();
  if (!["approved", "rejected"].includes(status)) return NextResponse.json({ ok: false, message: t("Invalid status.") }, { status: 400 });

  await prisma.bankTransferPayment.update({ where: { id: pk }, data: { status, updatedAt: new Date() } });

  if (status === "approved") {
    const requestObj = (() => {
      try {
        return payment.request ? (JSON.parse(payment.request) as any) : {};
      } catch {
        return {};
      }
    })();
    const planId = requestObj?.plan_id ? BigInt(String(requestObj.plan_id)) : null;
    const plan = planId ? await prisma.plan.findFirst({ where: { id: planId }, select: { id: true, name: true } }).catch(() => null) : null;
    const user = await prisma.user.findFirst({ where: { id: payment.userId }, select: { id: true, name: true, email: true } }).catch(() => null);

    const existingOrder = await prisma.order.findFirst({ where: { orderId: payment.orderId }, select: { id: true } }).catch(() => null);
    if (!existingOrder) {
      const price = payment.price ?? new Prisma.Decimal(0);
      await prisma.order.create({
        data: {
          id: await nextOrderId(),
          orderId: payment.orderId,
          name: user?.name ?? null,
          email: user?.email ?? null,
          planName: plan?.name ?? null,
          planId: plan?.id ?? null,
          price,
          discountAmount: new Prisma.Decimal(0),
          currency: payment.priceCurrency ?? "USD",
          txnId: "",
          paymentType: "Bank Transfer",
          paymentStatus: "succeeded",
          receipt: payment.attachment ?? null,
          createdBy: payment.userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          // Keep minimal fields populated for legacy code paths
          amount: price,
          status: "succeeded",
        },
      });
    }

    if (requestObj?.coupon_code) {
      const code = String(requestObj.coupon_code).trim().toUpperCase();
      const coupon = await prisma.coupon.findFirst({ where: { code }, select: { id: true } }).catch(() => null);
      if (coupon?.id) {
        await prisma.userCoupon
          .create({ data: { couponId: coupon.id, userId: payment.userId, orderId: payment.orderId, createdAt: new Date() } })
          .catch(() => null);
      }
    }

    // Partner commission on approved bank-transfer payments (best-effort; never break approval).
    try {
      const amount = Number(payment.price ?? 0);
      const { finalizePartnerCommissionForOrder } = await import("@/lib/partner-commission-service");
      await finalizePartnerCommissionForOrder({
        companyUserId: payment.userId,
        orderRef: payment.orderId,
        amount,
      });
    } catch (err) {
      console.warn("[bank-transfer] partner commission skipped:", (err as Error)?.message ?? err);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "delete-bank-transfer-requests")) {
    return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });
  }

  const { id } = await ctx.params;
  const pk = BigInt(id);
  const payment = await prisma.bankTransferPayment.findFirst({ where: { id: pk }, select: { id: true } });
  if (!payment) return NextResponse.json({ ok: false, message: t("Not found") }, { status: 404 });

  await prisma.bankTransferPayment.delete({ where: { id: pk } });
  return NextResponse.json({ ok: true });
}

