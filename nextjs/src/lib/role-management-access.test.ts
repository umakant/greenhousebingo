import { describe, expect, it } from "vitest";

import {
  isReservedPlatformRoleName,
  roleCanDeleteForActor,
  roleCanEditForActor,
} from "@/lib/role-management-access";

const companyId = 1005n;

describe("role-management-access", () => {
  it("marks portal and platform roles as reserved", () => {
    expect(isReservedPlatformRoleName("company")).toBe(true);
    expect(isReservedPlatformRoleName("expense-supervisor")).toBe(true);
    expect(isReservedPlatformRoleName("sales-lead")).toBe(false);
  });

  it("allows superadmin to edit reserved roles", () => {
    expect(
      roleCanEditForActor(
        { name: "company", editable: false, createdBy: null },
        true,
        companyId,
      ),
    ).toBe(true);
  });

  it("blocks company admin from editing reserved roles", () => {
    expect(
      roleCanEditForActor(
        { name: "company", editable: true, createdBy: null },
        false,
        companyId,
      ),
    ).toBe(false);
  });

  it("allows company admin to edit own custom roles", () => {
    expect(
      roleCanEditForActor(
        { name: "billing-clerk", editable: true, createdBy: companyId },
        false,
        companyId,
      ),
    ).toBe(true);
  });

  it("prevents deleting reserved roles even for superadmin", () => {
    expect(
      roleCanDeleteForActor(
        { name: "expense-supervisor", editable: false, createdBy: null },
        true,
        companyId,
      ),
    ).toBe(false);
  });
});
