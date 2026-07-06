/* eslint-disable no-console */
/**
 * Seed notification templates from Laravel into the Next.js (Prisma) database.
 * Run after migrations. Safe to run multiple times (upserts by id).
 *
 * Usage: node scripts/seed-notification-templates.js
 * Or: npm run db:seed:notification-templates
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// All notification templates from Laravel: NotificationsTableSeeder, Lead, Appointment, HRM, Recruitment
const NOTIFICATION_TEMPLATES = [
  // --- General ---
  { id: 1,  module: "general",     type: "mail", action: "New User",                          status: "on", permissions: "manage-users" },
  { id: 2,  module: "general",     type: "mail", action: "Customer Invoice Send",             status: "on", permissions: "invoice send" },
  { id: 3,  module: "general",     type: "mail", action: "Payment Reminder",                  status: "on", permissions: "invoice manage" },
  { id: 4,  module: "general",     type: "mail", action: "Invoice Payment Create",            status: "on", permissions: "invoice payment create" },
  { id: 5,  module: "general",     type: "mail", action: "Proposal Status Updated",           status: "on", permissions: "proposal send" },
  { id: 6,  module: "general",     type: "mail", action: "New Helpdesk Ticket",               status: "on", permissions: "helpdesk manage" },
  { id: 7,  module: "general",     type: "mail", action: "New Helpdesk Ticket Reply",         status: "on", permissions: "helpdesk manage" },
  { id: 8,  module: "general",     type: "mail", action: "Purchase Send",                     status: "on", permissions: "purchase send" },
  { id: 9,  module: "general",     type: "mail", action: "Purchase Payment Create",           status: "on", permissions: "purchase payment create" },
  // --- CRM / Lead ---
  { id: 10, module: "Lead",        type: "mail", action: "Deal Assigned",                     status: "on", permissions: "manage-deals" },
  { id: 11, module: "Lead",        type: "mail", action: "Deal Moved",                        status: "on", permissions: "deal-move" },
  { id: 12, module: "Lead",        type: "mail", action: "New Task",                          status: "on", permissions: "create-deal-tasks" },
  { id: 13, module: "Lead",        type: "mail", action: "Lead Assigned",                     status: "on", permissions: "manage-leads" },
  { id: 14, module: "Lead",        type: "mail", action: "Lead Moved",                        status: "on", permissions: "lead-move" },
  { id: 15, module: "Lead",        type: "mail", action: "Lead Emails",                       status: "on", permissions: "edit-leads" },
  { id: 16, module: "Lead",        type: "mail", action: "Deal Emails",                       status: "on", permissions: "edit-deals" },
  // --- Appointment ---
  { id: 17, module: "Appointment", type: "mail", action: "Appointment Booked",                status: "on", permissions: "manage-appointment" },
  { id: 18, module: "Appointment", type: "mail", action: "Appointment Callback",              status: "on", permissions: "manage-appointment" },
  { id: 19, module: "Appointment", type: "mail", action: "Appointment Status Update",         status: "on", permissions: "manage-appointment" },
  { id: 20, module: "Appointment", type: "mail", action: "Appointment Callback Status Update",status: "on", permissions: "manage-appointment" },
  // --- HRM ---
  { id: 21, module: "HRM",         type: "mail", action: "New Employee",                      status: "on", permissions: "manage-employees" },
  { id: 22, module: "HRM",         type: "mail", action: "Employee Contract Sent",            status: "on", permissions: "manage-contracts" },
  { id: 23, module: "HRM",         type: "mail", action: "Employee Leave Applied",            status: "on", permissions: "manage-leaves" },
  { id: 24, module: "HRM",         type: "mail", action: "Employee Leave Approved",           status: "on", permissions: "manage-leaves" },
  { id: 25, module: "HRM",         type: "mail", action: "Employee Leave Rejected",           status: "on", permissions: "manage-leaves" },
  { id: 26, module: "HRM",         type: "mail", action: "Payslip Sent",                      status: "on", permissions: "manage-payroll" },
  // --- Recruitment ---
  { id: 27, module: "Recruitment", type: "mail", action: "New Job Application",               status: "on", permissions: "manage-recruitment" },
  { id: 28, module: "Recruitment", type: "mail", action: "Interview Scheduled",               status: "on", permissions: "manage-recruitment" },
  { id: 29, module: "Recruitment", type: "mail", action: "Offer Letter Sent",                 status: "on", permissions: "manage-recruitment" },
  { id: 30, module: "Recruitment", type: "mail", action: "Candidate Selected",                status: "on", permissions: "manage-recruitment" },
  { id: 31, module: "Recruitment", type: "mail", action: "Candidate Rejected",                status: "on", permissions: "manage-recruitment" },
  // Distinct from id 5 "Proposal Status Updated": send flow uses template + settings key "Proposal Send".
  { id: 32, module: "general",     type: "mail", action: "Proposal Send",                      status: "on", permissions: "proposal send" },
];

// Default English content for notification_template_langs
const DEFAULT_CONTENT = {
  1:  { content: "Hello {name},\n\nYour account has been created successfully.\n\nEmail: {email}\nPassword: {password}\n\nPlease log in and change your password.\n\nRegards,\n{app_name}", variables: { name: "name", email: "email", password: "password", app_name: "app_name" } },
  2:  { content: "Hello {client_name},\n\nPlease find your invoice #{invoice_number} attached.\n\nAmount: {amount}\nDue Date: {due_date}\n\nRegards,\n{company_name}", variables: { client_name: "client_name", invoice_number: "invoice_number", amount: "amount", due_date: "due_date", company_name: "company_name" } },
  3:  { content: "Hello {client_name},\n\nThis is a reminder that invoice #{invoice_number} for {amount} is due on {due_date}.\n\nPlease make the payment at your earliest convenience.\n\nRegards,\n{company_name}", variables: { client_name: "client_name", invoice_number: "invoice_number", amount: "amount", due_date: "due_date", company_name: "company_name" } },
  4:  { content: "Hello {client_name},\n\nWe have received your payment of {amount} for invoice #{invoice_number}.\n\nThank you for your prompt payment.\n\nRegards,\n{company_name}", variables: { client_name: "client_name", invoice_number: "invoice_number", amount: "amount", company_name: "company_name" } },
  5:  { content: "Hello {client_name},\n\nThe status of your proposal #{proposal_number} has been updated to: {status}.\n\nRegards,\n{company_name}", variables: { client_name: "client_name", proposal_number: "proposal_number", status: "status", company_name: "company_name" } },
  6:  { content: "Hello {agent_name},\n\nA new helpdesk ticket has been submitted.\n\nTicket #: {ticket_number}\nSubject: {subject}\nPriority: {priority}\nSubmitted by: {client_name}\n\nPlease log in to respond.\n\nRegards,\n{company_name}", variables: { agent_name: "agent_name", ticket_number: "ticket_number", subject: "subject", priority: "priority", client_name: "client_name", company_name: "company_name" } },
  7:  { content: "Hello {name},\n\nA new reply has been added to ticket #{ticket_number}: {subject}.\n\nReply:\n{reply}\n\nPlease log in to view the full conversation.\n\nRegards,\n{company_name}", variables: { name: "name", ticket_number: "ticket_number", subject: "subject", reply: "reply", company_name: "company_name" } },
  8:  { content: "Hello {vendor_name},\n\nPurchase order #{purchase_number} has been sent to you.\n\nTotal Amount: {amount}\nExpected Delivery: {delivery_date}\n\nRegards,\n{company_name}", variables: { vendor_name: "vendor_name", purchase_number: "purchase_number", amount: "amount", delivery_date: "delivery_date", company_name: "company_name" } },
  9:  { content: "Hello {vendor_name},\n\nPayment of {amount} has been made for purchase order #{purchase_number}.\n\nThank you.\n\nRegards,\n{company_name}", variables: { vendor_name: "vendor_name", purchase_number: "purchase_number", amount: "amount", company_name: "company_name" } },
  // CRM
  10: { content: "Hello {user_name},\n\nA deal has been assigned to you.\n\nDeal: {deal_name}\nPipeline: {pipeline_name}\nAssigned by: {assigned_by}\n\nPlease log in to view the deal details.\n\nRegards,\n{company_name}", variables: { user_name: "user_name", deal_name: "deal_name", pipeline_name: "pipeline_name", assigned_by: "assigned_by", company_name: "company_name" } },
  11: { content: "Hello {user_name},\n\nDeal {deal_name} has been moved to {stage_name}.\n\nMoved by: {moved_by}\n\nRegards,\n{company_name}", variables: { user_name: "user_name", deal_name: "deal_name", stage_name: "stage_name", moved_by: "moved_by", company_name: "company_name" } },
  12: { content: "Hello {user_name},\n\nA new task has been assigned to you.\n\nTask: {task_name}\nDue Date: {due_date}\nAssigned by: {assigned_by}\n\nPlease log in to view the task.\n\nRegards,\n{company_name}", variables: { user_name: "user_name", task_name: "task_name", due_date: "due_date", assigned_by: "assigned_by", company_name: "company_name" } },
  13: { content: "Hello {user_name},\n\nA lead has been assigned to you.\n\nLead: {lead_name}\nPipeline: {pipeline_name}\nAssigned by: {assigned_by}\n\nPlease log in to view the lead details.\n\nRegards,\n{company_name}", variables: { user_name: "user_name", lead_name: "lead_name", pipeline_name: "pipeline_name", assigned_by: "assigned_by", company_name: "company_name" } },
  14: { content: "Hello {user_name},\n\nLead {lead_name} has been moved to {stage_name}.\n\nMoved by: {moved_by}\n\nRegards,\n{company_name}", variables: { user_name: "user_name", lead_name: "lead_name", stage_name: "stage_name", moved_by: "moved_by", company_name: "company_name" } },
  15: { content: "Hello {lead_name},\n\n{message}\n\nRegards,\n{company_name}", variables: { lead_name: "lead_name", message: "message", company_name: "company_name" } },
  16: { content: "Hello {client_name},\n\n{message}\n\nRegards,\n{company_name}", variables: { client_name: "client_name", message: "message", company_name: "company_name" } },
  // Appointment
  17: { content: "Hello {client_name},\n\nYour appointment has been booked successfully.\n\nService: {service_name}\nDate: {appointment_date}\nTime: {appointment_time}\nAgent: {agent_name}\n\nRegards,\n{company_name}", variables: { client_name: "client_name", service_name: "service_name", appointment_date: "appointment_date", appointment_time: "appointment_time", agent_name: "agent_name", company_name: "company_name" } },
  18: { content: "Hello {client_name},\n\nYour appointment callback has been scheduled.\n\nService: {service_name}\nDate: {appointment_date}\nTime: {appointment_time}\n\nRegards,\n{company_name}", variables: { client_name: "client_name", service_name: "service_name", appointment_date: "appointment_date", appointment_time: "appointment_time", company_name: "company_name" } },
  19: { content: "Hello {client_name},\n\nThe status of your appointment has been updated.\n\nService: {service_name}\nDate: {appointment_date}\nNew Status: {status}\n\nRegards,\n{company_name}", variables: { client_name: "client_name", service_name: "service_name", appointment_date: "appointment_date", status: "status", company_name: "company_name" } },
  20: { content: "Hello {client_name},\n\nThe status of your appointment callback has been updated.\n\nService: {service_name}\nDate: {appointment_date}\nNew Status: {status}\n\nRegards,\n{company_name}", variables: { client_name: "client_name", service_name: "service_name", appointment_date: "appointment_date", status: "status", company_name: "company_name" } },
  // HRM
  21: { content: "Hello {employee_name},\n\nWelcome to {company_name}!\n\nYour employee account has been created.\n\nEmployee ID: {employee_id}\nDepartment: {department}\nDesignation: {designation}\nJoining Date: {joining_date}\n\nPlease log in to access your employee portal.\n\nRegards,\n{company_name}", variables: { employee_name: "employee_name", company_name: "company_name", employee_id: "employee_id", department: "department", designation: "designation", joining_date: "joining_date" } },
  22: { content: "Hello {employee_name},\n\nYour employment contract has been sent for review and signing.\n\nContract Type: {contract_type}\nStart Date: {start_date}\nEnd Date: {end_date}\n\nPlease review and sign at your earliest convenience.\n\nRegards,\n{company_name}", variables: { employee_name: "employee_name", contract_type: "contract_type", start_date: "start_date", end_date: "end_date", company_name: "company_name" } },
  23: { content: "Hello {manager_name},\n\nA leave application has been submitted by {employee_name}.\n\nLeave Type: {leave_type}\nFrom: {from_date}\nTo: {to_date}\nTotal Days: {total_days}\nReason: {reason}\n\nPlease log in to approve or reject the request.\n\nRegards,\n{company_name}", variables: { manager_name: "manager_name", employee_name: "employee_name", leave_type: "leave_type", from_date: "from_date", to_date: "to_date", total_days: "total_days", reason: "reason", company_name: "company_name" } },
  24: { content: "Hello {employee_name},\n\nYour leave request has been approved.\n\nLeave Type: {leave_type}\nFrom: {from_date}\nTo: {to_date}\nTotal Days: {total_days}\nApproved by: {approved_by}\n\nEnjoy your time off!\n\nRegards,\n{company_name}", variables: { employee_name: "employee_name", leave_type: "leave_type", from_date: "from_date", to_date: "to_date", total_days: "total_days", approved_by: "approved_by", company_name: "company_name" } },
  25: { content: "Hello {employee_name},\n\nUnfortunately, your leave request has been rejected.\n\nLeave Type: {leave_type}\nFrom: {from_date}\nTo: {to_date}\nRejected by: {rejected_by}\nReason: {reason}\n\nPlease contact HR for more information.\n\nRegards,\n{company_name}", variables: { employee_name: "employee_name", leave_type: "leave_type", from_date: "from_date", to_date: "to_date", rejected_by: "rejected_by", reason: "reason", company_name: "company_name" } },
  26: { content: "Hello {employee_name},\n\nYour payslip for {month} {year} is ready.\n\nNet Salary: {net_salary}\nPay Period: {pay_period}\n\nPlease log in to your employee portal to view and download your payslip.\n\nRegards,\n{company_name}", variables: { employee_name: "employee_name", month: "month", year: "year", net_salary: "net_salary", pay_period: "pay_period", company_name: "company_name" } },
  // Recruitment
  27: { content: "Hello {recruiter_name},\n\nA new job application has been received.\n\nJob Position: {job_title}\nApplicant: {applicant_name}\nEmail: {applicant_email}\nApplication Date: {application_date}\n\nPlease log in to review the application.\n\nRegards,\n{company_name}", variables: { recruiter_name: "recruiter_name", job_title: "job_title", applicant_name: "applicant_name", applicant_email: "applicant_email", application_date: "application_date", company_name: "company_name" } },
  28: { content: "Hello {applicant_name},\n\nWe are pleased to inform you that an interview has been scheduled for you.\n\nJob Position: {job_title}\nInterview Date: {interview_date}\nInterview Time: {interview_time}\nInterview Type: {interview_type}\nInterviewer: {interviewer_name}\n\nPlease confirm your availability.\n\nRegards,\n{company_name}", variables: { applicant_name: "applicant_name", job_title: "job_title", interview_date: "interview_date", interview_time: "interview_time", interview_type: "interview_type", interviewer_name: "interviewer_name", company_name: "company_name" } },
  29: { content: "Hello {applicant_name},\n\nCongratulations! We are pleased to extend an offer of employment.\n\nJob Position: {job_title}\nDepartment: {department}\nStart Date: {start_date}\nSalary: {salary}\n\nPlease review the attached offer letter and respond by {response_deadline}.\n\nRegards,\n{company_name}", variables: { applicant_name: "applicant_name", job_title: "job_title", department: "department", start_date: "start_date", salary: "salary", response_deadline: "response_deadline", company_name: "company_name" } },
  30: { content: "Hello {applicant_name},\n\nCongratulations! We are pleased to inform you that you have been selected for the position of {job_title}.\n\nNext Steps: Our HR team will contact you shortly regarding onboarding.\n\nWe look forward to having you on our team!\n\nRegards,\n{company_name}", variables: { applicant_name: "applicant_name", job_title: "job_title", company_name: "company_name" } },
  31: { content: "Hello {applicant_name},\n\nThank you for your interest in the {job_title} position at {company_name} and for the time you invested in our selection process.\n\nAfter careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.\n\nWe appreciate your interest and encourage you to apply for future openings.\n\nRegards,\n{company_name}", variables: { applicant_name: "applicant_name", job_title: "job_title", company_name: "company_name" } },
  32: { content: "Hello {proposal_name},\n\nPlease review proposal #{proposal_number}.\n\n{proposal_url}\n\nRegards,\n{company_name}", variables: { proposal_name: "proposal_name", proposal_number: "proposal_number", proposal_url: "proposal_url", company_name: "company_name" } },
};

function toBigInt(n) {
  return BigInt(n);
}

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT PRIMARY KEY,
      module TEXT NULL,
      type TEXT NULL,
      action TEXT NULL,
      status TEXT NULL,
      permissions TEXT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NULL
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS notification_template_langs (
      id BIGSERIAL PRIMARY KEY,
      parent_id BIGINT NOT NULL,
      lang TEXT NULL,
      module TEXT NULL,
      content TEXT NULL,
      variables JSONB NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NULL
    );
  `);
}

async function main() {
  console.log("Seeding notification templates from Laravel...");

  const existing = await prisma.notification.findMany({ select: { id: true } }).catch(async (err) => {
    if (err.code === "P2021" || err.message?.includes("does not exist")) {
      console.log("Creating notifications tables...");
      await ensureTable();
      return [];
    }
    throw err;
  });

  const existingIds = new Set(existing.map((r) => r.id.toString()));

  for (const row of NOTIFICATION_TEMPLATES) {
    const id = toBigInt(row.id);
    const data = {
      module: row.module,
      type: row.type,
      action: row.action,
      status: row.status,
      permissions: row.permissions,
      updatedAt: new Date(),
    };
    if (existingIds.has(String(row.id))) {
      await prisma.notification.update({ where: { id }, data });
      console.log("  Updated:", row.action, `(${row.module})`);
    } else {
      await prisma.notification.create({ data: { id, ...data, createdAt: new Date() } });
      console.log("  Created:", row.action, `(${row.module})`);
    }
  }

  console.log("\nSeeding default English content for notification_template_langs...");

  for (const [idStr, { content, variables }] of Object.entries(DEFAULT_CONTENT)) {
    const parentId = toBigInt(Number(idStr));
    const existing = await prisma.notificationTemplateLang.findFirst({
      where: { parentId, lang: "en" },
      select: { id: true },
    });
    if (existing?.id) {
      await prisma.notificationTemplateLang.update({
        where: { id: existing.id },
        data: { content, variables, updatedAt: new Date() },
      });
      console.log("  Lang updated: id=", idStr, "(en)");
    } else {
      await prisma.notificationTemplateLang.create({
        data: { parentId, lang: "en", content, variables, createdAt: new Date() },
      });
      console.log("  Lang created: id=", idStr, "(en)");
    }
  }

  console.log("\nDone. Notification templates seeded (", NOTIFICATION_TEMPLATES.length, "templates,", Object.keys(DEFAULT_CONTENT).length, "langs).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
