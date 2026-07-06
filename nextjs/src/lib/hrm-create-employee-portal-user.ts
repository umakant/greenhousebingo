import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { assignStaffRoleToUser } from "@/lib/hrm-employee-role";
import { sendWelcomeEmail } from "@/lib/send-welcome-email";

export type CreateEmployeePortalUserResult =
  | { ok: true; userId: bigint; plainPassword: string }
  | { ok: false; error: string };

export type ProvisionEmployeePortalResult =
  | {
      ok: true;
      userId: bigint;
      plainPassword: string | null;
      alreadyHadLogin: boolean;
      linkedExistingUser: boolean;
    }
  | { ok: false; error: string };

/**
 * Create a staff User for an employee (login + optional role).
 * Caller must ensure email is unique and not already registered.
 */
export async function createEmployeePortalUser(params: {
  name: string;
  email: string;
  companyId: bigint;
}): Promise<CreateEmployeePortalUserResult> {
  const email = params.email.trim().toLowerCase();
  const name = params.name.trim() || email;

  const dup = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (dup) {
    return { ok: false, error: "A user with this email already exists." };
  }

  const plainPassword = crypto.randomBytes(8).toString("base64url").slice(0, 12);
  const hashed = await bcrypt.hash(plainPassword, 10);

  const maxUser = await prisma.user.aggregate({ _max: { id: true } });
  const newId = (maxUser._max.id ?? 0n) + 1n;

  await prisma.user.create({
    data: {
      id: newId,
      name,
      email,
      password: hashed,
      type: "staff",
      isActive: true,
      isEnableLogin: true,
      createdBy: params.companyId,
      emailVerifiedAt: new Date(),
    },
  });

  await assignStaffRoleToUser(newId);

  return { ok: true, userId: newId, plainPassword };
}

function userBelongsToCompany(
  user: { id: bigint; createdBy: bigint | null; creatorId: bigint | null },
  companyId: bigint,
): boolean {
  return user.id === companyId || user.createdBy === companyId || user.creatorId === companyId;
}

/**
 * Create or link a staff portal login for an HRM employee and assign Employee role permissions.
 */
export async function provisionEmployeePortalAccess(params: {
  employeeId: bigint;
  companyId: bigint;
  sendWelcomeEmail?: boolean;
}): Promise<ProvisionEmployeePortalResult> {
  const employee = await prisma.hrmEmployee.findFirst({
    where: { id: params.employeeId, createdBy: params.companyId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      userId: true,
    },
  });
  if (!employee) {
    return { ok: false, error: "Employee not found." };
  }

  const email = (employee.email ?? "").trim().toLowerCase();
  if (!email) {
    return { ok: false, error: "Add an email on the employee record before enabling portal login." };
  }

  const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim() || email;

  if (employee.userId) {
    await assignStaffRoleToUser(employee.userId);
    return {
      ok: true,
      userId: employee.userId,
      plainPassword: null,
      alreadyHadLogin: true,
      linkedExistingUser: false,
    };
  }

  const existingUser = await prisma.user.findFirst({
    where: { email },
    select: { id: true, createdBy: true, creatorId: true },
  });

  if (existingUser) {
    if (!userBelongsToCompany(existingUser, params.companyId)) {
      return { ok: false, error: "A user with this email already exists for another organization." };
    }
    const linkedElsewhere = await prisma.hrmEmployee.findFirst({
      where: {
        createdBy: params.companyId,
        userId: existingUser.id,
        id: { not: params.employeeId },
      },
      select: { id: true },
    });
    if (linkedElsewhere) {
      return { ok: false, error: "This email login is already linked to another employee." };
    }

    await assignStaffRoleToUser(existingUser.id);
    await prisma.hrmEmployee.update({
      where: { id: params.employeeId },
      data: { userId: existingUser.id },
    });
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { name: fullName },
    });

    return {
      ok: true,
      userId: existingUser.id,
      plainPassword: null,
      alreadyHadLogin: true,
      linkedExistingUser: true,
    };
  }

  const created = await createEmployeePortalUser({
    name: fullName,
    email,
    companyId: params.companyId,
  });
  if (!created.ok) {
    return created;
  }

  await prisma.hrmEmployee.update({
    where: { id: params.employeeId },
    data: { userId: created.userId },
  });

  if (params.sendWelcomeEmail !== false) {
    const company = await prisma.user.findUnique({
      where: { id: params.companyId },
      select: { name: true },
    });
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
    await sendWelcomeEmail({
      to: email,
      name: fullName,
      email,
      password: created.plainPassword,
      appUrl: appUrl || undefined,
      companyName: company?.name ?? undefined,
      companyId: params.companyId,
    });
  }

  return {
    ok: true,
    userId: created.userId,
    plainPassword: created.plainPassword,
    alreadyHadLogin: false,
    linkedExistingUser: false,
  };
}

/** Create portal logins for all active employees under a company that have email but no userId. */
export async function provisionAllEmployeePortalAccessForCompany(companyId: bigint): Promise<{
  created: number;
  linked: number;
  refreshed: number;
  skipped: number;
  errors: string[];
}> {
  const rows = await prisma.hrmEmployee.findMany({
    where: {
      createdBy: companyId,
      status: { in: ["active", "on_leave"] },
      email: { not: null },
    },
    select: { id: true, email: true, userId: true },
  });

  let created = 0;
  let linked = 0;
  let refreshed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!(row.email ?? "").trim()) {
      skipped++;
      continue;
    }
    const result = await provisionEmployeePortalAccess({
      employeeId: row.id,
      companyId,
      sendWelcomeEmail: false,
    });
    if (!result.ok) {
      errors.push(`${row.email}: ${result.error}`);
      skipped++;
      continue;
    }
    if (result.alreadyHadLogin && !result.linkedExistingUser) {
      refreshed++;
    } else if (result.linkedExistingUser) {
      linked++;
    } else if (result.plainPassword) {
      created++;
    }
  }

  return { created, linked, refreshed, skipped, errors };
}
