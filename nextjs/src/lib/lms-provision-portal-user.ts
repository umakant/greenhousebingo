import "server-only";

import crypto from "crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { combineDisplayName } from "@/lib/display-name";
import { assignLmsInstructorRoleToUser } from "@/lib/lms-instructor-role";
import { assignLmsStudentRoleToUser } from "@/lib/lms-student-role";
import { sendWelcomeEmail } from "@/lib/send-welcome-email";

export type LmsPortalUserKind = "student" | "instructor";

export type ProvisionLmsPortalUserParams = {
  kind: LmsPortalUserKind;
  organizationId: bigint;
  firstName: string;
  lastName?: string;
  email: string;
  /** When omitted, a random temporary password is generated. */
  password?: string;
  sendWelcomeEmail?: boolean;
  /** Instructor profile display name (defaults to full name). */
  displayName?: string;
  headline?: string;
};

export type ProvisionLmsPortalUserResult =
  | {
      ok: true;
      userId: bigint;
      instructorProfileId?: bigint;
      plainPassword: string;
      welcomeEmailSent: boolean;
      welcomeEmailError?: string;
    }
  | { ok: false; error: string };

export async function provisionLmsPortalUser(
  params: ProvisionLmsPortalUserParams,
): Promise<ProvisionLmsPortalUserResult> {
  const email = params.email.trim().toLowerCase();
  const firstName = params.firstName.trim();
  const lastName = (params.lastName ?? "").trim();
  const name = combineDisplayName(firstName, lastName) || email;

  if (!firstName || !email) {
    return { ok: false, error: "First name and email are required." };
  }

  const dup = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (dup) {
    return { ok: false, error: "A user with this email already exists." };
  }

  const plainPassword =
    (params.password ?? "").trim() || crypto.randomBytes(8).toString("base64url").slice(0, 12);
  if (plainPassword.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  const hashed = await bcrypt.hash(plainPassword, 10);
  const maxUser = await prisma.user.aggregate({ _max: { id: true } });
  const userId = (maxUser._max.id ?? 0n) + 1n;

  await prisma.user.create({
    data: {
      id: userId,
      name,
      email,
      password: hashed,
      type: params.kind === "student" ? "lms-student" : "lms-instructor",
      isActive: true,
      isEnableLogin: true,
      createdBy: params.organizationId,
      emailVerifiedAt: new Date(),
    },
  });

  if (params.kind === "student") {
    await assignLmsStudentRoleToUser(userId);
  } else {
    await assignLmsInstructorRoleToUser(userId);
  }

  let instructorProfileId: bigint | undefined;
  if (params.kind === "instructor") {
    const profile = await prisma.instructorProfile.create({
      data: {
        organizationId: params.organizationId,
        userId,
        displayName: (params.displayName ?? name).trim() || name,
        headline: params.headline?.trim() || null,
        isActive: true,
      },
      select: { id: true },
    });
    instructorProfileId = profile.id;
  }

  let welcomeEmailSent = false;
  let welcomeEmailError: string | undefined;
  if (params.sendWelcomeEmail !== false) {
    const company = await prisma.user.findUnique({
      where: { id: params.organizationId },
      select: { name: true },
    });
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
    const welcomeResult = await sendWelcomeEmail({
      to: email,
      name,
      email,
      password: plainPassword,
      appUrl: appUrl || undefined,
      companyName: company?.name ?? undefined,
      companyId: params.organizationId,
    });
    welcomeEmailSent = welcomeResult.ok;
    welcomeEmailError = welcomeResult.error;
  }

  return {
    ok: true,
    userId,
    instructorProfileId,
    plainPassword,
    welcomeEmailSent,
    welcomeEmailError,
  };
}
