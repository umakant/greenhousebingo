/* eslint-disable no-console */
/** Shared helpers for partnership + brand ownership seed scripts. */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });

const PARTNER_PERMISSIONS = [
  "access-partner-portal",
  "view-partner-dashboard",
  "manage-partner-referrals",
  "view-partner-commissions",
  "view-partner-payouts",
  "edit-partner-profile",
];

const PARTNERSHIP_ADMIN_PERMISSIONS = ["manage-partnerships", "manage-brand-ownership"];

function titleize(name) {
  return String(name)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

async function nextId(model) {
  const agg = await prisma[model].aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function nextOwnershipId(kind) {
  const map = {
    brand: "ownershipBrand",
    holder: "ownershipBrandHolder",
    history: "ownershipBrandHistory",
    request: "ownershipBrandRequest",
  };
  return nextId(map[kind]);
}

async function upsertOwnershipBrand({ slug, name, status = "active", notes = null, logo = null }) {
  let brand = await prisma.ownershipBrand.findFirst({ where: { slug } });
  if (!brand) {
    const id = await nextOwnershipId("brand");
    brand = await prisma.ownershipBrand.create({
      data: { id, slug, name, status, notes, logo, createdAt: new Date() },
    });
    console.log(`  + created ownership brand '${name}' (id ${id})`);
  } else {
    brand = await prisma.ownershipBrand.update({
      where: { id: brand.id },
      data: { name, status, notes, logo, updatedAt: new Date() },
    });
  }
  return brand;
}

async function upsertOwnershipHolder(brandId, spec) {
  let holder = await prisma.ownershipBrandHolder.findFirst({
    where: { brandId, name: spec.name },
    select: { id: true },
  });
  const data = {
    brandId,
    partnerId: spec.partnerId ?? null,
    name: spec.name,
    email: spec.email ?? null,
    phone: spec.phone ?? null,
    referralCode: spec.referralCode ?? null,
    currentOwnershipPercent: spec.current,
    minimumOwnershipPercent: spec.minimum,
    isPrimaryBrandHolder: !!spec.isPrimary,
    status: spec.status ?? "active",
    payoutMethod: spec.payoutMethod ?? null,
    payoutEmail: spec.payoutEmail ?? null,
    notes: spec.notes ?? null,
    createdAt: spec.createdAt ?? new Date(),
  };
  if (!holder) {
    const id = await nextOwnershipId("holder");
    holder = await prisma.ownershipBrandHolder.create({ data: { id, ...data } });
    console.log(`    + holder '${spec.name}' (${spec.current}% / ${spec.minimum}%)`);
  } else {
    holder = await prisma.ownershipBrandHolder.update({
      where: { id: holder.id },
      data: { ...data, updatedAt: new Date() },
    });
  }
  return holder;
}

async function ensureOwnershipHistory({
  brandId,
  holderId,
  action,
  changedByUserId,
  notes,
  oldCurrent,
  newCurrent,
  oldMinimum,
  newMinimum,
}) {
  const existing = await prisma.ownershipBrandHistory.findFirst({
    where: { brandId, action, holderId: holderId ?? null, notes: notes ?? null },
    select: { id: true },
  });
  if (existing) return existing;
  return prisma.ownershipBrandHistory.create({
    data: {
      id: await nextOwnershipId("history"),
      brandId,
      holderId: holderId ?? null,
      action,
      oldCurrentOwnershipPercent: oldCurrent ?? null,
      newCurrentOwnershipPercent: newCurrent ?? null,
      oldMinimumOwnershipPercent: oldMinimum ?? null,
      newMinimumOwnershipPercent: newMinimum ?? null,
      changedByUserId: changedByUserId ?? null,
      notes: notes ?? null,
      createdAt: new Date(),
    },
  });
}

/** Ensures partner role, portal permissions, and superadmin partnership permissions. */
async function ensurePartnershipPermissions() {
  const sampleRole = await prisma.role.findFirst({ select: { guardName: true } });
  const guard = sampleRole?.guardName || "web";

  const superRole = await prisma.role.findFirst({
    where: { name: { in: ["superadmin", "super_admin"] } },
    select: { id: true },
  });

  let partnerRole = await prisma.role.findFirst({ where: { name: "partner" }, select: { id: true } });
  if (!partnerRole) {
    const id = await nextId("role");
    partnerRole = await prisma.role.create({
      data: {
        id,
        name: "partner",
        label: "Partner",
        guardName: guard,
        editable: false,
        createdBy: superRole?.id ?? null,
      },
      select: { id: true },
    });
    console.log(`  + created role 'partner' (id ${id})`);
  }

  const allPerms = [...PARTNER_PERMISSIONS, ...PARTNERSHIP_ADMIN_PERMISSIONS];
  let nextPermId = (await prisma.permission.aggregate({ _max: { id: true } }))._max.id ?? 0n;
  for (const name of allPerms) {
    const existing = await prisma.permission.findUnique({
      where: { name_guardName: { name, guardName: guard } },
    });
    if (!existing) {
      nextPermId += 1n;
      await prisma.permission.create({
        data: {
          id: nextPermId,
          name,
          guardName: guard,
          addOn: name.startsWith("manage-") ? "general" : "Partnership",
          module: name.startsWith("manage-") ? "general" : "Partnership",
          label: titleize(name),
        },
      });
    }
  }

  const perms = await prisma.permission.findMany({
    where: { guardName: guard, name: { in: allPerms } },
    select: { id: true, name: true },
  });
  const permIdByName = new Map(perms.map((p) => [p.name, p.id]));

  const links = PARTNER_PERMISSIONS.map((n) => permIdByName.get(n))
    .filter(Boolean)
    .map((permissionId) => ({ roleId: partnerRole.id, permissionId }));
  if (superRole) {
    for (const n of PARTNERSHIP_ADMIN_PERMISSIONS) {
      const pid = permIdByName.get(n);
      if (pid) links.push({ roleId: superRole.id, permissionId: pid });
    }
  }
  if (links.length) {
    await prisma.roleHasPermission.createMany({ data: links, skipDuplicates: true });
  }

  return { superRole, partnerRole, guard };
}

async function getSecurXActiveHolders(brandId) {
  return prisma.ownershipBrandHolder.findMany({
    where: { brandId, status: "active" },
    select: {
      id: true,
      name: true,
      partnerId: true,
      email: true,
      phone: true,
      referralCode: true,
      currentOwnershipPercent: true,
      minimumOwnershipPercent: true,
      isPrimaryBrandHolder: true,
      payoutMethod: true,
      payoutEmail: true,
    },
  });
}

/** Fix SecurX when seed scripts left total ownership above 100%. */
async function repairSecurXOwnershipIfNeeded(partnerId = null) {
  const securx = await prisma.ownershipBrand.findFirst({
    where: { slug: "securx" },
    select: { id: true },
  });
  if (!securx) return { repaired: false };

  const holders = await getSecurXActiveHolders(securx.id);
  const total = holders.reduce((sum, h) => sum + Number(h.currentOwnershipPercent), 0);
  if (total <= 100) return { repaired: false, total };

  const lynn = holders.find((h) => h.name === "Lynn Nicely");
  const john = holders.find((h) => h.name === "John Hindy");
  if (lynn && john) {
    console.log(`  Repairing SecurX ownership: ${total}% -> 100% (20/40/40 demo split)`);
    await upsertOwnershipHolder(securx.id, {
      name: "SecurX Holdings",
      email: lynn.email?.includes("@securx.test") ? "holdings@securx.test" : "holdings@securx.com",
      current: 20,
      minimum: 20,
      isPrimary: true,
      referralCode: "SECURX-HOLD",
    });
    await upsertOwnershipHolder(securx.id, {
      name: "Lynn Nicely",
      email: lynn.email ?? "lynn@securx.test",
      phone: lynn.phone,
      referralCode: lynn.referralCode ?? "LYNN-40",
      current: 40,
      minimum: 40,
      partnerId: partnerId ?? lynn.partnerId,
      payoutMethod: lynn.payoutMethod,
      payoutEmail: lynn.payoutEmail,
    });
    await upsertOwnershipHolder(securx.id, {
      name: "John Hindy",
      email: john.email ?? "john@securx.test",
      phone: john.phone,
      referralCode: john.referralCode ?? "JOHN-40",
      current: 40,
      minimum: 40,
      partnerId: john.partnerId,
      payoutMethod: john.payoutMethod,
      payoutEmail: john.payoutEmail,
    });
    return { repaired: true, total, newTotal: 100 };
  }

  const others = holders.filter((h) => h.name !== "SecurX Holdings");
  const othersTotal = others.reduce((sum, h) => sum + Number(h.currentOwnershipPercent), 0);
  const primaryShare = Math.max(0, 100 - othersTotal);
  const holdings = holders.find((h) => h.name === "SecurX Holdings");
  if (holdings && primaryShare !== Number(holdings.currentOwnershipPercent)) {
    console.log(
      `  Repairing SecurX primary holder: ${holdings.currentOwnershipPercent}% -> ${primaryShare}%`
    );
    await upsertOwnershipHolder(securx.id, {
      name: "SecurX Holdings",
      email: holdings.email ?? "holdings@securx.com",
      current: primaryShare,
      minimum: Math.min(Number(holdings.minimumOwnershipPercent), primaryShare),
      isPrimary: true,
      referralCode: holdings.referralCode ?? "SECURX-HOLD",
    });
    return { repaired: true, total, newTotal: 100 };
  }

  console.warn(`  WARN: SecurX ownership totals ${total}% (max 100%). Adjust holders in admin.`);
  return { repaired: false, total };
}

async function seedSecurXProductionBrand(changedByUserId) {
  const securx = await upsertOwnershipBrand({
    slug: "securx",
    name: "SecurX",
    status: "active",
    notes: "Primary platform brand.",
  });

  const existingHolders = await getSecurXActiveHolders(securx.id);
  const otherHolders = existingHolders.filter((h) => h.name !== "SecurX Holdings");
  const hasDemoPartners =
    otherHolders.some((h) => h.name === "Lynn Nicely") &&
    otherHolders.some((h) => h.name === "John Hindy");

  if (otherHolders.length > 0) {
    if (hasDemoPartners) {
      console.log("  SecurX: demo partners present — skipping 100% primary reset");
    } else {
      console.log(
        `  SecurX: ${otherHolders.length} partner holder(s) present — skipping 100% primary reset`
      );
    }
    await repairSecurXOwnershipIfNeeded();
    return securx;
  }

  const holdings = await upsertOwnershipHolder(securx.id, {
    name: "SecurX Holdings",
    email: "holdings@securx.com",
    current: 100,
    minimum: 100,
    isPrimary: true,
    referralCode: "SECURX-HOLD",
  });

  await ensureOwnershipHistory({
    brandId: securx.id,
    action: "brand_created",
    changedByUserId,
    notes: 'Brand "SecurX" created with primary holder.',
    newCurrent: 100,
    newMinimum: 100,
  });
  await ensureOwnershipHistory({
    brandId: securx.id,
    holderId: holdings.id,
    action: "holder_added",
    changedByUserId,
    notes: "Primary brand holder assigned at 100%.",
    newCurrent: 100,
    newMinimum: 100,
  });

  return securx;
}

async function disconnect() {
  await prisma.$disconnect();
}

module.exports = {
  prisma,
  PARTNER_PERMISSIONS,
  PARTNERSHIP_ADMIN_PERMISSIONS,
  titleize,
  nextId,
  nextOwnershipId,
  upsertOwnershipBrand,
  upsertOwnershipHolder,
  ensureOwnershipHistory,
  ensurePartnershipPermissions,
  seedSecurXProductionBrand,
  repairSecurXOwnershipIfNeeded,
  disconnect,
};
