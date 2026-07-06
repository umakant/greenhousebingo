/* eslint-disable no-console */
/**
 * Seed Marketplace (Water Ice Express) email templates + notification toggles.
 * Mirrors seed-em-notification-templates.js.
 *
 * Usage: npm run db:seed:marketplace-notifications
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const MODULE = "Marketplace";
const DEFAULT_FROM = "Water Ice Express";

// Unique notification ids (901-907 EM, 910-925 LMS, 930-938 Affiliate → 950+ is free).
const NOTIFICATION_TEMPLATES = [
  { id: 950, action: "Marketplace Order Confirmation", permissions: "marketplace.orders.view" },
  { id: 951, action: "Marketplace City Ready To Schedule", permissions: "marketplace.delivery_queue.view" },
  { id: 952, action: "Marketplace Delivery Scheduled", permissions: "marketplace.orders.view" },
  { id: 953, action: "Marketplace Delivery Reminder", permissions: "marketplace.orders.view" },
];

const EMAIL_TEMPLATES = [
  {
    name: "Marketplace Order Confirmation",
    subject: "Order {order_number} confirmed — {vendor_name}",
    content:
      '<p>Hi {name},</p>' +
      '<p>Thank you, <strong>{company_name}</strong>! Your Water Ice Express order has been received and paid.</p>' +
      '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
      '<tr><td style="padding:4px 0;color:#6b7280">Order number</td><td style="text-align:right"><strong>{order_number}</strong></td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">Vendor</td><td style="text-align:right">{vendor_name}</td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">Delivery area</td><td style="text-align:right">{city}, {state}</td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">Bucket count</td><td style="text-align:right">{bucket_count}</td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">Amount paid</td><td style="text-align:right"><strong>{amount_paid}</strong></td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">Payment</td><td style="text-align:right">{order_status}</td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">Delivery status</td><td style="text-align:right">{delivery_status}</td></tr>' +
      "</table>" +
      "<p style=\"margin-top:12px\"><strong>Items</strong></p>{order_products}" +
      '<p style="margin-top:16px;color:#6b7280">Your order is queued and will be scheduled once your city reaches the delivery minimum.</p>' +
      '<p><a href="{order_url}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">View order</a></p>' +
      "<p>Thanks,<br />{vendor_name}</p>",
  },
  {
    name: "Marketplace City Ready To Schedule",
    subject: "{city}, {state} is ready to schedule ({current_bucket_total} buckets)",
    content:
      "<p>Hi {name},</p>" +
      "<p>A city queue has reached its delivery minimum and is ready to schedule.</p>" +
      '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
      '<tr><td style="padding:4px 0;color:#6b7280">Vendor</td><td style="text-align:right">{vendor_name}</td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">City / state</td><td style="text-align:right"><strong>{city}, {state}</strong></td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">Current bucket total</td><td style="text-align:right"><strong>{current_bucket_total}</strong></td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">Required minimum</td><td style="text-align:right">{required_minimum}</td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">Companies in queue</td><td style="text-align:right">{company_count}</td></tr>' +
      "</table>" +
      '<p style="margin-top:16px"><a href="{city_queue_url}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open city queue</a></p>',
  },
  {
    name: "Marketplace Delivery Scheduled",
    subject: "Your Water Ice delivery is scheduled — {city}, {state}",
    content:
      "<p>Hi {name},</p>" +
      "<p>Great news, <strong>{company_name}</strong>! Your delivery in {city}, {state} has been scheduled.</p>" +
      '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
      '<tr><td style="padding:4px 0;color:#6b7280">Order(s)</td><td style="text-align:right">{order_number}</td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">Delivery date</td><td style="text-align:right"><strong>{delivery_date}</strong></td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">Delivery time</td><td style="text-align:right">{delivery_time}</td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">Address</td><td style="text-align:right">{delivery_address}</td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">Driver</td><td style="text-align:right">{driver_info}</td></tr>' +
      "</table>" +
      "<p style=\"margin-top:12px;color:#6b7280\">Notes: {delivery_notes}</p>" +
      "<p>Thanks,<br />{vendor_name}</p>",
  },
  {
    name: "Marketplace Delivery Reminder",
    subject: "Reminder: your delivery is on {delivery_date} — {city}, {state}",
    content:
      "<p>Hi {name},</p>" +
      "<p>This is a reminder that your Water Ice Express delivery for <strong>{company_name}</strong> is coming up.</p>" +
      '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
      '<tr><td style="padding:4px 0;color:#6b7280">Order(s)</td><td style="text-align:right">{order_number}</td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">Delivery date</td><td style="text-align:right"><strong>{delivery_date}</strong></td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">Delivery time</td><td style="text-align:right">{delivery_time}</td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">Address</td><td style="text-align:right">{delivery_address}</td></tr>' +
      '<tr><td style="padding:4px 0;color:#6b7280">Driver</td><td style="text-align:right">{driver_info}</td></tr>' +
      "</table>" +
      "<p>See you soon,<br />{vendor_name}</p>",
  },
];

const VARIABLES = {
  "App Name": "app_name",
  "Company Name": "company_name",
  Name: "name",
  "Order Number": "order_number",
  "Order Status": "order_status",
  "Order URL": "order_url",
  "Vendor Name": "vendor_name",
  "Order Products": "order_products",
  "Amount Paid": "amount_paid",
  "Bucket Count": "bucket_count",
  City: "city",
  State: "state",
  "Delivery Status": "delivery_status",
  "Current Bucket Total": "current_bucket_total",
  "Required Minimum": "required_minimum",
  "Company Count": "company_count",
  "City Queue URL": "city_queue_url",
  "Delivery Date": "delivery_date",
  "Delivery Time": "delivery_time",
  "Delivery Address": "delivery_address",
  "Driver Info": "driver_info",
  "Delivery Notes": "delivery_notes",
};

async function seedNotifications() {
  for (const row of NOTIFICATION_TEMPLATES) {
    const existing = await prisma.notification.findUnique({ where: { id: BigInt(row.id) } });
    if (!existing) {
      await prisma.notification.create({
        data: {
          id: BigInt(row.id),
          module: MODULE,
          type: "mail",
          action: row.action,
          status: "on",
          permissions: row.permissions,
        },
      });
      console.log(`Created notification ${row.action}`);
    }
    const lang = await prisma.notificationTemplateLang.findFirst({
      where: { parentId: BigInt(row.id), lang: "en" },
    });
    if (!lang) {
      await prisma.notificationTemplateLang.create({
        data: {
          parentId: BigInt(row.id),
          lang: "en",
          content: `Email for ${row.action}`,
          createdAt: new Date(),
        },
      });
    }
  }
}

async function seedEmailTemplates() {
  let nextTemplateId = null;
  let nextLangId = null;
  for (const tpl of EMAIL_TEMPLATES) {
    let row = await prisma.emailTemplate.findFirst({ where: { name: tpl.name } });
    if (!row) {
      if (nextTemplateId == null) {
        const max = await prisma.emailTemplate.aggregate({ _max: { id: true } });
        nextTemplateId = (max._max.id ?? 0n) + 1n;
      }
      row = await prisma.emailTemplate.create({
        data: {
          id: nextTemplateId++,
          name: tpl.name,
          from: DEFAULT_FROM,
          moduleName: MODULE,
        },
      });
      console.log(`Created email template ${tpl.name}`);
    }
    const lang = await prisma.emailTemplateLang.findFirst({
      where: { parentId: row.id, lang: "en" },
    });
    if (!lang) {
      if (nextLangId == null) {
        const maxLang = await prisma.emailTemplateLang.aggregate({ _max: { id: true } });
        nextLangId = (maxLang._max.id ?? 0n) + 1n;
      }
      await prisma.emailTemplateLang.create({
        data: {
          id: nextLangId++,
          parentId: row.id,
          lang: "en",
          subject: tpl.subject,
          content: tpl.content,
          moduleName: MODULE,
          variables: VARIABLES,
        },
      });
      console.log(`  Added EN content for ${tpl.name}`);
    }
  }
}

async function seedCompanyToggles(companyId) {
  const max = await prisma.setting.aggregate({ _max: { id: true } });
  let nextId = (max._max.id ?? 0n) + 1n;
  for (const tpl of EMAIL_TEMPLATES) {
    const existing = await prisma.setting.findFirst({
      where: { createdBy: companyId, key: tpl.name },
    });
    if (!existing) {
      await prisma.setting.create({
        data: { id: nextId++, key: tpl.name, value: "on", createdBy: companyId, isPublic: true },
      });
      console.log(`Enabled setting toggle: ${tpl.name}`);
    } else if (!["on", "true", "1"].includes(String(existing.value ?? "").trim().toLowerCase())) {
      await prisma.setting.update({ where: { id: existing.id }, data: { value: "on" } });
      console.log(`Turned on setting: ${tpl.name}`);
    }
  }
}

async function main() {
  await seedNotifications();
  await seedEmailTemplates();
  const company = await prisma.user.findFirst({
    where: { type: { contains: "company", mode: "insensitive" } },
    select: { id: true },
  });
  if (company) await seedCompanyToggles(company.id);
  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
