import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";

export type PartnerPageContext = {
  user: {
    name: string;
    email: string;
    roles: string[];
    permissions: string[];
    activatedPackages: string[];
    primaryRole: string;
  };
  partner: {
    id: bigint;
    name: string;
    slug: string;
    referralCode: string;
    status: string;
  };
};

/**
 * Server gate for `/partner/*`: requires a logged-in partner user with a linked partner profile.
 * Returns the resolved partner row so pages/components can scope all data to `partner.id`.
 */
export async function requirePartnerPage(): Promise<PartnerPageContext> {
  const store = await cookies();
  const primaryRole = store.get("pf_role")?.value?.trim() ?? "";
  if (!primaryRole) redirect("/login");

  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const isPartner =
    primaryRole === "partner" || roles.map((r) => r.trim().toLowerCase()).includes("partner");
  if (!isPartner) redirect("/dashboard");

  const uidRaw = store.get("pf_user_id")?.value?.trim();
  if (!uidRaw) redirect("/login");

  let userId: bigint;
  try {
    userId = BigInt(uidRaw);
  } catch {
    redirect("/login");
  }

  const partner = await prisma.partner.findFirst({
    where: { userId },
    select: { id: true, name: true, slug: true, referralCode: true, status: true },
  });
  if (!partner) redirect("/login");

  const name = store.get("pf_name")?.value ?? "Partner";
  const email = store.get("pf_email")?.value ?? "";
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  return {
    user: { name, email, roles, permissions, activatedPackages, primaryRole },
    partner,
  };
}

/** Resolve the partner row for the current session in API routes (returns null if not a partner). */
export async function resolvePartnerFromRequest(req: {
  cookies: { get: (name: string) => { value: string } | undefined };
}): Promise<{ id: bigint; slug: string; referralCode: string } | null> {
  const role = req.cookies.get("pf_role")?.value?.trim() ?? "";
  const uidRaw = req.cookies.get("pf_user_id")?.value?.trim();
  if (!uidRaw) return null;
  if (role !== "partner") {
    const roles = safeJsonParse<string[]>(req.cookies.get("pf_roles")?.value, []);
    if (!roles.map((r) => r.trim().toLowerCase()).includes("partner")) return null;
  }
  let userId: bigint;
  try {
    userId = BigInt(uidRaw);
  } catch {
    return null;
  }
  return prisma.partner.findFirst({
    where: { userId },
    select: { id: true, slug: true, referralCode: true },
  });
}
