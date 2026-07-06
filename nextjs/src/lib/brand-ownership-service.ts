import "server-only";

import { Decimal } from "@prisma/client/runtime/library";

import {
  type OwnershipValidationResult,
  roundOwnership,
  validateOwnershipChange,
  validateOwnershipPercentInputs,
} from "@/lib/brand-ownership-validation";
import {
  appBaseUrl,
  notifySuperadminsOwnershipConflict,
  primaryBrandHolderEmail,
  sendNewBrandCreatedEmail,
  sendOwnershipChangeRequestEmail,
  sendPartnerRemovedEmail,
  superadminEmails,
} from "@/lib/partnership-notification-service";
import { prisma } from "@/lib/prisma";

function isPrismaUnknownFieldError(err: unknown, field: string): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.includes(`Unknown argument \`${field}\``);
}

async function syncHolderFirstLastName(
  holderId: bigint,
  firstName?: string | null,
  lastName?: string | null,
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE ownership_brand_holders
    SET first_name = ${firstName?.trim() || null},
        last_name = ${lastName?.trim() || null},
        updated_at = NOW()
    WHERE id = ${holderId}
  `;
}

async function syncBrandFirstLastName(
  brandId: bigint,
  firstName?: string | null,
  lastName?: string | null,
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE ownership_brands
    SET first_name = ${firstName?.trim() || null},
        last_name = ${lastName?.trim() || null},
        updated_at = NOW()
    WHERE id = ${brandId}
  `;
}

async function createOwnershipBrandHolder(input: {
  id: bigint;
  brandId: bigint;
  partnerId?: bigint | null;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  referralCode?: string | null;
  currentOwnershipPercent: Decimal;
  minimumOwnershipPercent: Decimal;
  isPrimaryBrandHolder: boolean;
  status: string;
  payoutMethod?: string | null;
  payoutEmail?: string | null;
  notes?: string | null;
}) {
  const base = {
    id: input.id,
    brandId: input.brandId,
    partnerId: input.partnerId ?? null,
    name: input.name.trim(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    referralCode: input.referralCode?.trim() || null,
    currentOwnershipPercent: input.currentOwnershipPercent,
    minimumOwnershipPercent: input.minimumOwnershipPercent,
    isPrimaryBrandHolder: input.isPrimaryBrandHolder,
    status: input.status,
    payoutMethod: input.payoutMethod?.trim() || null,
    payoutEmail: input.payoutEmail?.trim() || null,
    notes: input.notes?.trim() || null,
  };

  try {
    return await prisma.ownershipBrandHolder.create({
      data: {
        ...base,
        firstName: input.firstName?.trim() || null,
        lastName: input.lastName?.trim() || null,
      },
    });
  } catch (err) {
    if (!isPrismaUnknownFieldError(err, "firstName")) throw err;
    const holder = await prisma.ownershipBrandHolder.create({ data: base });
    await syncHolderFirstLastName(holder.id, input.firstName, input.lastName);
    return holder;
  }
}

async function createOwnershipBrandRecord(input: {
  id: bigint;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  slug: string;
  logo?: string | null;
  status: string;
  notes?: string | null;
}) {
  const base = {
    id: input.id,
    name: input.name.trim(),
    slug: input.slug,
    logo: input.logo?.trim() || null,
    status: input.status,
    notes: input.notes?.trim() || null,
  };

  try {
    return await prisma.ownershipBrand.create({
      data: {
        ...base,
        firstName: input.firstName?.trim() || null,
        lastName: input.lastName?.trim() || null,
      },
    });
  } catch (err) {
    if (!isPrismaUnknownFieldError(err, "firstName")) throw err;
    const brand = await prisma.ownershipBrand.create({ data: base });
    await syncBrandFirstLastName(brand.id, input.firstName, input.lastName);
    return brand;
  }
}

export type { OwnershipValidationResult } from "@/lib/brand-ownership-validation";
export {
  roundOwnership,
  validateOwnershipChange,
  validateOwnershipPercentInputs,
} from "@/lib/brand-ownership-validation";

export type BrandOwnershipSummary = {
  brandId: string;
  totalOwnership: number;
  availableOwnership: number;
  protectedOwnership: number;
  partnerCount: number;
  holders: Array<{
    id: string;
    name: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    referralCode: string | null;
    currentOwnershipPercent: number;
    minimumOwnershipPercent: number;
    isPrimaryBrandHolder: boolean;
    status: string;
    payoutMethod: string | null;
    payoutEmail: string | null;
    notes: string | null;
    partnerId: string | null;
    companyCount: number;
    createdAt: string;
  }>;
};

const MAX_OWNERSHIP = 100;

export function decimalToNumber(value: Decimal | number | string | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Decimal) return value.toNumber();
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function slugifyBrandName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "brand";
}

