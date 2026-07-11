import type { EventReportData } from "@/lib/event-platform/reports/event-report-types";

function esc(s: string | number | null | undefined): string {
  if (s == null) return "—";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function money(n: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

function section(title: string, rows: Array<[string, string]>): string {
  const body = rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`).join("");
  return `<section><h2>${esc(title)}</h2><table>${body}</table></section>`;
}

export function eventReportToHtml(report: EventReportData): string {
  const c = report.financialSummary.currency;
  const es = report.eventSummary;
  const fs = report.financialSummary;

  const sections = [
    section("Event Summary", [
      ["Event", esc(es.name)],
      ["Date", new Date(es.date).toLocaleString()],
      ["Venue", esc(es.venue)],
      ["Host", esc(es.host)],
      ["Status", esc(es.status)],
      ["Capacity", es.capacity != null ? String(es.capacity) : "—"],
      ["Registrations", String(es.registrations)],
      ["Checked in", String(es.checkedIn)],
      ["Walk-ins", String(es.walkIns)],
      ["No-shows", String(es.noShows)],
      ["Check-in rate", es.checkInRate != null ? `${es.checkInRate}%` : "—"],
    ]),
    section("Financial Summary", [
      ["Ticket revenue", money(fs.ticketRevenue, c)],
      ["Bonus-card revenue", money(fs.bonusCardRevenue, c)],
      ["Sponsor revenue", money(fs.sponsorRevenue, c)],
      ["Other revenue", money(fs.otherRevenue, c)],
      ["Gross revenue", money(fs.grossRevenue, c)],
      ["Host cost", money(fs.hostCost, c)],
      ["Plant cost", money(fs.plantCost, c)],
      ["Venue cost", money(fs.venueCost, c)],
      ["Promotion cost", money(fs.promotionCost, c)],
      ["Affiliate cost", money(fs.affiliateCost, c)],
      ["Other expenses", money(fs.otherExpenses, c)],
      ["Total expenses", money(fs.totalExpenses, c)],
      ["Net profit", money(fs.netProfit, c)],
      ["Profit margin", fs.profitMargin != null ? `${fs.profitMargin}%` : "—"],
    ]),
    section("Attendee Summary", [
      ["New attendees", String(report.attendeeSummary.newAttendees)],
      ["Returning attendees", String(report.attendeeSummary.returningAttendees)],
      ["Bonus-card buyers", String(report.attendeeSummary.bonusCardBuyers)],
      ["Power buyers", String(report.attendeeSummary.powerBuyers)],
      ["Winners", String(report.attendeeSummary.winners)],
      ["Check-in rate", report.attendeeSummary.checkInRate != null ? `${report.attendeeSummary.checkInRate}%` : "—"],
    ]),
    section("Game Summary", [
      ["Games scheduled", String(report.gameSummary.scheduled)],
      ["Games completed", String(report.gameSummary.completed)],
      ["Winners", String(report.gameSummary.winners)],
      ["Repeat winners", String(report.gameSummary.repeatWinners)],
      ["Included-card wins", String(report.gameSummary.includedCardWins)],
      ["Bonus-card wins", String(report.gameSummary.bonusCardWins)],
    ]),
    section("Plant Summary", [
      ["Plants purchased", String(report.plantSummary.purchased)],
      ["Plants awarded", String(report.plantSummary.awarded)],
      ["Plants remaining", String(report.plantSummary.remaining)],
      ["Total plant cost", money(report.plantSummary.totalCost, c)],
      ["Inventory gaps", String(report.plantSummary.inventoryGaps)],
    ]),
    section("Venue Performance", [
      ["Events at venue", report.venuePerformance.eventsAtVenue != null ? String(report.venuePerformance.eventsAtVenue) : "—"],
      ["Avg attendance", report.venuePerformance.avgAttendance != null ? String(report.venuePerformance.avgAttendance) : "—"],
      ["Avg revenue", report.venuePerformance.avgRevenue != null ? money(report.venuePerformance.avgRevenue, c) : "—"],
      ["Avg profit", report.venuePerformance.avgProfit != null ? money(report.venuePerformance.avgProfit, c) : "—"],
    ]),
    section("Host Performance", [
      ["Host total events", report.hostPerformance.totalEvents != null ? String(report.hostPerformance.totalEvents) : "—"],
      ["Avg attendance", report.hostPerformance.avgAttendance != null ? String(report.hostPerformance.avgAttendance) : "—"],
      ["Avg revenue", report.hostPerformance.avgRevenue != null ? money(report.hostPerformance.avgRevenue, c) : "—"],
      ["Rating", report.hostPerformance.rating != null ? `${report.hostPerformance.rating}/5` : "Not available"],
    ]),
    section("Operational Notes", [
      ["Checklist completion", `${report.operationalNotes.checklistPercent}% (${report.operationalNotes.checklistCompleted}/${report.operationalNotes.checklistTotal})`],
      ["Incidents", String(report.operationalNotes.incidentCount)],
      ["Outstanding payments", String(report.operationalNotes.outstandingPayments)],
    ]),
  ].join("");

  const recs = report.scorecard.recommendations
    .map((r) => `<li><strong>${esc(r.title)}</strong> — ${esc(r.reason)} <em>(${esc(r.priority)})</em></li>`)
    .join("");

  const scores = report.scorecard.dimensions
    .map((d) => `<tr><td>${esc(d.label)}</td><td>${d.score}/${d.maxScore}</td><td>${esc(d.detail)}</td></tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Event Report — ${esc(es.name)}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #111; }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .meta { color: #555; font-size: 0.875rem; margin-bottom: 1.5rem; }
  section { margin-bottom: 1.5rem; page-break-inside: avoid; }
  h2 { font-size: 1rem; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th { text-align: left; width: 40%; padding: 0.35rem 0.5rem; color: #444; font-weight: 600; vertical-align: top; }
  td { padding: 0.35rem 0.5rem; }
  ul { font-size: 0.875rem; }
  @media print { body { margin: 0.5in; } }
</style>
</head>
<body>
<h1>${esc(es.name)}</h1>
<p class="meta">Generated ${esc(new Date(report.generatedAt).toLocaleString())} · Post-event score ${report.scorecard.overallScore}/100</p>
${sections}
<section><h2>Post-Event Scorecard</h2><table>${scores}</table></section>
<section><h2>Recommendations</h2><ul>${recs || "<li>No recommendations at this time.</li>"}</ul>
<p style="font-size:0.75rem;color:#666">Recommendations are rule-based from event metrics, not AI-generated analytics.</p></section>
</body>
</html>`;
}
