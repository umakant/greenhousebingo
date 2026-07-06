import "server-only";

import { randomBytes } from "crypto";

import { decimalToNumber, getBrandOwnershipSummary, updateOwnershipRequestForHolder } from "@/lib/brand-ownership-service";
import {
  appBaseUrl,
  primaryBrandHolderEmail,
  sendOwnershipApprovalRequiredEmail,
  sendOwnershipApprovedEmail,
  sendOwnershipRejectedEmail,
  sendOwnershipTransferApprovedEmail,
  sendOwnershipTransferRequestEmail,
  sendPartnershipInvitationEmail,
} from "@/lib/partnership-notification-service";
import { prisma } from "@/lib/prisma";

export const AGREEMENT_STATUS = {
  PENDING_SIGNATURE: "pending_signature",
  PENDING_BRAND_APPROVAL: "pending_brand_approval",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

function token(): string {
  return randomBytes(32).toString("hex");
}

async function nextAgreementId(): Promise<bigint> {
  const agg = await prisma.ownershipPartnershipAgreement.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

export function agreementAppBaseUrl(origin?: string): string {
  return appBaseUrl(origin);
}

export async function createPartnershipAgreementForHolder(
  holderId: bigint,
  appUrl: string,
  invitedBy?: string | null,
) {
  const holder = await prisma.ownershipBrandHolder.findUnique({
    where: { id: holderId },
    include: { brand: { select: { name: true } } },
  });
  if (!holder) throw new Error("Holder not found.");
  if (holder.isPrimaryBrandHolder) return null;
  const email = (holder.email ?? "").trim();
  if (!email.includes("@")) return null;

  const existing = await prisma.ownershipPartnershipAgreement.findUnique({ where: { holderId } });
  if (existing) return existing;

  const agreement = await prisma.ownershipPartnershipAgreement.create({
    data: {
      id: await nextAgreementId(),
      holderId,
      signToken: token(),
      brandApprovalToken: token(),
      status: AGREEMENT_STATUS.PENDING_SIGNATURE,
    },
  });

  await prisma.ownershipBrandHolder.update({
    where: { id: holderId },
    data: { status: "pending_agreement", updatedAt: new Date() },
  });

  const base = agreementAppBaseUrl(appUrl);
  const signUrl = `${base}/partnership-agreement/${agreement.signToken}`;
  const current = decimalToNumber(holder.currentOwnershipPercent);
  const minimum = decimalToNumber(holder.minimumOwnershipPercent);

  await sendPartnershipInvitationEmail({
    partnerEmail: email,
    partnerName: holder.name,
    brandName: holder.brand.name,
    currentOwnershipPercent: current,
    minimumOwnershipPercent: minimum,
    signUrl,
    invitedBy,
  }).catch((err) => {
    console.warn("[PartnershipAgreement] Invite email failed:", err);
  });

  return agreement;
}

export async function getAgreementBySignToken(signToken: string) {
  const agreement = await prisma.ownershipPartnershipAgreement.findUnique({
    where: { signToken },
    include: {
      holder: {
        include: { brand: { select: { id: true, name: true, logo: true } } },
      },
    },
  });
  if (!agreement) return null;

  const holder = agreement.holder;
  const summary = await getBrandOwnershipSummary(holder.brandId);

  const request = await prisma.ownershipBrandRequest.findFirst({
    where: { holderId: holder.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, requestedByUserId: true },
  });

  let invitedBy = "Administrator";
  if (request?.requestedByUserId) {
    const user = await prisma.user.findUnique({
      where: { id: request.requestedByUserId },
      select: { name: true, email: true },
    });
    invitedBy = (user?.name ?? user?.email ?? invitedBy).trim() || invitedBy;
  }

  const year = agreement.createdAt.getFullYear();
  const requestId = `OWN-${year}-${String(agreement.id).padStart(6, "0")}`;
  const linkExpiresAt = new Date(agreement.createdAt);
  linkExpiresAt.setDate(linkExpiresAt.getDate() + 7);

  return {
    id: agreement.id.toString(),
    status: agreement.status,
    signedAt: agreement.signedAt?.toISOString() ?? null,
    signedName: agreement.signedName,
    partnerName: holder.name,
    partnerEmail: holder.email,
    brandName: holder.brand.name,
    brandLogo: holder.brand.logo,
    currentOwnershipPercent: decimalToNumber(holder.currentOwnershipPercent),
    minimumOwnershipPercent: decimalToNumber(holder.minimumOwnershipPercent),
    availableOwnershipPercent: summary?.availableOwnership ?? 0,
    requestId,
    invitedBy,
    sentOn: agreement.createdAt.toISOString(),
    linkExpiresAt: linkExpiresAt.toISOString(),
  };
}

export async function signPartnershipAgreement(input: {
  signToken: string;
  signedName: string;
  signatureData: string;
  appUrl: string;
}) {
  const agreement = await prisma.ownershipPartnershipAgreement.findUnique({
    where: { signToken: input.signToken },
    include: {
      holder: { include: { brand: { select: { id: true, name: true } } } },
    },
  });
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status !== AGREEMENT_STATUS.PENDING_SIGNATURE) {
    throw new Error("This agreement has already been signed.");
  }
  if (!input.signedName.trim()) throw new Error("Printed name is required.");
  if (!input.signatureData.trim()) throw new Error("Signature is required.");

  const now = new Date();
  await prisma.ownershipPartnershipAgreement.update({
    where: { id: agreement.id },
    data: {
      status: AGREEMENT_STATUS.PENDING_BRAND_APPROVAL,
      signedName: input.signedName.trim(),
      signatureData: input.signatureData.trim(),
      signedAt: now,
      updatedAt: now,
    },
  });

  await prisma.ownershipBrandHolder.update({
    where: { id: agreement.holderId },
    data: { status: "pending_brand_approval", updatedAt: now },
  });

  await updateOwnershipRequestForHolder(agreement.holderId, {
    status: "pending_brand_approval",
    notes: "Partner signed the agreement — awaiting brand approval.",
  }).catch(() => null);

  const base = agreementAppBaseUrl(input.appUrl);
  const holder = agreement.holder;
  const current = decimalToNumber(holder.currentOwnershipPercent);
  const minimum = decimalToNumber(holder.minimumOwnershipPercent);
  const approvalUrl = `${base}/partnership-agreement/approve/${agreement.brandApprovalToken}`;
  const partnersUrl = `${base}/partnerships/partners`;
  const summary = await getBrandOwnershipSummary(holder.brandId);

  const primaryHolder = await primaryBrandHolderEmail(holder.brandId);

  if (primaryHolder) {
    await sendOwnershipApprovalRequiredEmail({
      brandContactEmail: primaryHolder.email,
      brandContactName: primaryHolder.name,
      partnerName: holder.name,
      brandName: holder.brand.name,
      currentOwnershipPercent: current,
      minimumOwnershipPercent: minimum,
      availableOwnershipPercent: summary?.availableOwnership ?? 0,
      approvalUrl,
    }).catch((err) => console.warn("[PartnershipAgreement] Brand approval email failed:", err));
  }

  const partnerEmail = (holder.email ?? "").trim();
  if (partnerEmail.includes("@")) {
    await sendOwnershipTransferRequestEmail({
      partnerEmail,
      partnerName: holder.name,
      brandName: holder.brand.name,
      currentOwnershipPercent: current,
      minimumOwnershipPercent: minimum,
      fromPartners: "Brand ownership pool",
      actionUrl: partnersUrl,
    }).catch((err) => console.warn("[PartnershipAgreement] Transfer request email failed:", err));
  }

  return { ok: true as const };
}

export async function getAgreementByBrandApprovalToken(brandApprovalToken: string) {
  const agreement = await prisma.ownershipPartnershipAgreement.findUnique({
    where: { brandApprovalToken },
    include: {
      holder: {
        include: { brand: { select: { id: true, name: true, logo: true } } },
      },
    },
  });
  if (!agreement) return null;

  const holder = agreement.holder;
  return {
    id: agreement.id.toString(),
    status: agreement.status,
    signedName: agreement.signedName,
    signedAt: agreement.signedAt?.toISOString() ?? null,
    signatureData: agreement.signatureData,
    partnerName: holder.name,
    partnerEmail: holder.email,
    brandName: holder.brand.name,
    brandLogo: holder.brand.logo,
    currentOwnershipPercent: decimalToNumber(holder.currentOwnershipPercent),
    minimumOwnershipPercent: decimalToNumber(holder.minimumOwnershipPercent),
  };
}

export async function getPartnershipAgreementForHolder(holderId: bigint) {
  const agreement = await prisma.ownershipPartnershipAgreement.findUnique({
    where: { holderId },
    include: {
      holder: {
        include: { brand: { select: { id: true, name: true, logo: true } } },
      },
    },
  });
  if (!agreement) return null;

  const holder = agreement.holder;
  return {
    id: agreement.id.toString(),
    status: agreement.status,
    holderStatus: holder.status,
    signedName: agreement.signedName,
    signedAt: agreement.signedAt?.toISOString() ?? null,
    signatureData: agreement.signatureData,
    brandRejectionNotes: agreement.brandRejectionNotes,
    partnerName: holder.name,
    partnerEmail: holder.email,
    brandName: holder.brand.name,
    brandLogo: holder.brand.logo,
    currentOwnershipPercent: decimalToNumber(holder.currentOwnershipPercent),
    minimumOwnershipPercent: decimalToNumber(holder.minimumOwnershipPercent),
  };
}

export async function approvePartnershipAgreement(input: {
  brandApprovalToken?: string;
  holderId?: bigint;
  approvedByUserId?: bigint | null;
  approvedByName?: string | null;
  appUrl?: string;
}) {
  const agreement = input.brandApprovalToken
    ? await prisma.ownershipPartnershipAgreement.findUnique({
        where: { brandApprovalToken: input.brandApprovalToken },
      })
    : input.holderId
      ? await prisma.ownershipPartnershipAgreement.findUnique({ where: { holderId: input.holderId } })
      : null;

  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status !== AGREEMENT_STATUS.PENDING_BRAND_APPROVAL) {
    throw new Error("Agreement is not awaiting brand approval.");
  }

  const now = new Date();
  await prisma.ownershipPartnershipAgreement.update({
    where: { id: agreement.id },
    data: {
      status: AGREEMENT_STATUS.APPROVED,
      brandApprovedAt: now,
      brandApprovedByUserId: input.approvedByUserId ?? null,
      brandApprovedByName: input.approvedByName?.trim() || null,
      updatedAt: now,
    },
  });

  await prisma.ownershipBrandHolder.update({
    where: { id: agreement.holderId },
    data: { status: "active", updatedAt: now },
  });

  const { ensureReferralPartnerForOwnershipHolder } = await import("@/lib/partner-service");
  await ensureReferralPartnerForOwnershipHolder(agreement.holderId).catch((err) => {
    console.warn("[PartnershipAgreement] Referral link creation skipped:", err);
  });

  await updateOwnershipRequestForHolder(agreement.holderId, {
    status: "approved",
    notes: "Partnership agreement approved.",
  }).catch(() => null);

  const holder = await prisma.ownershipBrandHolder.findUnique({
    where: { id: agreement.holderId },
    include: { brand: { select: { name: true } } },
  });
  if (!holder) return { ok: true as const };

  const base = agreementAppBaseUrl(input.appUrl);
  const partnersUrl = `${base}/partnerships/partners`;
  const current = decimalToNumber(holder.currentOwnershipPercent);
  const minimum = decimalToNumber(holder.minimumOwnershipPercent);
  const partnerEmail = (holder.email ?? "").trim();

  if (partnerEmail.includes("@")) {
    await sendOwnershipTransferApprovedEmail({
      partnerEmail,
      partnerName: holder.name,
      brandName: holder.brand.name,
      newOwnership: current,
      minimumOwnership: minimum,
      actionUrl: partnersUrl,
    }).catch((err) => console.warn("[PartnershipAgreement] Transfer approved email failed:", err));

    await sendOwnershipApprovedEmail({
      to: [partnerEmail],
      recipientName: holder.name,
      brandName: holder.brand.name,
      partnerName: holder.name,
      newOwnership: current,
      minimumOwnership: minimum,
      actionUrl: partnersUrl,
    }).catch((err) => console.warn("[PartnershipAgreement] Partner approved email failed:", err));
  }

  const primary = await primaryBrandHolderEmail(holder.brandId);
  if (primary) {
    await sendOwnershipApprovedEmail({
      to: [primary.email],
      recipientName: primary.name,
      brandName: holder.brand.name,
      partnerName: holder.name,
      newOwnership: current,
      minimumOwnership: minimum,
      actionUrl: partnersUrl,
    }).catch((err) => console.warn("[PartnershipAgreement] Brand approved email failed:", err));
  }

  return { ok: true as const };
}

