import "server-only";

import { createAppNotification } from "@/lib/app-notifications";
import {
  MARKETPLACE_EMAIL_SETTING_KEY,
  MARKETPLACE_EMAIL_TEMPLATE,
} from "@/lib/marketplace-notification-keys";
import { prisma } from "@/lib/prisma";
import { isCompanyEmailNotificationEnabled, sendTemplatedEmailAsync } from "@/lib/send-templated-email";
import { getSettingsForOwner } from "@/lib/settings-service";

const MODULE = "Marketplace";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");

function appPath(path: string): string {
  return APP_URL ? `${APP_URL}${path}` : path;
}

function money(amount: number, currency = "USD"): string {
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount);
  } catch {
    return `${currency || "USD"} ${amount.toFixed(2)}`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Sends a templated email gated by the owner's company toggle (best-effort). */
async function dispatch(params: {
  ownerId: bigint;
  templateName: string;
  settingKey: string;
  mailTo: string[];
  variables: Record<string, string>;
}): Promise<void> {
  const recipients = [...new Set(params.mailTo.map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@")))];
  if (recipients.length === 0) return;

  const settings = await getSettingsForOwner(params.ownerId);
  if (!isCompanyEmailNotificationEnabled(settings, params.settingKey)) return;

  sendTemplatedEmailAsync({
    templateName: params.templateName,
    mailTo: recipients,
    ownerId: params.ownerId,
    variables: params.variables,
  });
}

/** Resolves Water Ice Express admin recipients (superadmin users with an email). */
async function loadAdminRecipients(): Promise<Array<{ id: bigint; name: string | null; email: string | null }>> {
  return prisma.user.findMany({
    where: {
      email: { not: null },
      OR: [
        { type: { equals: "superadmin", mode: "insensitive" } },
        { type: { equals: "super admin", mode: "insensitive" } },
        { type: { equals: "super_admin", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true },
  });
}

export type OrderProductLine = { productName: string; quantity: number };

function productsHtml(products: OrderProductLine[]): string {
  if (!products.length) return "<p style=\"color:#6b7280\">—</p>";
  const items = products
    .map((p) => `<li>${escapeHtml(p.productName)} × ${Math.max(1, Math.floor(p.quantity || 1))}</li>`)
    .join("");
  return `<ul style="margin:4px 0 0;padding-left:18px">${items}</ul>`;
}

/**
 * 1. Order confirmation — after successful checkout. Sent to the buying company.
 */
export async function notifyMarketplaceOrderConfirmation(params: {
  organizationId: bigint;
  toEmail: string;
  recipientName?: string | null;
  companyName?: string | null;
  orderId: string;
  orderNumber: string;
  vendorName: string | null;
  products: OrderProductLine[];
  amountPaid: number;
  currency: string;
  bucketCount: number;
  city: string;
  state: string;
}): Promise<void> {
  const orderLink = `/company/orders/${encodeURIComponent(params.orderId)}`;
  await dispatch({
    ownerId: params.organizationId,
    templateName: MARKETPLACE_EMAIL_TEMPLATE.orderConfirmation,
    settingKey: MARKETPLACE_EMAIL_SETTING_KEY.orderConfirmation,
    mailTo: [params.toEmail],
    variables: {
      name: params.recipientName?.trim() || params.companyName?.trim() || "there",
      company_name: params.companyName?.trim() || "-",
      order_number: params.orderNumber,
      vendor_name: params.vendorName?.trim() || "Water Ice Express",
      order_products: productsHtml(params.products),
      amount_paid: money(params.amountPaid, params.currency),
      order_total: money(params.amountPaid, params.currency),
      bucket_count: String(params.bucketCount),
      city: params.city,
      state: params.state,
      order_status: "Paid",
      delivery_status: "Waiting for City Minimum",
      order_url: appPath(orderLink),
    },
  });

  // In-app notification for the company dashboard (not gated by the email toggle).
  await createAppNotification({
    userId: params.organizationId,
    organizationId: params.organizationId,
    module: MODULE,
    type: "order_confirmation",
    title: `Order ${params.orderNumber} confirmed`,
    body: `${money(params.amountPaid, params.currency)} paid · ${params.bucketCount} buckets · ${params.city}, ${params.state}. Waiting for city minimum.`,
    link: orderLink,
  });
}

/**
 * 2. City ready-to-schedule admin alert — when a city reaches the bucket minimum.
 *    Sent to Water Ice Express admins (superadmins).
 */
export async function notifyMarketplaceCityReadyAdmin(params: {
  vendorName: string | null;
  city: string;
  state: string;
  currentBucketTotal: number;
  requiredMinimum: number;
  companyCount: number;
  cityStateParam: string;
}): Promise<void> {
  const admins = await loadAdminRecipients();
  if (admins.length === 0) return;

  const cityQueueLink = `/admin/marketplace/delivery-queue/${params.cityStateParam}`;
  const cityQueueUrl = appPath(cityQueueLink);
  for (const admin of admins) {
    if (admin.email) {
      await dispatch({
        ownerId: admin.id,
        templateName: MARKETPLACE_EMAIL_TEMPLATE.cityReadyAdmin,
        settingKey: MARKETPLACE_EMAIL_SETTING_KEY.cityReadyAdmin,
        mailTo: [admin.email],
        variables: {
          name: admin.name?.trim() || "Admin",
          vendor_name: params.vendorName?.trim() || "Water Ice Express",
          city: params.city,
          state: params.state,
          current_bucket_total: String(params.currentBucketTotal),
          required_minimum: String(params.requiredMinimum),
          company_count: String(params.companyCount),
          city_queue_url: cityQueueUrl,
        },
      });
    }
    // In-app notification for each admin (always created).
    await createAppNotification({
      userId: admin.id,
      module: MODULE,
      type: "city_ready",
      title: `${params.city}, ${params.state} is ready to schedule`,
      body: `${params.currentBucketTotal}/${params.requiredMinimum} buckets · ${params.companyCount} companies.`,
      link: cityQueueLink,
    });
  }
}

type DeliveryMailBase = {
  organizationId: bigint;
  toEmail: string;
  recipientName?: string | null;
  companyName?: string | null;
  orderNumbers: string[];
  vendorName: string | null;
  city: string;
  state: string;
  deliveryDate: string;
  deliveryTime?: string | null;
  deliveryAddress?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  deliveryNotes?: string | null;
};

function deliveryVariables(params: DeliveryMailBase): Record<string, string> {
  const driverInfo = [params.driverName?.trim(), params.driverPhone?.trim()].filter(Boolean).join(" · ") || "—";
  return {
    name: params.recipientName?.trim() || params.companyName?.trim() || "there",
    company_name: params.companyName?.trim() || "-",
    order_number: params.orderNumbers.length ? params.orderNumbers.join(", ") : "—",
    vendor_name: params.vendorName?.trim() || "Water Ice Express",
    city: params.city,
    state: params.state,
    delivery_date: params.deliveryDate,
    delivery_time: params.deliveryTime?.trim() || "—",
    delivery_address: params.deliveryAddress?.trim() || "—",
    driver_name: params.driverName?.trim() || "—",
    driver_phone: params.driverPhone?.trim() || "—",
    driver_info: driverInfo,
    delivery_notes: params.deliveryNotes?.trim() || "—",
  };
}

/**
 * 3. Delivery scheduled — after an admin creates a delivery event.
 *    Sent to each company in the city queue.
 */
export async function notifyMarketplaceDeliveryScheduled(params: DeliveryMailBase): Promise<void> {
  await dispatch({
    ownerId: params.organizationId,
    templateName: MARKETPLACE_EMAIL_TEMPLATE.deliveryScheduled,
    settingKey: MARKETPLACE_EMAIL_SETTING_KEY.deliveryScheduled,
    mailTo: [params.toEmail],
    variables: deliveryVariables(params),
  });

  await createAppNotification({
    userId: params.organizationId,
    organizationId: params.organizationId,
    module: MODULE,
    type: "delivery_scheduled",
    title: `Delivery scheduled — ${params.city}, ${params.state}`,
    body: `${params.deliveryDate}${params.deliveryTime ? ` · ${params.deliveryTime}` : ""} · ${params.deliveryAddress?.trim() || "address TBC"}.`,
    link: "/company/orders",
  });
}

/**
 * 4. Delivery reminder (optional) — sent before the delivery date.
 */
export async function notifyMarketplaceDeliveryReminder(params: DeliveryMailBase): Promise<void> {
  await dispatch({
    ownerId: params.organizationId,
    templateName: MARKETPLACE_EMAIL_TEMPLATE.deliveryReminder,
    settingKey: MARKETPLACE_EMAIL_SETTING_KEY.deliveryReminder,
    mailTo: [params.toEmail],
    variables: deliveryVariables(params),
  });

  await createAppNotification({
    userId: params.organizationId,
    organizationId: params.organizationId,
    module: MODULE,
    type: "delivery_reminder",
    title: `Reminder: delivery on ${params.deliveryDate}`,
    body: `${params.city}, ${params.state}${params.deliveryTime ? ` · ${params.deliveryTime}` : ""}.`,
    link: "/company/orders",
  });
}
