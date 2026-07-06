import { prisma } from "@/lib/prisma";
import { getSettingsForOwner } from "@/lib/settings-service";
import { isCompanyEmailNotificationEnabled, sendTemplatedEmailAsync } from "@/lib/send-templated-email";

/** Queues "Proposal Send" when company notification is enabled and the client user has an email. */
export function queueProposalSendEmail(companyId: bigint, proposalId: bigint): void {
  void (async () => {
    const proposal = await prisma.salesProposal.findFirst({
      where: { id: proposalId, createdBy: companyId },
    });
    if (!proposal) return;

    const settings = await getSettingsForOwner(companyId);
    if (!isCompanyEmailNotificationEnabled(settings, "Proposal Send")) return;

    const user = await prisma.user.findUnique({
      where: { id: proposal.customerId },
      select: { email: true, name: true },
    });
    const email = user?.email?.trim();
    if (!email?.includes("@")) return;

    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const proposalUrl = base ? `${base}/sales-proposals/${proposalId.toString()}` : "-";

    sendTemplatedEmailAsync({
      templateName: "Proposal Send",
      mailTo: [email],
      ownerId: companyId,
      variables: {
        proposal_name: (user?.name ?? "").trim() || email,
        proposal_number: proposal.proposalNumber,
        proposal_url: proposalUrl,
      },
    });
  })().catch(() => undefined);
}
