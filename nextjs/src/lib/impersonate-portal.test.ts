import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  actorCanImpersonateLmsPortal,
  actorCanImpersonatePortalUsers,
} from "./impersonate-portal";

describe("impersonate-portal permissions", () => {
  it("allows company admin with manage-hrm to impersonate LMS students", () => {
    const perms = ["manage-hrm"];
    expect(actorCanImpersonatePortalUsers("company", ["company"], perms)).toBe(true);
    expect(
      actorCanImpersonateLmsPortal(perms, "student", { authorizerType: "company", roles: ["company"] }),
    ).toBe(true);
  });

  it("allows company_admin with manage-lms-students via explicit LMS perm", () => {
    const perms = ["manage-lms-students"];
    expect(
      actorCanImpersonateLmsPortal(perms, "student", {
        authorizerType: "company_admin",
        roles: ["company"],
      }),
    ).toBe(true);
  });

  it("denies staff without LMS or portal impersonation perms", () => {
    const perms = ["manage-dashboard"];
    expect(actorCanImpersonatePortalUsers("staff", ["staff"], perms)).toBe(false);
    expect(actorCanImpersonateLmsPortal(perms, "student", { authorizerType: "staff", roles: ["staff"] })).toBe(
      false,
    );
  });
});
