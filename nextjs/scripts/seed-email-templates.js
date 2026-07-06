/* eslint-disable no-console */
/**
 * Seed email templates from Laravel (app + packages) into the Next.js database.
 * Ensures email_templates and email_template_langs exist, then upserts all 22 templates.
 * Safe to run multiple times (skips if name+module already exists).
 *
 * Usage: node scripts/seed-email-templates.js
 * Or: npm run db:seed:email-templates
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const newUserWelcome = require("./lib/new-user-welcome-email-content");

const DEFAULT_FROM = "Paper Flight";

// All 22 email templates: General (9), Recruitment (2), Appointment (4), Lead/CRM (7).
// Each: { name, moduleName, subject, variables (JSON string), langContent: { en: "<p>...</p>", ... } }
const TEMPLATES = [
  // --- General (from database/seeders/EmailTemplatesSeeder.php) ---
  {
    name: "New User",
    moduleName: "General",
    subject: newUserWelcome.SUBJECT,
    variables: JSON.stringify(newUserWelcome.VARIABLES),
    langContent: {
      en: newUserWelcome.HTML_EN,
    },
  },
  {
    name: "Customer Invoice Send",
    moduleName: "General",
    subject: "Customer Invoice Send",
    variables: '{"App Name":"app_name","Company Name":"company_name","App Url":"app_url","Invoice Name":"invoice_name","Invoice Number":"invoice_number","Download Invoice":"invoice_url","Pay Invoice":"pay_invoice_url"}',
    langContent: {
      en: '<p>Hi, {invoice_name}</p><p>Welcome to {app_name}</p><p>Please see attached invoice number {invoice_number}. Simply click the button below to download or pay.</p><p><a href="{invoice_url}">Download Invoice</a> | <a href="{pay_invoice_url}">Pay Invoice</a></p><p>Thank you,<br />{company_name}</p>',
    },
  },
  {
    name: "Payment Reminder",
    moduleName: "General",
    subject: "Payment Reminder",
    variables: '{"App Name":"app_name","Company Name":"company_name","App Url":"app_url","Invoice Number":"invoice_number","Invoice Url":"invoice_url"}',
    langContent: {
      en: '<p>Hello,</p><p>This is a reminder for invoice {invoice_number}. Please pay at your earliest convenience.</p><p><a href="{invoice_url}">View Invoice</a></p><p>Thanks,<br />{company_name}</p>',
    },
  },
  {
    name: "Invoice Payment Create",
    moduleName: "General",
    subject: "Invoice Payment Received",
    variables: '{"App Name":"app_name","Company Name":"company_name","App Url":"app_url","Invoice Number":"invoice_number","Amount":"amount"}',
    langContent: {
      en: '<p>Hello,</p><p>We have received your payment for invoice {invoice_number}. Amount: {amount}.</p><p>Thank you,<br />{company_name}</p>',
    },
  },
  {
    name: "Proposal Send",
    moduleName: "General",
    subject: "Proposal Send",
    variables: '{"App Name":"app_name","Company Name":"company_name","App Url":"app_url","Proposal Number":"proposal_number","Proposal Url":"proposal_url"}',
    langContent: {
      en: '<p>Hello,</p><p>Please find our proposal {proposal_number} attached. <a href="{proposal_url}">View Proposal</a>.</p><p>Thanks,<br />{company_name}</p>',
    },
  },
  {
    name: "New Helpdesk Ticket",
    moduleName: "General",
    subject: "New Helpdesk Ticket",
    variables: '{"App Name":"app_name","Company Name":"company_name","App Url":"app_url","Ticket Number":"ticket_number","Ticket Subject":"ticket_subject","Ticket Description":"ticket_description"}',
    langContent: {
      en: '<p>Hello,</p><p>A new helpdesk ticket has been created. Ticket #{ticket_number}: {ticket_subject}</p><p>{ticket_description}</p><p>Thanks,<br />{company_name}</p>',
    },
  },
  {
    name: "New Helpdesk Ticket Reply",
    moduleName: "General",
    subject: "Helpdesk Ticket Reply",
    variables: '{"App Name":"app_name","Company Name":"company_name","App Url":"app_url","Ticket Number":"ticket_number","Reply Message":"reply_message"}',
    langContent: {
      en: '<p>Hello,</p><p>There is a new reply on your helpdesk ticket #{ticket_number}.</p><p>{reply_message}</p><p>Thanks,<br />{company_name}</p>',
    },
  },
  {
    name: "Purchase Send",
    moduleName: "General",
    subject: "Purchase Order",
    variables: '{"App Name":"app_name","Company Name":"company_name","App Url":"app_url","Purchase Number":"purchase_number","Purchase Url":"purchase_url"}',
    langContent: {
      en: '<p>Hello,</p><p>Please find purchase order {purchase_number}. <a href="{purchase_url}">View Purchase</a>.</p><p>Thanks,<br />{company_name}</p>',
    },
  },
  {
    name: "Purchase Payment Create",
    moduleName: "General",
    subject: "Purchase Payment Received",
    variables: '{"App Name":"app_name","Company Name":"company_name","App Url":"app_url","Purchase Number":"purchase_number","Amount":"amount"}',
    langContent: {
      en: '<p>Hello,</p><p>Payment received for purchase {purchase_number}. Amount: {amount}.</p><p>Thanks,<br />{company_name}</p>',
    },
  },
  // --- Recruitment ---
  {
    name: "Application Received",
    moduleName: "Recruitment",
    subject: "Application Received - {job_title}",
    variables: '{"App Name":"app_name","Company Name":"company_name","App Url":"app_url","Candidate Name":"candidate_name","Candidate Email":"candidate_email","Job Title":"job_title","Tracking ID":"tracking_id","Tracking Link":"tracking_link"}',
    langContent: {
      en: '<p>Hello {candidate_name},</p><p>Thank you for your application for the position of <strong>{job_title}</strong>!</p><p>We have successfully received your application and it is now under review.</p><p><strong>Application Details:</strong></p><ul><li>Position: {job_title}</li><li>Tracking ID: {tracking_id}</li></ul><p>You can track the status of your application using your tracking ID at: {tracking_link}</p><p>Thank you for your interest in {company_name}.</p>',
    },
  },
  {
    name: "Offer Letter",
    moduleName: "Recruitment",
    subject: "Job Offer - {position}",
    variables: '{"App Name":"app_name","Company Name":"company_name","Candidate Name":"candidate_name","Position":"position","Salary":"salary","Start Date":"start_date","Download URL":"download_url"}',
    langContent: {
      en: '<p><strong>Dear {candidate_name},</strong></p><p>We are pleased to offer you the position of <strong>{position}</strong> at {company_name}.</p><p><strong>Position:</strong> {position}<br /><strong>Salary:</strong> {salary}<br /><strong>Start Date:</strong> {start_date}</p><p style="text-align: center; margin: 30px 0;"><a href="{download_url}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Download Offer Letter</a></p><p><strong>Best regards,</strong><br /><strong>HR Department</strong><br /><strong>{company_name}</strong></p>',
    },
  },
  // --- Appointment ---
  {
    name: "Appointment Booked",
    moduleName: "Appointment",
    subject: "Appointment Confirmation - {appointment_name}",
    variables: '{"App Name":"app_name","Company Name":"company_name","App Url":"app_url","Appointment Name":"appointment_name","Appointment User Name":"appointment_user_name","Appointment User Email":"appointment_user_email","Appointment Date":"appointment_date","Appointment Time":"appointment_time","Appointment Number":"appointment_number"}',
    langContent: {
      en: '<p>Hello {appointment_user_name},</p><p>Your appointment has been successfully booked!</p><p><strong>Appointment Details:</strong></p><ul><li>Appointment: {appointment_name}</li><li>Date: {appointment_date}</li><li>Time: {appointment_time}</li><li>Appointment Number: {appointment_number}</li></ul><p>Thank you for choosing {company_name}.</p>',
    },
  },
  {
    name: "Appointment Callback",
    moduleName: "Appointment",
    subject: "Callback Request Received - {appointment_name}",
    variables: '{"App Name":"app_name","Company Name":"company_name","App Url":"app_url","Appointment Name":"appointment_name","Appointment User Name":"appointment_user_name","Callback Date":"callback_date","Callback Time":"callback_time","Callback Reason":"callback_reason"}',
    langContent: {
      en: '<p>Hello {appointment_user_name},</p><p>We have received your callback request.</p><p><strong>Callback Details:</strong></p><ul><li>Appointment: {appointment_name}</li><li>Requested Date: {callback_date}</li><li>Requested Time: {callback_time}</li><li>Reason: {callback_reason}</li></ul><p>We will review your request and get back to you soon. Thank you for choosing {company_name}.</p>',
    },
  },
  {
    name: "Appointment Status Update",
    moduleName: "Appointment",
    subject: "Appointment Status Update - {appointment_name}",
    variables: '{"App Name":"app_name","Company Name":"company_name","App Url":"app_url","Appointment Name":"appointment_name","Appointment User Name":"appointment_user_name","Appointment Date":"appointment_date","Appointment Time":"appointment_time","Appointment Number":"appointment_number","Appointment Status":"appointment_status"}',
    langContent: {
      en: '<p>Hello {appointment_user_name},</p><p>Your appointment status has been updated.</p><p><strong>Appointment Details:</strong></p><ul><li>Appointment: {appointment_name}</li><li>Date: {appointment_date}</li><li>Time: {appointment_time}</li><li>Appointment Number: {appointment_number}</li><li>Status: {appointment_status}</li></ul><p>Thank you for choosing {company_name}.</p>',
    },
  },
  {
    name: "Appointment Callback Status Update",
    moduleName: "Appointment",
    subject: "Callback Status Update - {appointment_name}",
    variables: '{"App Name":"app_name","Company Name":"company_name","App Url":"app_url","Appointment Name":"appointment_name","Appointment User Name":"appointment_user_name","Callback Date":"callback_date","Callback Time":"callback_time","Callback Reason":"callback_reason","Callback Status":"callback_status"}',
    langContent: {
      en: '<p>Hello {appointment_user_name},</p><p>Your callback request status has been updated.</p><p><strong>Callback Details:</strong></p><ul><li>Appointment: {appointment_name}</li><li>Requested Date: {callback_date}</li><li>Requested Time: {callback_time}</li><li>Reason: {callback_reason}</li><li>Status: {callback_status}</li></ul><p>Thank you for choosing {company_name}.</p>',
    },
  },
  // --- Lead (CRM) ---
  {
    name: "Deal Assigned",
    moduleName: "CRM",
    subject: "New Deal Assign",
    variables: '{"Deal Name":"deal_name","Deal Pipeline":"deal_pipeline","Deal Stage":"deal_stage","Deal Status":"deal_status","Deal Price":"deal_price","App Url":"app_url","App Name":"app_name","Company Name":"company_name","Email":"email"}',
    langContent: {
      en: '<p>Hello,</p><p>New Deal has been assigned to you.</p><p><b>Deal Name</b>: {deal_name}<br /><b>Deal Pipeline</b>: {deal_pipeline}<br /><b>Deal Stage</b>: {deal_stage}<br /><b>Deal Status</b>: {deal_status}<br /><b>Deal Price</b>: {deal_price}</p><p>Thank you</p><p>{company_name}</p>',
    },
  },
  {
    name: "Deal Moved",
    moduleName: "CRM",
    subject: "Deal has been Moved",
    variables: '{"Deal Name":"deal_name","Deal Pipeline":"deal_pipeline","Deal Stage":"deal_stage","Deal Status":"deal_status","Deal Price":"deal_price","Deal Old Stage":"deal_old_stage","Deal New Stage":"deal_new_stage","App Url":"app_url","App Name":"app_name","Company Name":"company_name"}',
    langContent: {
      en: '<p>Hello,</p><p>A Deal has been moved from {deal_old_stage} to {deal_new_stage}.</p><p><b>Deal Name</b>: {deal_name}<br /><b>Deal Pipeline</b>: {deal_pipeline}<br /><b>Deal Stage</b>: {deal_stage}<br /><b>Deal Status</b>: {deal_status}<br /><b>Deal Price</b>: {deal_price}</p><p>Thank you</p><p>{company_name}</p>',
    },
  },
  {
    name: "New Task",
    moduleName: "CRM",
    subject: "New Task Assign",
    variables: '{"Task Name":"task_name","Task Priority":"task_priority","Task Status":"task_status","Deal Name":"deal_name","App Url":"app_url","App Name":"app_name","Company Name":"company_name","Email":"email","Password":"password"}',
    langContent: {
      en: '<p>Hello,</p><p>New Task has been assigned to you.</p><p><b>Task Name</b>: {task_name}<br /><b>Task Priority</b>: {task_priority}<br /><b>Task Status</b>: {task_status}<br /><b>Task Deal</b>: {deal_name}</p><p>Thank you</p><p>{company_name}</p>',
    },
  },
  {
    name: "Lead Assigned",
    moduleName: "CRM",
    subject: "New Lead Assign",
    variables: '{"Lead Name":"lead_name","Lead Email":"lead_email","Lead Pipeline":"lead_pipeline","Lead Stage":"lead_stage","App Url":"app_url","App Name":"app_name","Company Name":"company_name","Email":"email","Password":"password"}',
    langContent: {
      en: '<p>Hello,</p><p>New Lead has been assigned to you.</p><p><b>Lead Name</b>: {lead_name}<br /><b>Lead Email</b>: {lead_email}<br /><b>Lead Pipeline</b>: {lead_pipeline}<br /><b>Lead Stage</b>: {lead_stage}</p><p>Thank you</p><p>{company_name}</p>',
    },
  },
  {
    name: "Lead Moved",
    moduleName: "CRM",
    subject: "Lead has been Moved",
    variables: '{"Lead Name":"lead_name","Lead Email":"lead_email","Lead Pipeline":"lead_pipeline","Lead Stage":"lead_stage","Lead Old Stage":"lead_old_stage","Lead New Stage":"lead_new_stage","App Url":"app_url","App Name":"app_name","Company Name":"company_name"}',
    langContent: {
      en: '<p>Hello,</p><p>A Lead has been moved from {lead_old_stage} to {lead_new_stage}.</p><p><b>Lead Name</b>: {lead_name}<br /><b>Lead Email</b>: {lead_email}<br /><b>Lead Pipeline</b>: {lead_pipeline}<br /><b>Lead Stage</b>: {lead_stage}</p><p>Thank you</p><p>{company_name}</p>',
    },
  },
  {
    name: "Lead Emails",
    moduleName: "CRM",
    subject: "Lead Email Create",
    variables: '{"Lead Name":"lead_name","Lead Subject":"lead_email_subject","Lead Description":"lead_email_description","App Url":"app_url","App Name":"app_name","Company Name":"company_name"}',
    langContent: {
      en: '<p>Hello,<br />Welcome to {app_name}.</p><p><b>Lead Name</b>: {lead_name}</p><p><strong>Subject</strong>: {lead_email_subject}</p><p><strong>Description</strong>: {lead_email_description}</p><p>Thanks,<br />{app_name}</p><p>{company_name}</p>',
    },
  },
  {
    name: "Deal Emails",
    moduleName: "CRM",
    subject: "Deal Email Create",
    variables: '{"Deal Name":"deal_name","Deal Subject":"deal_email_subject","Deal Description":"deal_email_description","App Url":"app_url","App Name":"app_name","Company Name":"company_name"}',
    langContent: {
      en: '<p>Hello,<br />Welcome to {app_name}.</p><p><b>Deal Name</b>: {deal_name}</p><p><strong>Subject</strong>: {deal_email_subject}</p><p><strong>Description</strong>: {deal_email_description}</p><p>Thanks,<br />{app_name}</p><p>{company_name}</p>',
    },
  },

  // --- Marketplace ---
  {
    name: "Marketplace Order Confirmation",
    moduleName: "Marketplace",
    subject: "Your marketplace order {order_number} is confirmed",
    variables: '{"App Name":"app_name","Company Name":"company_name","App Url":"app_url","Name":"name","Order Number":"order_number","Order Total":"order_total","Order Status":"order_status"}',
    langContent: {
      en: '<p>Hi {name},</p><p>Thank you for your order on {app_name}.</p><p><strong>Order number:</strong> {order_number}<br /><strong>Total:</strong> {order_total}<br /><strong>Status:</strong> {order_status}</p><p>We will notify you as your order progresses through delivery.</p><p>Thanks,<br />{company_name}</p>',
    },
  },
];

async function ensureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NULL,
      "from" TEXT NULL,
      module_name TEXT NULL,
      creator_id BIGINT NULL,
      created_by BIGINT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NULL
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS email_templates_module_name_idx ON email_templates(module_name);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS email_template_langs (
      id BIGSERIAL PRIMARY KEY,
      parent_id BIGINT NOT NULL,
      lang TEXT NULL,
      subject TEXT NULL,
      content TEXT NULL,
      module_name TEXT NULL,
      variables JSONB NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NULL
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS email_template_langs_parent_id_idx ON email_template_langs(parent_id);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS email_template_langs_parent_id_lang_idx ON email_template_langs(parent_id, lang);
  `);
}

function parseVariables(varsStr) {
  try {
    return typeof varsStr === "string" ? JSON.parse(varsStr) : varsStr;
  } catch {
    return {};
  }
}

async function main() {
  console.log("Seeding email templates from Laravel (General, Recruitment, Appointment, CRM)...");

  const existing = await prisma.emailTemplate.findMany({ select: { id: true, name: true, moduleName: true } }).catch(async (err) => {
    if (err.code === "P2021" || err.message?.includes("does not exist")) {
      console.log("Creating email_templates tables...");
      await ensureTables();
      return [];
    }
    throw err;
  });

  const key = (n, m) => `${n}|${m}`;
  const existingSet = new Set(existing.map((r) => key(r.name ?? "", r.moduleName ?? "")));

  let created = 0;
  let skipped = 0;

  for (const t of TEMPLATES) {
    if (existingSet.has(key(t.name, t.moduleName))) {
      skipped++;
      continue;
    }
    const variablesObj = parseVariables(t.variables);
    const template = await prisma.emailTemplate.create({
      data: {
        name: t.name,
        from: DEFAULT_FROM,
        moduleName: t.moduleName,
      },
    });
    const parentId = template.id;
    for (const [lang, content] of Object.entries(t.langContent)) {
      await prisma.emailTemplateLang.create({
        data: {
          parentId,
          lang,
          subject: t.subject,
          content,
          moduleName: t.moduleName,
          variables: variablesObj,
        },
      });
    }
    created++;
    existingSet.add(key(t.name, t.moduleName));
  }

  console.log(`Done. Created ${created} email templates, skipped ${skipped} (already exist).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
