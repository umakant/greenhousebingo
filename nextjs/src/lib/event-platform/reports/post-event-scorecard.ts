export type ScorecardDimension = {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  detail: string;
};

export type ScorecardRecommendation = {
  id: string;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
};

export type PostEventScorecard = {
  overallScore: number;
  dimensions: ScorecardDimension[];
  recommendations: ScorecardRecommendation[];
  isCompletedEvent: boolean;
};

export type ScorecardInput = {
  eventStatus: string;
  checkInRate: number | null;
  capacityPct: number | null;
  profitMargin: number | null;
  netProfit: number;
  checklistPercent: number;
  venueAvgProfit: number | null;
  venueThisProfit: number;
  hostRating: number | null;
  hostOnTime: boolean | null;
  plantGapCount: number;
  lowStockPlantNames: string[];
  marketingRoiBySource: Array<{ source: string; roi: number | null; registrations: number }>;
  bonusCardBuyers: number;
  bonusCardAverage: number | null;
  lowestPerformingSource: string | null;
  daysUntilEventWas: number | null;
  capacityFillPct: number | null;
};

export function buildPostEventScorecard(input: ScorecardInput): PostEventScorecard {
  const isCompleted = ["completed", "archived"].includes(input.eventStatus.toLowerCase());

  const dimensions: ScorecardDimension[] = [
    { id: "attendance", label: "Attendance", score: scoreAttendance(input.checkInRate, input.capacityPct), maxScore: 100, detail: detailAttendance(input) },
    { id: "profitability", label: "Profitability", score: scoreProfitability(input.profitMargin, input.netProfit), maxScore: 100, detail: detailProfitability(input) },
    { id: "venue", label: "Venue", score: scoreVenue(input.venueAvgProfit, input.venueThisProfit), maxScore: 100, detail: detailVenue(input) },
    { id: "host", label: "Host", score: scoreHost(input.hostRating, input.hostOnTime), maxScore: 100, detail: detailHost(input) },
    { id: "plants", label: "Plant selection", score: scorePlants(input.plantGapCount, input.lowStockPlantNames.length), maxScore: 100, detail: detailPlants(input) },
    { id: "marketing", label: "Marketing", score: scoreMarketing(input.marketingRoiBySource), maxScore: 100, detail: detailMarketing(input) },
    { id: "operations", label: "Operational readiness", score: scoreOperations(input.checklistPercent), maxScore: 100, detail: detailOperations(input) },
  ];

  const overallScore = Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);

  return {
    overallScore,
    dimensions,
    recommendations: buildRecommendations(input, dimensions),
    isCompletedEvent: isCompleted,
  };
}

function scoreAttendance(checkInRate: number | null, capacityPct: number | null): number {
  let s = 40;
  if (checkInRate != null) s += Math.min(35, Math.round(checkInRate * 0.35));
  if (capacityPct != null) s += Math.min(25, Math.round(capacityPct * 0.25));
  return clamp(s);
}

function scoreProfitability(margin: number | null, net: number): number {
  if (net < 0) return clamp(25 + Math.max(-25, Math.round(net / 50)));
  if (margin == null) return net > 0 ? 70 : 45;
  if (margin >= 25) return 95;
  if (margin >= 10) return 80;
  if (margin >= 0) return 65;
  return 40;
}

function scoreVenue(avgProfit: number | null, thisProfit: number): number {
  if (avgProfit == null) return thisProfit >= 0 ? 65 : 45;
  if (thisProfit >= avgProfit * 1.1) return 90;
  if (thisProfit >= avgProfit * 0.9) return 75;
  return thisProfit >= 0 ? 55 : 35;
}

function scoreHost(rating: number | null, onTime: boolean | null): number {
  let s = 60;
  if (rating != null) s += Math.min(30, Math.round(rating * 6));
  if (onTime === true) s += 10;
  if (onTime === false) s -= 15;
  return clamp(s);
}

function scorePlants(gapCount: number, lowStockCount: number): number {
  if (gapCount > 0) return clamp(40 - gapCount * 5);
  if (lowStockCount > 0) return clamp(70 - lowStockCount * 8);
  return 85;
}

function scoreMarketing(sources: ScorecardInput["marketingRoiBySource"]): number {
  if (sources.length === 0) return 50;
  const withRoi = sources.filter((s) => s.roi != null);
  if (withRoi.length === 0) return 55;
  const avg = withRoi.reduce((sum, x) => sum + (x.roi ?? 0), 0) / withRoi.length;
  if (avg >= 100) return 90;
  if (avg >= 25) return 75;
  if (avg >= 0) return 60;
  return 40;
}