export async function rejectPartnershipAgreement(input: {
  holderId: bigint;
  notes?: string | null;
  rejectedByUserId?: bigint | null;
  appUrl?: string;
}) {
  const agreement = await prisma.ownershipPartnershipAgreement.findUnique({
    where: { holderId: input.holderId },
    include: {
      holder: { include: { brand: { select: { name: true } } } },
    },
  });
  if (!agreement) throw new Error("Agreement not found.");
  if (
    agreement.status !== AGREEMENT_STATUS.PENDING_SIGNATURE &&
    agreement.status !== AGREEMENT_STATUS.PENDING_BRAND_APPROVAL
  ) {
    throw new Error("Agreement cannot be rejected in its current state.");
  }

  const now = new Date();
  await prisma.ownershipPartnershipAgreement.update({
    where: { id: agreement.id },
    data: {
      status: AGREEMENT_STATUS.REJECTED,
      brandRejectionNotes: input.notes?.trim() || null,
      brandApprovedByUserId: input.rejectedByUserId ?? null,
      updatedAt: now,
    },
  });

  await prisma.ownershipBrandHolder.update({
    where: { id: input.holderId },
    data: { status: "rejected", updatedAt: now },
  });

  await updateOwnershipRequestForHolder(input.holderId, {
    status: "rejected",
    notes: input.notes?.trim() || "Partnership agreement rejected.",
  }).catch(() => null);

  const base = agreementAppBaseUrl(input.appUrl);
  const partnersUrl = `${base}/partnerships/partners`;
  const holder = agreement.holder;
  const current = decimalToNumber(holder.currentOwnershipPercent);
  const reason = input.notes?.trim() || agreement.brandRejectionNotes || "Partnership agreement rejected.";
  const recipients: string[] = [];

  const partnerEmail = (holder.email ?? "").trim();
  if (partnerEmail.includes("@")) recipients.push(partnerEmail);

  const primary = await primaryBrandHolderEmail(holder.brandId);
  if (primary?.email) recipients.push(primary.email);

  if (recipients.length > 0) {
    await sendOwnershipRejectedEmail({
      to: recipients,
      recipientName: holder.name,
      brandName: holder.brand.name,
      partnerName: holder.name,
      proposedOwnership: current,
      reason,
      actionUrl: partnersUrl,
    }).catch((err) => console.warn("[PartnershipAgreement] Rejection email failed:", err));
  }

  return { ok: true as const };
}

export async function resendPartnershipAgreementInvite(holderId: bigint, appUrl: string) {
  const agreement = await prisma.ownershipPartnershipAgreement.findUnique({
    where: { holderId },
    include: {
      holder: { include: { brand: { select: { name: true } } } },
    },
  });
  if (!agreement) throw new Error("No agreement found.");
  if (agreement.status !== AGREEMENT_STATUS.PENDING_SIGNATURE) {
    throw new Error("Agreement is no longer awaiting signature.");
  }

  const email = (agreement.holder.email ?? "").trim();
  if (!email.includes("@")) throw new Error("Partner email is missing.");

  const base = agreementAppBaseUrl(appUrl);
  const signUrl = `${base}/partnership-agreement/${agreement.signToken}`;
  const result = await sendPartnershipInvitationEmail({
    partnerEmail: email,
    partnerName: agreement.holder.name,
    brandName: agreement.holder.brand.name,
    currentOwnershipPercent: decimalToNumber(agreement.holder.currentOwnershipPercent),
    minimumOwnershipPercent: decimalToNumber(agreement.holder.minimumOwnershipPercent),
    signUrl,
  });

  if (!result.ok) throw new Error(result.error ?? "Failed to send email.");
  return { ok: true as const };
}
