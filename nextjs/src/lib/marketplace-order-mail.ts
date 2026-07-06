import "server-only";

import type { NextRequest } from "next/server";

import { getEffectiveMailSettings } from "@/lib/settings-service";
import { createSmtpTransportFromSettings, parseSmtpFromSettingsBlob } from "@/lib/smtp-from-settings";

export type OrderMailItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type OrderMailPayload = {
  orderNumber: string;
  vendorName: string | null;
  city: string;
  state: string;
  currency: string;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  totalBucketCount: number;
  items: OrderMailItem[];
};

function publicOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = (req.headers.get("x-forwarded-proto") ?? "http").split(",")[0]?.trim() || "http";
  if (host) return `${proto}://${host}`;
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return base || "http://localhost:3000";
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount);
  } catch {
    return `${currency || "USD"} ${amount.toFixed(2)}`;
  }
}

function buildHtml(order: OrderMailPayload, orderUrl: string): string {
  const rows = order.items
    .map(
      (it) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${escapeHtml(it.productName)}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${money(it.unitPrice, order.currency)}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${money(it.totalPrice, order.currency)}</td></tr>`,
    )
    .join("");

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;max-width:600px;margin:0 auto">
    <h2 style="margin:0 0 4px">Thank you for your order</h2>
    <p style="margin:0 0 16px;color:#6b7280">Order <strong>${escapeHtml(order.orderNumber)}</strong>${
      order.vendorName ? ` · ${escapeHtml(order.vendorName)}` : ""
    }</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:6px 8px;text-align:left">Item</th>
          <th style="padding:6px 8px;text-align:center">Qty</th>
          <th style="padding:6px 8px;text-align:right">Unit</th>
          <th style="padding:6px 8px;text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <table style="width:100%;margin-top:12px;font-size:14px">
      <tr><td>Total buckets</td><td style="text-align:right">${order.totalBucketCount}</td></tr>
      <tr><td>Subtotal</td><td style="text-align:right">${money(order.subtotal, order.currency)}</td></tr>
      <tr><td>Tax</td><td style="text-align:right">${money(order.tax, order.currency)}</td></tr>
      <tr><td>Delivery fee</td><td style="text-align:right">${money(order.deliveryFee, order.currency)}</td></tr>
      <tr><td style="font-weight:bold;padding-top:6px">Total</td><td style="text-align:right;font-weight:bold;padding-top:6px">${money(
        order.total,
        order.currency,
      )}</td></tr>
    </table>
    <p style="margin:16px 0;color:#6b7280">Delivery to ${escapeHtml(order.city)}, ${escapeHtml(order.state)}.
      Your order is queued and will be scheduled once your city reaches the delivery minimum.</p>
    <p><a href="${orderUrl}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">View order</a></p>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends an order confirmation email to the buyer using the org's effective SMTP
 * settings. Non-throwing: returns ok/false so callers can fire-and-forget.
 */
export async function sendMarketplaceOrderConfirmation(opts: {
  req: NextRequest;
  organizationId: bigint;
  to: string;
  orderId: string;
  order: OrderMailPayload;
}): Promise<{ ok: boolean; message?: string }> {
  const to = (opts.to ?? "").trim();
  if (!to.includes("@")) return { ok: false, message: "No recipient email." };

  try {
    const settings = await getEffectiveMailSettings(opts.organizationId);
    const smtp = parseSmtpFromSettingsBlob(settings);
    if (smtp.driver !== "smtp" || !smtp.host) {
      return { ok: false, message: "SMTP is not configured." };
    }
    const fromAddress = (smtp.fromAddress || smtp.username || "").trim();
    if (!fromAddress) return { ok: false, message: "SMTP from address missing." };

    const transporter = createSmtpTransportFromSettings(settings);
    if (!transporter) return { ok: false, message: "Could not create SMTP transport." };

    const displayFrom =
      (settings.company_name ?? opts.order.vendorName ?? process.env.NEXT_PUBLIC_APP_NAME ?? "Marketplace").trim() ||
      fromAddress;
    const orderUrl = `${publicOrigin(opts.req)}/company/orders/${encodeURIComponent(opts.orderId)}`;
    const html = buildHtml(opts.order, orderUrl);

    await transporter.sendMail({
      from: { name: displayFrom, address: fromAddress },
      to,
      subject: `Order confirmation — ${opts.order.orderNumber}`,
      html,
      text: html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    });
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to send email." };
  }
}

/** Fire-and-forget wrapper for API routes — never throws. */
export function sendMarketplaceOrderConfirmationAsync(opts: Parameters<typeof sendMarketplaceOrderConfirmation>[0]): void {
  void sendMarketplaceOrderConfirmation(opts).catch(() => undefined);
}

export type DeliveryScheduledMailPayload = {
  vendorName: string | null;
  city: string;
  state: string;
  deliveryDate: string | null;
  startTime: string | null;
  endTime: string | null;
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  driverName: string | null;
  driverPhone: string | null;
  orderNumbers: string[];
};

function buildScheduledHtml(p: DeliveryScheduledMailPayload): string {
  const when = [p.deliveryDate, [p.startTime, p.endTime].filter(Boolean).join(" – ")]
    .filter(Boolean)
    .join(" · ");
  const detail = (label: string, value: string | null) =>
    value
      ? `<tr><td style="padding:4px 8px;color:#6b7280">${escapeHtml(label)}</td><td style="padding:4px 8px;text-align:right">${escapeHtml(
          value,
        )}</td></tr>`
      : "";
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;max-width:600px;margin:0 auto">
    <h2 style="margin:0 0 4px">Your Water Ice delivery is scheduled</h2>
    <p style="margin:0 0 16px;color:#6b7280">Great news — ${escapeHtml(p.city)}, ${escapeHtml(
      p.state,
    )} reached the delivery minimum${p.vendorName ? ` for ${escapeHtml(p.vendorName)}` : ""}.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #eee;border-radius:8px">
      ${detail("When", when || null)}
      ${detail("Delivery address", p.deliveryAddress)}
      ${detail("Driver", p.driverName)}
      ${detail("Driver phone", p.driverPhone)}
      ${detail("Notes", p.deliveryNotes)}
    </table>
    ${
      p.orderNumbers.length
        ? `<p style="margin:16px 0 0;color:#6b7280">Orders included: ${p.orderNumbers
            .map((n) => escapeHtml(n))
            .join(", ")}</p>`
        : ""
    }
  </div>`;
}

/**
 * Notifies a single company that their city's delivery has been scheduled.
 * Non-throwing — returns ok/false so the caller can fire-and-forget per recipient.
 */
export async function sendMarketplaceDeliveryScheduled(opts: {
  organizationId: bigint;
  to: string;
  payload: DeliveryScheduledMailPayload;
}): Promise<{ ok: boolean; message?: string }> {
  const to = (opts.to ?? "").trim();
  if (!to.includes("@")) return { ok: false, message: "No recipient email." };

  try {
    const settings = await getEffectiveMailSettings(opts.organizationId);
    const smtp = parseSmtpFromSettingsBlob(settings);
    if (smtp.driver !== "smtp" || !smtp.host) {
      return { ok: false, message: "SMTP is not configured." };
    }
    const fromAddress = (smtp.fromAddress || smtp.username || "").trim();
    if (!fromAddress) return { ok: false, message: "SMTP from address missing." };

    const transporter = createSmtpTransportFromSettings(settings);
    if (!transporter) return { ok: false, message: "Could not create SMTP transport." };

    const displayFrom =
      (settings.company_name ?? opts.payload.vendorName ?? process.env.NEXT_PUBLIC_APP_NAME ?? "Marketplace").trim() ||
      fromAddress;
    const html = buildScheduledHtml(opts.payload);

    await transporter.sendMail({
      from: { name: displayFrom, address: fromAddress },
      to,
      subject: `Delivery scheduled — ${opts.payload.city}, ${opts.payload.state}`,
      html,
      text: html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    });
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to send email." };
  }
}

/** Fire-and-forget wrapper — never throws. */
export function sendMarketplaceDeliveryScheduledAsync(
  opts: Parameters<typeof sendMarketplaceDeliveryScheduled>[0],
): void {
  void sendMarketplaceDeliveryScheduled(opts).catch(() => undefined);
}
