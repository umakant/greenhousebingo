import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/addons-server", () => ({
  getActivatedPackagesForUser: vi.fn(),
}));
vi.mock("@/lib/lms-organization", () => ({
  loadTenantActorUser: vi.fn(),
  resolveTenantOrganizationId: vi.fn(),
}));
vi.mock("@/lib/read-user-cookies", () => ({
  getPermissionsFromRequest: vi.fn(),
  getRolesFromRequest: vi.fn(),
}));

import { getActivatedPackagesForUser } from "@/lib/addons-server";
import { loadTenantActorUser, resolveTenantOrganizationId } from "@/lib/lms-organization";
import { getPermissionsFromRequest, getRolesFromRequest } from "@/lib/read-user-cookies";
import { guardMarketplaceCompany } from "@/lib/marketplace-company-api-guard";

const activated = getActivatedPackagesForUser as unknown as Mock;
const loadActor = loadTenantActorUser as unknown as Mock;
const resolveOrg = resolveTenantOrganizationId as unknown as Mock;
const perms = getPermissionsFromRequest as unknown as Mock;
const roles = getRolesFromRequest as unknown as Mock;

/** Minimal NextRequest stand-in carrying only the cookies the guard reads. */
function req(cookies: Record<string, string>) {
  return {
    cookies: {
      get: (name: string) => (name in cookies ? { value: cookies[name] } : undefined),
    },
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  roles.mockReturnValue([]);
  perms.mockResolvedValue([]);
  activated.mockResolvedValue([]);
  loadActor.mockResolvedValue({ id: 5n });
  resolveOrg.mockReturnValue(200n);
});

describe("guardMarketplaceCompany", () => {
  it("returns 401 when the user is not authenticated", async () => {
    const res = await guardMarketplaceCompany(req({}));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(401);
  });

  it("returns 403 when the user lacks a marketplace permission", async () => {
    perms.mockResolvedValue([]); // no marketplace.view / marketplace.manage
    const res = await guardMarketplaceCompany(req({ pf_role: "company", pf_user_id: "5" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(403);
  });

  it("returns 403 when the marketplace add-on is not activated", async () => {
    perms.mockResolvedValue(["marketplace.view"]);
    activated.mockResolvedValue([]); // no "marketplace"
    const res = await guardMarketplaceCompany(req({ pf_role: "company", pf_user_id: "5" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(403);
  });

  it("allows a marketplace-enabled company user and resolves org context", async () => {
    perms.mockResolvedValue(["marketplace.view"]);
    activated.mockResolvedValue(["marketplace"]);
    const res = await guardMarketplaceCompany(req({ pf_role: "company", pf_user_id: "5" }));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.ctx.organizationId).toBe(200n);
      expect(res.ctx.isSuperadmin).toBe(false);
    }
  });

  it("allows a superadmin through without the add-on/permission", async () => {
    roles.mockReturnValue(["superadmin"]);
    perms.mockResolvedValue([]);
    activated.mockResolvedValue([]);
    const res = await guardMarketplaceCompany(req({ pf_role: "superadmin", pf_user_id: "1" }));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.ctx.isSuperadmin).toBe(true);
  });
});
