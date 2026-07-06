/**
 * Returns current auth state for the layout.
 * Also silently refreshes pf_permissions and pf_activated_packages cookies
 * from the DB so stale sessions pick up new role assignments automatically.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveSessionAuthz } from "@/lib/effective-user-permissions";
import { resolveDashboardSidebarTenantId } from "@/lib/dashboard-sidebar-tenant";
import { readImpersonatingFromRequest, clearStaleImpersonationCookies } from "@/lib/leave-impersonation";
import { resolveCompanyUserAvatar } from "@/lib/company-user-avatar";
import { getSettingsForOwner } from "@/lib/settings-service";

function deriveProfileFlags(permissions: string[], roles: string[]) {
  const hasWildcard = permissions.includes("*");
  const isSuperadmin = roles.includes("superadmin");
  const canManageProfile = hasWildcard || permissions.includes("manage-profile");
  const canSwitchCompany =
    isSuperadmin && (hasWildcard || permissions.includes("impersonate-users"));
  const marketplaceHref =
    hasWildcard || permissions.includes("manage-marketplace-settings")
      ? "/marketplace/settings"
      : "/marketplace";
  return { canManageProfile, canSwitchCompany, marketplaceHref };
}

export async function GET(req: NextRequest) {
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const name = (req.cookies.get("pf_name")?.value ?? "").trim();
  const role = (req.cookies.get("pf_role")?.value ?? "").trim();
  const rolesRaw = req.cookies.get("pf_roles")?.value ?? "";
  let roles: string[] = [];
  try {
    const parsed = rolesRaw ? JSON.parse(rolesRaw) : [];
    if (Array.isArray(parsed)) roles = parsed.filter((r): r is string => typeof r === "string");
  } catch {
    // ignore malformed pf_roles cookie
  }
  const impersonating = readImpersonatingFromRequest(req);

  let avatar: string | null = null;

  if (email) {
    try {
      const user = await prisma.user.findFirst({
        where: { email },
        select: { id: true, type: true, avatar: true, name: true, createdBy: true, creatorId: true },
      });
      if (user) {
        const companySettings = user.type === "company" ? await getSettingsForOwner(user.id) : null;
        avatar = resolveCompanyUserAvatar(user, companySettings);

        const authz = await resolveSessionAuthz(user.id);
        const permissions = authz.permissionNames;
        const isSuperadmin = authz.isSuperadmin;
        const activatedPackages = authz.activatedPackages;

        const cookieOpts = {
          httpOnly: true,
          sameSite: "lax" as const,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        };

        const permissionsCookieValue = authz.permissionsCookieValue;

        const dashboardSidebarTenantId = resolveDashboardSidebarTenantId(user);
        const effectiveRoles = roles.length ? roles : isSuperadmin ? ["superadmin"] : user.type ? [user.type] : [];
        const { canManageProfile, canSwitchCompany, marketplaceHref } = deriveProfileFlags(
          permissions,
          effectiveRoles,
        );
        const res = NextResponse.json({
          isAuthenticated: true,
          impersonating,
          avatar,
          dashboardSidebarTenantId,
          name: (user.name?.trim() || name || email),
          email,
          role: role || effectiveRoles[0] || user.type || "",
          canManageProfile,
          canSwitchCompany,
          marketplaceHref,
        });
        clearStaleImpersonationCookies(req, res);
        res.cookies.set("pf_permissions", permissionsCookieValue, cookieOpts);
        res.cookies.set("pf_activated_packages", JSON.stringify(activatedPackages), cookieOpts);
        res.cookies.set("pf_user_id", user.id.toString(), cookieOpts);
        return res;
      }
    } catch {
      // Non-fatal — fall through to minimal JSON
    }
  }

  const res = NextResponse.json({
    isAuthenticated: Boolean(email),
    impersonating,
    avatar,
    dashboardSidebarTenantId: null as string | null,
    name: name || email || "",
    email,
    role,
    canManageProfile: false,
    canSwitchCompany: false,
    marketplaceHref: "/marketplace",
  });
  clearStaleImpersonationCookies(req, res);
  return res;
}
