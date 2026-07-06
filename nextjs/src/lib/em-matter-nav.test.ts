import { describe, expect, it } from "vitest";

import { EM_EMPLOYEE_MATTER_NAV_IDS, filterEmMatterNavIds, isEmEmployeeMatterWorkspaceView } from "./em-matter-nav";

describe("em-matter-nav", () => {
  it("limits portal staff to expenses, receipts, and reports", () => {
    expect(
      isEmEmployeeMatterWorkspaceView({
        permissions: ["manage-expense-entries", "manage-expense-reports"],
        roles: ["staff"],
        userType: "staff",
      }),
    ).toBe(true);

    const filtered = filterEmMatterNavIds(
      [
        "operation",
        "timesheets",
        "expenses",
        "costtransfer",
        "billing",
        "notes",
        "documents",
        "timeline",
        "receipts",
        "reports",
      ],
      {
        permissions: ["manage-expense-entries"],
        roles: ["staff"],
        userType: "staff",
      },
    );

    expect(filtered).toEqual(EM_EMPLOYEE_MATTER_NAV_IDS);
  });

  it("shows full nav for company admins", () => {
    expect(
      isEmEmployeeMatterWorkspaceView({
        permissions: ["manage-expense-management"],
        roles: ["company"],
        userType: "company",
      }),
    ).toBe(false);
  });
});
