import "server-only";

import crypto from "crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { LARAVEL_USER_MORPH_TYPE } from "@/lib/laravel-user-model-type";
import { sendMarketplaceVendorInviteEmail } from "@/lib/marketplace-vendor-invite-email";
import {
  ensureMarketplaceVendorPortalPermissions,
  MARKETPLACE_VENDOR_PORTAL_ROLE_NAME,
  MARKETPLACE_VENDOR_USER_TYPE,
  presetPermissionsForRole,
  saveVendorPermissionsForUser,
  type VendorStaffRole,
} from "@/lib/marketplace-vendor-portal-permissions";

export function parseVendorLoginAccessBody(body: Record<string, unknown>): VendorLoginAccessInput | null {
  const loginAccess = (body.loginAccess ?? body.login_access) as Record<string, unknown> | undefined;
  if (!loginAccess) return null;

  const enabled = Boolean(loginAccess.enabled ?? loginAccess.enableLogin);
  const permissionsRaw = loginAccess.permissions as Record<string, boolean> | string[] | undefined;
  let permissions: string[] = [];
  if (Array.isArray(permissionsRaw)) {
    permissions = permissionsRaw.map(String);
  } else if (permissionsRaw && typeof permissionsRaw === "object") {
    permissions = Object.entries(permissionsRaw)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }

  const roleRaw = String(loginAccess.vendorRole ?? loginAccess.vendor_role ?? "vendor_admin").trim();
  const vendorRole = (
    ["vendor_admin", "vendor_manager", "vendor_staff"].includes(roleRaw) ? roleRaw : "vendor_admin"
  ) as VendorStaffRole;

  return {
    enabled,
    loginEmail: String(loginAccess.loginEmail ?? loginAccess.login_email ?? "").trim(),
    temporaryPassword: (() => {
      const v = loginAccess.temporaryPassword ?? loginAccess.temporary_password;
      if (v == null || v === "") return null;
      return String(v).trim() || null;
    })(),
    sendInviteEmail: Boolean(loginAccess.sendInviteEmail ?? loginAccess.send_invite_email),
    vendorRole,
    permissions,
    forcePasswordReset: loginAccess.forcePasswordReset !== false && loginAccess.force_password_reset !== false,
  };
}

export type VendorLoginAccessInput = {
  enabled: boolean;
  loginEmail: string;
  temporaryPassword?: string | null;
  sendInviteEmail?: boolean;
  vendorRole: VendorStaffRole;
  permissions: string[];
  forcePasswordReset?: boolean;
};

