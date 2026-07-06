import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/read-user-cookies", () => ({
  getPermissionsFromRequest: vi.fn(),
}));

import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { guardMarketplaceAdmin } from "@/lib/marketplace-admin-api-guard";

const perms = getPermissionsFromRequest as unknown as Mock;

function req(cookies: Record<string, string>) {
  return {
    cookies: {
      get: (name: string) => (name in cookies ? { value: cookies[name] } : undefined),
    },
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  perms.mockResolvedValue([]);
});

describe("guardMarketplaceAdmin", () => {
  it("blocks non-superadmin roles with 403", async () => {
    const denied = await guardMarketplaceAdmin(req({ pf_role: "company" }), "marketplace.delivery_queue");
    expect(denied).not.toBeNull();
    expect(denied?.status).toBe(403);
  });

  it("blocks a superadmin missing the section permission", async () => {
    perms.mockResolvedValue(["something.else"]);
    const denied = await guardMarketplaceAdmin(req({ pf_role: "superadmin" }), "marketplace.delivery_queue");
    expect(denied).not.toBeNull();
    expect(denied?.status).toBe(403);
  });

  it("allows a superadmin holding the delivery_queue permission", async () => {
    perms.mockResolvedValue(["marketplace.delivery_queue"]);
    const denied = await guardMarketplaceAdmin(req({ pf_role: "superadmin" }), "marketplace.delivery_queue");
    expect(denied).toBeNull();
  });

  it("allows a superadmin holding the wildcard permission", async () => {
    perms.mockResolvedValue(["*"]);
    const denied = await guardMarketplaceAdmin(req({ pf_role: "superadmin" }), "marketplace.delivery_queue");
    expect(denied).toBeNull();
  });
});