async function nextId(model: "brand" | "holder" | "history" | "request"): Promise<bigint> {
  switch (model) {
    case "brand": {
      const agg = await prisma.ownershipBrand.aggregate({ _max: { id: true } });
      return (agg._max.id ?? 0n) + 1n;
    }
    case "holder": {
      const agg = await prisma.ownershipBrandHolder.aggregate({ _max: { id: true } });
      return (agg._max.id ?? 0n) + 1n;
    }
    case "history": {
      const agg = await prisma.ownershipBrandHistory.aggregate({ _max: { id: true } });
      return (agg._max.id ?? 0n) + 1n;
    }
    case "request": {
      const agg = await prisma.ownershipBrandRequest.aggregate({ _max: { id: true } });
      return (agg._max.id ?? 0n) + 1n;
    }
  }
}

async function uniqueBrandSlug(base: string): Promise<string> {
  let slug = slugifyBrandName(base);
  let n = 0;
  while (true) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const exists = await prisma.ownershipBrand.findFirst({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
    n += 1;
  }
}

async function holderCompanyCount(partnerId: bigint | null): Promise<number> {
  if (!partnerId) return 0;
  return prisma.partnerReferral.count({ where: { partnerId, companyId: { not: null } } });
}

export async function createOwnershipHistoryRecord(input: {
  brandId: bigint;
  holderId?: bigint | null;
  action: string;
  oldCurrent?: number | null;
  newCurrent?: number | null;
  oldMinimum?: number | null;
  newMinimum?: number | null;
  changedByUserId?: bigint | null;
  notes?: string | null;
}) {
  await prisma.ownershipBrandHistory.create({
    data: {
      id: await nextId("history"),
      brandId: input.brandId,
      holderId: input.holderId ?? null,
      action: input.action,
      oldCurrentOwnershipPercent:
        input.oldCurrent != null ? new Decimal(input.oldCurrent) : null,
      newCurrentOwnershipPercent:
        input.newCurrent != null ? new Decimal(input.newCurrent) : null,
      oldMinimumOwnershipPercent:
        input.oldMinimum != null ? new Decimal(input.oldMinimum) : null,
      newMinimumOwnershipPercent:
        input.newMinimum != null ? new Decimal(input.newMinimum) : null,
      changedByUserId: input.changedByUserId ?? null,
      notes: input.notes ?? null,
    },
  });
}

export async function getBrandOwnershipSummary(brandId: bigint): Promise<BrandOwnershipSummary | null> {
  const brand = await prisma.ownershipBrand.findUnique({
    where: { id: brandId },
    include: {
      holders: { where: { status: "active" }, orderBy: [{ isPrimaryBrandHolder: "desc" }, { createdAt: "asc" }] },
    },
  });
  if (!brand) return null;

  const holders = await Promise.all(
    brand.holders.map(async (h) => ({
      id: h.id.toString(),
      name: h.name,
      firstName: h.firstName,
      lastName: h.lastName,
      email: h.email,
      phone: h.phone,
      referralCode: h.referralCode,
      currentOwnershipPercent: decimalToNumber(h.currentOwnershipPercent),
      minimumOwnershipPercent: decimalToNumber(h.minimumOwnershipPercent),
      isPrimaryBrandHolder: h.isPrimaryBrandHolder,
      status: h.status,
      payoutMethod: h.payoutMethod,
      payoutEmail: h.payoutEmail,
      notes: h.notes,
      partnerId: h.partnerId?.toString() ?? null,
      companyCount: await holderCompanyCount(h.partnerId),
      createdAt: h.createdAt.toISOString(),
    })),
  );

  const totalOwnership = roundOwnership(
    holders.reduce((sum, h) => sum + h.currentOwnershipPercent, 0),
  );
  const protectedOwnership = roundOwnership(
    holders.reduce((sum, h) => sum + h.minimumOwnershipPercent, 0),
  );

  return {
    brandId: brand.id.toString(),
    totalOwnership,
    availableOwnership: roundOwnership(Math.max(0, MAX_OWNERSHIP - totalOwnership)),
    protectedOwnership,
    partnerCount: holders.filter((h) => !h.isPrimaryBrandHolder).length,
    holders,
  };
}

export async function validateBrandOwnershipChange(
  brandId: bigint,
  holderId: bigint | null,
  requestedCurrentOwnership: number,
  requestedMinimumOwnership: number,
): Promise<OwnershipValidationResult> {
  const holders = await prisma.ownershipBrandHolder.findMany({
    where: { brandId, status: "active" },
    select: { id: true, currentOwnershipPercent: true },
  });
  return validateOwnershipChange(
    holders.map((h) => ({
      id: h.id.toString(),
      currentOwnershipPercent: decimalToNumber(h.currentOwnershipPercent),
    })),
    holderId?.toString() ?? null,
    requestedCurrentOwnership,
    requestedMinimumOwnership,
  );
}

export async function createBrandWithInitialOwner(input: {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  logo?: string | null;
  status?: string;
  notes?: string | null;
  initialOwnerName: string;
  initialOwnershipPercent?: number;
  initialMinimumOwnershipPercent?: number;
  changedByUserId?: bigint | null;
}) {
  const brandId = await nextId("brand");
  const slug = await uniqueBrandSlug(input.name);
  const current = input.initialOwnershipPercent ?? MAX_OWNERSHIP;
  const minimum = input.initialMinimumOwnershipPercent ?? MAX_OWNERSHIP;

  const validation = validateOwnershipChange([], null, current, minimum);
  if (!validation.isValid) {
    throw new Error(validation.conflictMessage ?? validation.fieldErrors[0] ?? "Invalid ownership.");
  }

  const brand = await createOwnershipBrandRecord({
    id: brandId,
    name: input.name.trim(),
    firstName: input.firstName,
    lastName: input.lastName,
    slug,
    logo: input.logo,
    status: input.status ?? "active",
    notes: input.notes,
  });

  const holder = await prisma.ownershipBrandHolder.create({
    data: {
      id: await nextId("holder"),
      brandId: brand.id,
      name: input.initialOwnerName.trim(),
      currentOwnershipPercent: new Decimal(current),
      minimumOwnershipPercent: new Decimal(minimum),
      isPrimaryBrandHolder: true,
      status: "active",
    },
  });

  await createOwnershipHistoryRecord({
    brandId: brand.id,
    action: "brand_created",
    newCurrent: current,
    newMinimum: minimum,
    changedByUserId: input.changedByUserId ?? null,
    notes: `Brand "${brand.name}" created with primary holder.`,
  });

  await createOwnershipHistoryRecord({
    brandId: brand.id,
    holderId: holder.id,
    action: "holder_added",
    newCurrent: current,
    newMinimum: minimum,
    changedByUserId: input.changedByUserId ?? null,
    notes: `Primary brand holder "${holder.name}" added.`,
  });

  const base = appBaseUrl();
  const brandUrl = `${base}/partnerships/brands`;
  const admins = await superadminEmails();
  if (admins.length > 0) {
    await sendNewBrandCreatedEmail({
      to: admins,
      recipientName: "Administrator",
      brandName: brand.name,
      primaryHolderName: holder.name,
      currentOwnership: current,
      minimumOwnership: minimum,
      actionUrl: brandUrl,
    }).catch((err) => console.warn("[BrandOwnership] New brand email failed:", err));
  }

  return brand;
}

export async function addOwnershipPartner(input: {
  brandId: bigint;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  referralCode?: string | null;
  currentOwnershipPercent: number;
  minimumOwnershipPercent: number;
  status?: string;
  payoutMethod?: string | null;
  payoutEmail?: string | null;
  notes?: string | null;
  partnerId?: bigint | null;
  changedByUserId?: bigint | null;
}) {
  const validation = await validateBrandOwnershipChange(
    input.brandId,
    null,
    input.currentOwnershipPercent,
    input.minimumOwnershipPercent,
  );
  if (!validation.isValid) {
    const err = new Error(validation.conflictMessage ?? validation.fieldErrors[0] ?? "Invalid ownership.");
    (err as Error & { validation: OwnershipValidationResult }).validation = validation;
    throw err;
  }

  const holder = await createOwnershipBrandHolder({
    id: await nextId("holder"),
    brandId: input.brandId,
    partnerId: input.partnerId ?? null,
    name: input.name.trim(),
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    referralCode: input.referralCode,
    currentOwnershipPercent: new Decimal(input.currentOwnershipPercent),
    minimumOwnershipPercent: new Decimal(input.minimumOwnershipPercent),
    isPrimaryBrandHolder: false,
    status: input.status ?? "active",
    payoutMethod: input.payoutMethod,
    payoutEmail: input.payoutEmail,
    notes: input.notes,
  });

  await createOwnershipHistoryRecord({
    brandId: input.brandId,
    holderId: holder.id,
    action: "holder_added",
    newCurrent: input.currentOwnershipPercent,
    newMinimum: input.minimumOwnershipPercent,
    changedByUserId: input.changedByUserId ?? null,
    notes: input.notes ?? null,
  });

  return holder;
}

export async function updateOwnershipPartner(input: {
  holderId: bigint;
  currentOwnershipPercent: number;
  minimumOwnershipPercent: number;
  status?: string;
  notes?: string | null;
  changedByUserId?: bigint | null;
}) {
  const existing = await prisma.ownershipBrandHolder.findUnique({ where: { id: input.holderId } });
  if (!existing) throw new Error("Ownership holder not found.");

  const validation = await validateBrandOwnershipChange(
    existing.brandId,
    existing.id,
    input.currentOwnershipPercent,
    input.minimumOwnershipPercent,
  );
  if (!validation.isValid) {
    const err = new Error(validation.conflictMessage ?? validation.fieldErrors[0] ?? "Invalid ownership.");
    (err as Error & { validation: OwnershipValidationResult }).validation = validation;
    throw err;
  }

  const updated = await prisma.ownershipBrandHolder.update({
    where: { id: existing.id },
    data: {
      currentOwnershipPercent: new Decimal(input.currentOwnershipPercent),
      minimumOwnershipPercent: new Decimal(input.minimumOwnershipPercent),
      status: input.status ?? existing.status,
      notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
      updatedAt: new Date(),
    },
  });

  const oldCurrent = decimalToNumber(existing.currentOwnershipPercent);
  const oldMinimum = decimalToNumber(existing.minimumOwnershipPercent);

  if (oldCurrent !== input.currentOwnershipPercent || oldMinimum !== input.minimumOwnershipPercent) {
    await createOwnershipHistoryRecord({
      brandId: existing.brandId,
      holderId: existing.id,
      action: "ownership_updated",
      oldCurrent,
      newCurrent: input.currentOwnershipPercent,
      oldMinimum,
      newMinimum: input.minimumOwnershipPercent,
      changedByUserId: input.changedByUserId ?? null,
      notes: input.notes ?? null,
    });

    const brand = await prisma.ownershipBrand.findUnique({
      where: { id: existing.brandId },
      select: { name: true },
    });
    const brandName = brand?.name ?? "Brand";
    const changeType =
      input.currentOwnershipPercent > oldCurrent
        ? "Increase"
        : input.currentOwnershipPercent < oldCurrent
          ? "Decrease"
          : "Minimum adjustment";
    const base = appBaseUrl();
    const actionUrl = `${base}/partnerships/partners`;
    const recipients: string[] = [];
    const partnerEmail = (existing.email ?? "").trim();
    if (partnerEmail.includes("@")) recipients.push(partnerEmail);
    const primary = await primaryBrandHolderEmail(existing.brandId);
    if (primary?.email && !recipients.includes(primary.email)) recipients.push(primary.email);

    if (recipients.length > 0) {
      await sendOwnershipChangeRequestEmail({
        to: recipients,
        recipientName: existing.name,
        brandName,
        partnerName: existing.name,
        changeType,
        oldOwnership: oldCurrent,
        proposedOwnership: input.currentOwnershipPercent,
        minimumOwnership: input.minimumOwnershipPercent,
        actionUrl,
      }).catch((err) => console.warn("[BrandOwnership] Change request email failed:", err));
    }
  }

  return updated;
}

export async function deactivateOwnershipPartner(input: {
  holderId: bigint;
  changedByUserId?: bigint | null;
}) {
  const existing = await prisma.ownershipBrandHolder.findUnique({ where: { id: input.holderId } });
  if (!existing) throw new Error("Ownership holder not found.");
  if (existing.isPrimaryBrandHolder) {
    throw new Error("Primary brand holder cannot be deactivated.");
  }

  const updated = await prisma.ownershipBrandHolder.update({
    where: { id: existing.id },
    data: {
      status: "inactive",
      currentOwnershipPercent: new Decimal(0),
      minimumOwnershipPercent: new Decimal(0),
      updatedAt: new Date(),
    },
  });

  await createOwnershipHistoryRecord({
    brandId: existing.brandId,
    holderId: existing.id,
    action: "holder_deactivated",
    oldCurrent: decimalToNumber(existing.currentOwnershipPercent),
    newCurrent: 0,
    oldMinimum: decimalToNumber(existing.minimumOwnershipPercent),
    newMinimum: 0,
    changedByUserId: input.changedByUserId ?? null,
  });

  const brand = await prisma.ownershipBrand.findUnique({
    where: { id: existing.brandId },
    select: { name: true },
  });
  const partnerEmail = (existing.email ?? "").trim();
  if (partnerEmail.includes("@")) {
    const base = appBaseUrl();
    await sendPartnerRemovedEmail({
      partnerEmail,
      partnerName: existing.name,
      brandName: brand?.name ?? "Brand",
      reason: "Partnership deactivated by administrator.",
      actionUrl: `${base}/partnerships/partners`,
    }).catch((err) => console.warn("[BrandOwnership] Partner removed email failed:", err));
  }

  return updated;
}

export async function deleteOwnershipPartner(input: {
  holderId: bigint;
  changedByUserId?: bigint | null;
}) {
  const existing = await prisma.ownershipBrandHolder.findUnique({ where: { id: input.holderId } });
  if (!existing) throw new Error("Ownership holder not found.");
  if (existing.isPrimaryBrandHolder) {
    throw new Error("Primary brand holder cannot be deleted.");
  }

  const brand = await prisma.ownershipBrand.findUnique({
    where: { id: existing.brandId },
    select: { name: true },
  });

  await createOwnershipHistoryRecord({
    brandId: existing.brandId,
    holderId: existing.id,
    action: "holder_deleted",
    oldCurrent: decimalToNumber(existing.currentOwnershipPercent),
    newCurrent: 0,
    oldMinimum: decimalToNumber(existing.minimumOwnershipPercent),
    newMinimum: 0,
    changedByUserId: input.changedByUserId ?? null,
    notes: `Partner "${existing.name}" permanently deleted.`,
  });

  await prisma.ownershipBrandRequest.updateMany({
    where: { holderId: existing.id },
    data: { holderId: null, updatedAt: new Date() },
  });

  await prisma.ownershipBrandHolder.delete({ where: { id: existing.id } });

  return {
    id: existing.id.toString(),
    name: existing.name,
    brandId: existing.brandId.toString(),
    brandName: brand?.name ?? "Brand",
  };
}

export async function deleteOwnershipBrand(input: {
  brandId: bigint;
  changedByUserId?: bigint | null;
}) {
  const brand = await prisma.ownershipBrand.findUnique({ where: { id: input.brandId } });
  if (!brand) throw new Error("Brand not found.");
  if (brand.slug === "securx") {
    throw new Error("The primary SecurX brand cannot be deleted.");
  }

  await prisma.ownershipBrand.delete({ where: { id: brand.id } });
  return { id: brand.id.toString(), name: brand.name };
}

export async function recordOwnershipConflictRequest(input: {
  brandId: bigint;
  partnerName: string;
  email?: string | null;
  phone?: string | null;
  referralCode?: string | null;
  requestedCurrentOwnership: number;
  requestedMinimumOwnership: number;
  conflictMessage: string | null;
  notes?: string | null;
  requestedByUserId?: bigint | null;
}) {
  await prisma.ownershipBrandRequest.create({
    data: {
      id: await nextId("request"),
      brandId: input.brandId,
      partnerName: input.partnerName,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      referralCode: input.referralCode?.trim() || null,
      requestedCurrentOwnership: new Decimal(input.requestedCurrentOwnership),
      requestedMinimumOwnership: new Decimal(input.requestedMinimumOwnership),
      status: "conflict",
      conflictDetected: true,
      conflictMessage: input.conflictMessage,
      notes: input.notes?.trim() || null,
      requestedByUserId: input.requestedByUserId ?? null,
    },
  });

  const brand = await prisma.ownershipBrand.findUnique({
    where: { id: input.brandId },
    select: { name: true },
  });

  await notifySuperadminsOwnershipConflict({
    brandName: brand?.name ?? "Brand",
    partnerName: input.partnerName,
    proposedOwnership: input.requestedCurrentOwnership,
    minimumOwnership: input.requestedMinimumOwnership,
    conflictMessage: input.conflictMessage ?? "Ownership exceeds 100% limit.",
  }).catch((err) => console.warn("[BrandOwnership] Conflict notification email failed:", err));
}

export async function recordOwnershipPartnerRequest(input: {
  brandId: bigint;
  holderId: bigint;
  partnerName: string;
  email?: string | null;
  phone?: string | null;
  referralCode?: string | null;
  requestedCurrentOwnership: number;
  requestedMinimumOwnership: number;
  notes?: string | null;
  requestedByUserId?: bigint | null;
}) {
  const base = {
    id: await nextId("request"),
    brandId: input.brandId,
    partnerName: input.partnerName,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    referralCode: input.referralCode?.trim() || null,
    requestedCurrentOwnership: new Decimal(input.requestedCurrentOwnership),
    requestedMinimumOwnership: new Decimal(input.requestedMinimumOwnership),
    status: "pending",
    conflictDetected: false,
    notes: input.notes?.trim() || "Partnership agreement sent — awaiting partner signature.",
    requestedByUserId: input.requestedByUserId ?? null,
  };

  try {
    await prisma.ownershipBrandRequest.create({
      data: { ...base, holderId: input.holderId },
    });
  } catch (err) {
    if (!isPrismaUnknownFieldError(err, "holderId")) throw err;
    await prisma.ownershipBrandRequest.create({ data: base });
    await prisma.$executeRaw`
      UPDATE ownership_brand_requests
      SET holder_id = ${input.holderId}, updated_at = NOW()
      WHERE id = ${base.id}
    `;
  }
}

export async function updateOwnershipRequestForHolder(
  holderId: bigint,
  patch: { status: string; notes?: string | null },
) {
  let requestId: bigint | null = null;

  try {
    const existing = await prisma.ownershipBrandRequest.findFirst({
      where: { holderId },
      orderBy: { createdAt: "desc" },
      select: { id: true, notes: true },
    });
    requestId = existing?.id ?? null;
    if (existing) {
      await prisma.ownershipBrandRequest.update({
        where: { id: existing.id },
        data: {
          status: patch.status,
          notes: patch.notes !== undefined ? patch.notes : existing.notes,
          updatedAt: new Date(),
        },
      });
      return;
    }
  } catch (err) {
    if (!isPrismaUnknownFieldError(err, "holderId")) throw err;
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>`
      SELECT id FROM ownership_brand_requests
      WHERE holder_id = ${holderId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    requestId = rows[0]?.id ?? null;
  }

  if (!requestId) return;

  await prisma.$executeRaw`
    UPDATE ownership_brand_requests
    SET status = ${patch.status},
        notes = ${patch.notes ?? null},
        updated_at = NOW()
    WHERE id = ${requestId}
  `;
}

export function getOwnershipDistribution(summary: BrandOwnershipSummary) {
  return summary.holders
    .filter((h) => h.status === "active")
    .map((h) => ({
      name: h.name,
      currentOwnershipPercent: h.currentOwnershipPercent,
      minimumOwnershipPercent: h.minimumOwnershipPercent,
      isPrimaryBrandHolder: h.isPrimaryBrandHolder,
    }));
}