export type ProvisionVendorLoginResult = {
  userId: bigint | null;
  created: boolean;
  plainPassword: string | null;
  error?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generateTemporaryPassword(): string {
  return crypto.randomBytes(9).toString("base64url").slice(0, 12);
}

async function assignMarketplaceVendorRole(userId: bigint): Promise<void> {
  await ensureMarketplaceVendorPortalPermissions();
  const role = await prisma.role.findFirst({
    where: { name: MARKETPLACE_VENDOR_PORTAL_ROLE_NAME },
    select: { id: true },
  });
  if (!role) return;

  const existing = await prisma.modelHasRole.findFirst({
    where: { modelId: userId, modelType: LARAVEL_USER_MORPH_TYPE },
    select: { roleId: true },
  });
  if (!existing) {
    await prisma.modelHasRole.create({
      data: { roleId: role.id, modelId: userId, modelType: LARAVEL_USER_MORPH_TYPE },
    });
  } else if (existing.roleId !== role.id) {
    await prisma.modelHasRole.updateMany({
      where: { modelId: userId, modelType: LARAVEL_USER_MORPH_TYPE },
      data: { roleId: role.id },
    });
  }
}

export async function provisionMarketplaceVendorLogin(
  vendorId: bigint,
  vendorName: string,
  input: VendorLoginAccessInput,
): Promise<ProvisionVendorLoginResult> {
  if (!input.enabled) {
    const vendor = await prisma.marketplaceVendor.findFirst({
      where: { id: vendorId },
      select: { primaryUserId: true },
    });
    if (vendor?.primaryUserId) {
      await prisma.user.update({
        where: { id: vendor.primaryUserId },
        data: { isEnableLogin: false, isActive: false, updatedAt: new Date() },
      });
    }
    return { userId: vendor?.primaryUserId ?? null, created: false, plainPassword: null };
  }

  const email = input.loginEmail.trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    return { userId: null, created: false, plainPassword: null, error: "A valid login email is required." };
  }

  const vendor = await prisma.marketplaceVendor.findFirst({
    where: { id: vendorId },
    select: { primaryUserId: true },
  });

  const existingByEmail = await prisma.user.findFirst({
    where: { email },
    select: { id: true, marketplaceVendorId: true },
  });

  if (
    existingByEmail &&
    existingByEmail.marketplaceVendorId != null &&
    existingByEmail.marketplaceVendorId !== vendorId &&
    existingByEmail.id !== vendor?.primaryUserId
  ) {
    return {
      userId: null,
      created: false,
      plainPassword: null,
      error: "This email is already linked to another marketplace vendor.",
    };
  }

  if (
    existingByEmail &&
    existingByEmail.marketplaceVendorId == null &&
    existingByEmail.id !== vendor?.primaryUserId
  ) {
    return {
      userId: null,
      created: false,
      plainPassword: null,
      error: "This email is already used by another account.",
    };
  }

  let userId = vendor?.primaryUserId ?? existingByEmail?.id ?? null;
  let created = false;
  let plainPassword: string | null = null;

  if (!userId) {
    plainPassword = (input.temporaryPassword?.trim() || generateTemporaryPassword()).slice(0, 64);
    const hashed = await bcrypt.hash(plainPassword, 10);
    const maxUser = await prisma.user.aggregate({ _max: { id: true } });
    userId = (maxUser._max.id ?? 0n) + 1n;
    await prisma.user.create({
      data: {
        id: userId,
        name: vendorName.trim() || email,
        email,
        password: hashed,
        type: MARKETPLACE_VENDOR_USER_TYPE,
        marketplaceVendorId: vendorId,
        isActive: true,
        isEnableLogin: true,
        forcePasswordReset: input.forcePasswordReset !== false,
        emailVerifiedAt: new Date(),
      },
    });
    created = true;
  } else {
    const data: Record<string, unknown> = {
      name: vendorName.trim() || email,
      email,
      type: MARKETPLACE_VENDOR_USER_TYPE,
      marketplaceVendorId: vendorId,
      isActive: true,
      isEnableLogin: true,
      updatedAt: new Date(),
    };
    if (input.temporaryPassword?.trim()) {
      plainPassword = input.temporaryPassword.trim().slice(0, 64);
      data.password = await bcrypt.hash(plainPassword, 10);
      data.forcePasswordReset = input.forcePasswordReset !== false;
    }
    await prisma.user.update({ where: { id: userId }, data });
  }

  await assignMarketplaceVendorRole(userId);

  await prisma.marketplaceVendorStaff.upsert({
    where: { vendorId_userId: { vendorId, userId } },
    create: {
      vendorId,
      userId,
      role: input.vendorRole,
      status: "active",
    },
    update: {
      role: input.vendorRole,
      status: "active",
      updatedAt: new Date(),
    },
  });

  const enabledKeys =
    input.permissions.length > 0 ? input.permissions : presetPermissionsForRole(input.vendorRole);
  await saveVendorPermissionsForUser(vendorId, userId, enabledKeys);

  await prisma.marketplaceVendor.update({
    where: { id: vendorId },
    data: { primaryUserId: userId, updatedAt: new Date() },
  });

  if (input.sendInviteEmail && email) {
    await sendMarketplaceVendorInviteEmail({
      to: email,
      vendorName,
      loginEmail: email,
      temporaryPassword: plainPassword,
    }).catch(() => undefined);
  }

  return { userId, created, plainPassword };
}
