import { describe, expect, it } from "vitest";

import { resolveGanttTenantCompanyId } from "@/lib/gantt-api-auth";

describe("resolveGanttTenantCompanyId", () => {
  it("uses org id for company tenant", () => {
    expect(
      resolveGanttTenantCompanyId({ id: 1060n, type: "company", createdBy: 1n, creatorId: null }),
    ).toBe(1060n);
  });

  it("uses org id for company_admin tenant", () => {
    expect(
      resolveGanttTenantCompanyId({ id: 1060n, type: "company_admin", createdBy: 1n, creatorId: null }),
    ).toBe(1060n);
  });

  it("uses createdBy for staff", () => {
    expect(
      resolveGanttTenantCompanyId({ id: 2001n, type: "staff", createdBy: 1060n, creatorId: null }),
    ).toBe(1060n);
  });
});
