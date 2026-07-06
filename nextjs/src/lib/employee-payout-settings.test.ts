import { describe, expect, it } from "vitest";

import {
  applyPayRatesToSowForm,
  buildDefaultSowFormData,
} from "@/lib/project-sow-form";
import { parseEmployeePayoutDefaults, resolveEmployeePayRates } from "@/lib/employee-payout-settings";

describe("employee payout settings", () => {
  it("parses defaults JSON", () => {
    const defaults = parseEmployeePayoutDefaults(
      JSON.stringify({
        agent: { per_day: "550", half_day: "275" },
        medic: { per_day: "900", half_day: "450" },
        security: { per_day: "400", half_day: "200" },
      }),
    );
    expect(defaults.agent.per_day).toBe("550");
    expect(defaults.medic.half_day).toBe("450");
  });

  it("uses project override over role defaults", () => {
    const defaults = parseEmployeePayoutDefaults(null);
    const rates = resolveEmployeePayRates({
      defaults,
      role: "agent",
      override: { pay_rate: 725, half_day_rate: 362.5 },
    });
    expect(rates.per_day).toBe("725");
    expect(rates.half_day).toBe("362.5");
  });
});

describe("applyPayRatesToSowForm", () => {
  it("fills work period rates and compensation summary", () => {
    const form = buildDefaultSowFormData(
      { name: "Event", company_name: "Co", extra_locations: [] },
      { name: "Jane", email: "j@example.com" },
      [{ role: "agent", work_date: "2026-06-16", end_date: "2026-06-17", start_time: null, end_time: null, position: null }],
    );
    const updated = applyPayRatesToSowForm(form, { per_day: "600", half_day: "300" }, 2);
    expect(updated.work_periods[0]?.daily_rate).toBe("600");
    expect(updated.compensation_summary).toBe("2 total days @ $1200");
  });
});
