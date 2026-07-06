import { describe, expect, it } from "vitest";

import {
  canManageAllOrganizationExpenses,
  isEmAdminRoute,
  isEmPortalSubmitterRole,
  userMayAccessEmRoute,
} from "@/lib/em-access";

const PORTAL_EXPENSE = [
  "manage-dashboard",
  "manage-profile",
  "manage-expense-management-dashboard",
  "manage-expense-reports",
  "manage-expense-entries",
  "manage-expense-receipts",
  "manage-expense-analytics",
];

const COMPANY_EXPENSE = [
  ...PORTAL_EXPENSE,
  "manage-expense-management",
  "manage-hrm",
];

describe("expense management role access", () => {
  it("identifies portal submitters by type and role", () => {
    expect(isEmPortalSubmitterRole([], "client")).toBe(true);
    expect(isEmPortalSubmitterRole(["staff"], "staff")).toBe(true);
    expect(isEmPortalSubmitterRole(["vendor"], "vendor")).toBe(true);
    expect(isEmPortalSubmitterRole(["company"], "company")).toBe(false);
  });

  it("portal customer can access operational routes only", () => {
    expect(userMayAccessEmRoute("/expense-management", PORTAL_EXPENSE, ["client"], "client")).toBe(
      true,
    );
    expect(
      userMayAccessEmRoute("/expense-management/reports", PORTAL_EXPENSE, ["client"], "client"),
    ).toBe(true);
    expect(
      userMayAccessEmRoute("/expense-management/expenses", PORTAL_EXPENSE, ["client"], "client"),
    ).toBe(true);
    expect(
      userMayAccessEmRoute("/expense-management/setup", PORTAL_EXPENSE, ["client"], "client"),
    ).toBe(false);
    expect(
      userMayAccessEmRoute(
        "/expense-management/operation-details",
        PORTAL_EXPENSE,
        ["client"],
        "client",
      ),
    ).toBe(false);
  });

  it("portal employee and vendor match customer EM route access", () => {
    for (const type of ["staff", "vendor"] as const) {
      expect(userMayAccessEmRoute("/expense-management/analytics", PORTAL_EXPENSE, [type], type)).toBe(
        true,
      );
      expect(userMayAccessEmRoute("/expense-management/setup", PORTAL_EXPENSE, [type], type)).toBe(
        false,
      );
    }
  });

  it("company admin can access admin routes and sees all org data", () => {
    expect(
      userMayAccessEmRoute("/expense-management/setup", COMPANY_EXPENSE, ["company"], "company"),
    ).toBe(true);
    expect(
      canManageAllOrganizationExpenses(COMPANY_EXPENSE, ["company"], "company"),
    ).toBe(true);
  });

  it("company with operational perms only still accesses org-wide UI scope", () => {
    const opsOnly = PORTAL_EXPENSE;
    expect(canManageAllOrganizationExpenses(opsOnly, ["company"], "company")).toBe(true);
    expect(userMayAccessEmRoute("/expense-management/setup", opsOnly, ["company"], "company")).toBe(
      true,
    );
  });

  it("marks admin-only paths", () => {
    expect(isEmAdminRoute("/expense-management/setup")).toBe(true);
    expect(isEmAdminRoute("/expense-management/reports")).toBe(false);
  });
});
