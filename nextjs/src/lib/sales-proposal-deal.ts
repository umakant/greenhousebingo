import { prisma } from "@/lib/prisma";
import { formatCrmLeadFullName } from "@/lib/crm-lead-name";

type LeadForDeal = {
  firstName: string;
  lastName: string | null;
  company: string | null;
  name: string | null;
};

function defaultDealName(lead: LeadForDeal): string {
  const company = lead.company?.trim();
  if (company) return company;
  const full = lead.name?.trim() || formatCrmLeadFullName(lead.firstName, lead.lastName);
  if (full && full !== "—") return `${full} opportunity`;
  return "New sales opportunity";
}

/**
 * When a proposal has a lead but no deal selected, reuse an open deal for that lead
 * or create one automatically so CRM tracking stays linked without extra user steps.
 */
export async function resolveOrCreateProposalDeal(
  companyId: bigint,
  leadId: bigint,
  lead: LeadForDeal,
): Promise<bigint> {
  const existing = await prisma.crmDeal.findFirst({
    where: { createdBy: companyId, leadId, status: "open" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.crmDeal.create({
    data: {
      name: defaultDealName(lead),
      status: "open",
      leadId,
      createdBy: companyId,
    },
    select: { id: true },
  });
  return created.id;
}
