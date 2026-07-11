import { describe, expect, it } from "vitest";

import { escapeCsvCell, csvRow } from "@/lib/event-platform/export/csv-utils";
import {
  bonusCardAverage,
  checkInRate,
  grossRevenue,
  inventoryGap,
  marketingRoi,
  netProfit,
  plantRemaining,
  profitMarginPercent,
  remainingCapacity,
  totalExpenses,
} from "@/lib/event-platform/reports/report-calculations";
import { buildPostEventScorecard } from "@/lib/event-platform/reports/post-event-scorecard";

describe("csv-utils", () => {
  it("escapes commas and quotes", () => {
    expect(escapeCsvCell('say "hello"')).toBe('"say ""hello"""');
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
  });

  it("builds csv rows", () => {
    expect(csvRow(["a", 1, null])).toBe("a,1,");
  });
});

describe("report-calculations", () => {
  it("computes remaining capacity", () => {
    expect(remainingCapacity(100, 40)).toBe(60);
    expect(remainingCapacity(null, 10)).toBeNull();
  });

  it("computes check-in rate", () => {
    expect(checkInRate(80, 100)).toBe(80);
    expect(checkInRate(0, 0)).toBeNull();
  });

  it("computes gross revenue", () => {
    expect(grossRevenue({ ticket: 100, bonus: 20, sponsor: 0, other: 5 })).toBe(125);
  });

  it("computes net profit and margin", () => {
    expect(netProfit(1000, 400)).toBe(600);
    expect(profitMarginPercent(1000, 600)).toBe(60);
    expect(profitMarginPercent(0, 0)).toBeNull();
  });

  it("computes expenses total", () => {
    expect(totalExpenses({ host: 100, venue: 50 })).toBe(150);
  });

  it("computes plant remaining and inventory gap", () => {
    expect(plantRemaining(10, 3, 1)).toBe(6);
    expect(inventoryGap(8, 5)).toBe(3);
  });

  it("computes bonus card average", () => {
    expect(bonusCardAverage([2, 4, 0])).toBe(3);
    expect(bonusCardAverage([])).toBeNull();
  });

  it("computes marketing ROI", () => {
    expect(marketingRoi(150, 100)).toBe(50);
    expect(marketingRoi(100, 0)).toBeNull();
  });
});

describe("post-event-scorecard", () => {
  it("produces rule-based recommendations for low capacity fill", () => {
    const card = buildPostEventScorecard({
      eventStatus: "completed",
      checkInRate: 70,
      capacityPct: 40,
      profitMargin: 12,
      netProfit: 500,
      checklistPercent: 60,
      venueAvgProfit: 400,
      venueThisProfit: 500,
      hostRating: null,
      hostOnTime: true,
      plantGapCount: 0,
      lowStockPlantNames: ["Monstera"],
      marketingRoiBySource: [{ source: "Facebook", roi: -10, registrations: 5 }],
      bonusCardBuyers: 10,
      bonusCardAverage: 2.5,
      lowestPerformingSource: "Facebook",
      daysUntilEventWas: 7,
      capacityFillPct: 35,
    });
    expect(card.overallScore).toBeGreaterThan(0);
    expect(card.recommendations.some((r) => r.id === "promote-earlier")).toBe(true);
    expect(card.recommendations.some((r) => r.title.includes("Monstera"))).toBe(true);
  });

  it("marks completed events", () => {
    const card = buildPostEventScorecard({
      eventStatus: "completed",
      checkInRate: null,
      capacityPct: null,
      profitMargin: null,
      netProfit: 0,
      checklistPercent: 0,
      venueAvgProfit: null,
      venueThisProfit: 0,
      hostRating: null,
      hostOnTime: null,
      plantGapCount: 0,
      lowStockPlantNames: [],
      marketingRoiBySource: [],
      bonusCardBuyers: 0,
      bonusCardAverage: null,
      lowestPerformingSource: null,
      daysUntilEventWas: null,
      capacityFillPct: null,
    });
    expect(card.isCompletedEvent).toBe(true);
  });
});