function scoreOperations(checklistPercent: number): number {
  if (checklistPercent >= 90) return 95;
  if (checklistPercent >= 75) return 80;
  if (checklistPercent >= 50) return 60;
  return 40;
}

function buildRecommendations(input: ScorecardInput, dims: ScorecardDimension[]): ScorecardRecommendation[] {
  const recs: ScorecardRecommendation[] = [];
  const venueDim = dims.find((d) => d.id === "venue");
  const hostDim = dims.find((d) => d.id === "host");
  const opsDim = dims.find((d) => d.id === "operations");

  if (venueDim && venueDim.score >= 75 && input.venueThisProfit >= 0) {
    recs.push({
      id: "venue-repeat",
      title: "Schedule this venue again",
      reason: `Event profit (${fmtMoney(input.venueThisProfit)}) met or exceeded venue average.`,
      priority: "medium",
    });
  }

  for (const name of input.lowStockPlantNames.slice(0, 2)) {
    recs.push({
      id: `plant-stock-${name}`,
      title: `Increase ${name} inventory`,
      reason: `${name} reached low or zero stock during this event.`,
      priority: "high",
    });
  }

  if (input.plantGapCount > 0) {
    recs.push({
      id: "plant-gap",
      title: "Close plant inventory gaps before next event",
      reason: `${input.plantGapCount} plant request(s) exceeded available inventory.`,
      priority: "high",
    });
  }

  if (input.lowestPerformingSource) {
    recs.push({
      id: "marketing-trim",
      title: `Reduce promotion spend from ${input.lowestPerformingSource}`,
      reason: "Lowest ROI among attributed channels with measurable spend.",
      priority: "medium",
    });
  }

  if (
    input.capacityFillPct != null &&
    input.capacityFillPct < 50 &&
    input.daysUntilEventWas != null &&
    input.daysUntilEventWas <= 14
  ) {
    recs.push({
      id: "promote-earlier",
      title: "Start ticket promotion earlier",
      reason: `Only ${input.capacityFillPct}% capacity filled near event date.`,
      priority: "high",
    });
  }

  if (input.bonusCardAverage != null && input.bonusCardBuyers > 0 && input.bonusCardAverage >= 2) {
    recs.push({
      id: "bonus-inventory",
      title: "Increase bonus-card inventory",
      reason: `Avg ${input.bonusCardAverage.toFixed(1)} bonus cards per buyer indicates strong add-on demand.`,
      priority: "medium",
    });
  }

  if (hostDim && hostDim.score >= 80 && input.hostRating != null && input.hostRating >= 4) {
    recs.push({
      id: "host-repeat",
      title: "Use the same host again",
      reason: `Host rating ${input.hostRating}/5 with solid arrival performance.`,
      priority: "medium",
    });
  }

  if (opsDim && opsDim.score < 70) {
    recs.push({
      id: "checklist",
      title: "Complete operational checklist earlier",
      reason: "Checklist completion was below 75%.",
      priority: "medium",
    });
  }

  return recs.slice(0, 8);
}

function detailAttendance(input: ScorecardInput): string {
  return `Check-in ${input.checkInRate ?? "—"}%, capacity fill ${input.capacityPct ?? "—"}%.`;
}
function detailProfitability(input: ScorecardInput): string {
  return `Net ${fmtMoney(input.netProfit)}, margin ${input.profitMargin ?? "—"}%.`;
}
function detailVenue(input: ScorecardInput): string {
  return input.venueAvgProfit != null
    ? `Profit ${fmtMoney(input.venueThisProfit)} vs venue avg ${fmtMoney(input.venueAvgProfit)}.`
    : "Insufficient venue history.";
}
function detailHost(input: ScorecardInput): string {
  return input.hostRating != null ? `Rating ${input.hostRating}/5.` : "Rating not available.";
}
function detailPlants(input: ScorecardInput): string {
  return `${input.plantGapCount} gap(s), ${input.lowStockPlantNames.length} low-stock type(s).`;
}
function detailMarketing(input: ScorecardInput): string {
  return `${input.marketingRoiBySource.length} attributed source(s).`;
}
function detailOperations(input: ScorecardInput): string {
  return `Checklist ${input.checklistPercent}% complete.`;
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}
