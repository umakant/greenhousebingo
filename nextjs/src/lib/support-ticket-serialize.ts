/**
 * Prisma returns bigint ids; JSON responses must use string ids for the client.
 */

export function serializeStTicketCategory(c: { id: bigint; name: string; color: string }) {
  return { id: String(c.id), name: c.name, color: c.color };
}

export function serializeKbCategory(c: { id: bigint; name: string }) {
  return { id: String(c.id), name: c.name };
}

export function serializeStFaq(row: {
  id: bigint;
  title: string;
  answer: string | null;
  createdBy?: bigint | null;
  createdAt: Date;
  updatedAt?: Date | null;
}) {
  return {
    id: String(row.id),
    title: row.title,
    answer: row.answer,
    createdBy: row.createdBy != null ? String(row.createdBy) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? null,
  };
}

export function serializeStTicket(t: {
  id: bigint;
  ticketCode: string;
  accountType: string;
  name: string;
  email: string;
  subject: string;
  status: string;
  description: string | null;
  attachments: unknown;
  createdAt: Date;
  updatedAt: Date | null;
  createdBy: bigint | null;
  organizationId?: bigint | null;
  websiteId?: bigint | null;
  storefrontCustomerId?: bigint | null;
  storefrontOrderId?: bigint | null;
  assignedStaffUserId?: bigint | null;
  lmsCourseId?: bigint | null;
  lmsLessonId?: bigint | null;
  lmsStudentUserId?: bigint | null;
  category: { id: bigint; name: string; color: string } | null;
}) {
  return {
    id: String(t.id),
    ticketCode: t.ticketCode,
    accountType: t.accountType,
    name: t.name,
    email: t.email,
    subject: t.subject,
    status: t.status,
    description: t.description,
    attachments: t.attachments,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    createdBy: t.createdBy != null ? String(t.createdBy) : null,
    organizationId: t.organizationId != null ? String(t.organizationId) : null,
    websiteId: t.websiteId != null ? String(t.websiteId) : null,
    storefrontCustomerId: t.storefrontCustomerId != null ? String(t.storefrontCustomerId) : null,
    storefrontOrderId: t.storefrontOrderId != null ? String(t.storefrontOrderId) : null,
    assignedStaffUserId: t.assignedStaffUserId != null ? String(t.assignedStaffUserId) : null,
    lmsCourseId: t.lmsCourseId != null ? String(t.lmsCourseId) : null,
    lmsLessonId: t.lmsLessonId != null ? String(t.lmsLessonId) : null,
    lmsStudentUserId: t.lmsStudentUserId != null ? String(t.lmsStudentUserId) : null,
    category: t.category ? serializeStTicketCategory(t.category) : null,
  };
}
