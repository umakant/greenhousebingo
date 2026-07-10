import type { CompanySiteEventCard, CompanySiteEventDetail } from "@/lib/company-themes/company-site-events-types";

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function eventUrl(slug: string, sitePrefix: string): string {
  const base = sitePrefix.replace(/\/$/, "");
  return `${base}/events/${encodeURIComponent(slug)}`;
}

type StateGroup = { state: string; code: string; events: CompanySiteEventCard[] };

function groupByState(events: CompanySiteEventCard[]): StateGroup[] {
  const groups: Record<string, StateGroup> = {};
  for (const e of events) {
    const code = e.stateCode || e.state.slice(0, 2).toUpperCase();
    if (!groups[code]) groups[code] = { state: e.state, code, events: [] };
    groups[code].events.push(e);
  }
  return Object.values(groups).sort((a, b) => a.state.localeCompare(b.state));
}

export function renderEventCardHtml(
  e: CompanySiteEventCard,
  sitePrefix: string,
  miles?: number | null,
): string {
  const sold = e.soldOut || e.left <= 0;
  const ticketLine = sold
    ? '<div class="flex items-center gap-2 font-bold text-forest-deep"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9Z"/><path d="M13 13v4"/><path d="M11 13v4"/></svg> Sold out</div>'
    : `<div class="flex items-center gap-2"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9Z"/><path d="M13 13v4"/><path d="M11 13v4"/></svg> $${e.price} · ${e.left} seats left</div>`;
  const milesHtml =
    miles != null
      ? `<span class="text-xs font-bold uppercase tracking-widest text-forest">${miles.toFixed(1)} mi</span>`
      : "";

  return (
    `<a href="${eventUrl(e.slug, sitePrefix)}" class="group rounded-3xl bg-white border border-border shadow-sm hover:shadow-lifted transition p-6 flex flex-col">` +
    '<div class="flex items-start justify-between gap-2">' +
    `<div class="inline-flex items-center gap-2 self-start rounded-full ${e.tint} px-3 py-1 text-xs font-bold uppercase tracking-widest text-forest-deep">` +
    `<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> ${e.month} ${e.day}` +
    "</div>" +
    milesHtml +
    "</div>" +
    `<h3 class="mt-4 font-display text-2xl font-bold text-forest-deep group-hover:text-forest transition">${escapeHtml(e.title || e.venue)}</h3>` +
    `<div class="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg> ${escapeHtml(e.city)}, ${escapeHtml(e.state)}</div>` +
    '<div class="mt-4 space-y-2 text-sm text-muted-foreground">' +
    `<div class="flex items-center gap-2"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ${escapeHtml(e.dayName)} · ${escapeHtml(e.time)}</div>` +
    ticketLine +
    "</div>" +
    `<div class="mt-6 inline-flex items-center gap-1 font-bold text-forest group-hover:gap-2 transition-all">${sold ? "View event (sold out)" : "View event"} <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></div>` +
    "</a>"
  );
}

export function renderEventsListHtml(events: CompanySiteEventCard[], sitePrefix: string): string {
  const groups = groupByState(events);
  let html = "";
  for (const group of groups) {
    html +=
      `<div id="${group.code}" class="scroll-mt-56">` +
      '<div class="flex items-baseline justify-between border-b-2 border-forest/20 pb-4">' +
      `<h2 class="font-display text-3xl font-bold text-forest-deep sm:text-4xl">${escapeHtml(group.state)}</h2>` +
      `<span class="text-sm font-bold uppercase tracking-widest text-forest">${group.events.length} venue${group.events.length === 1 ? "" : "s"}</span>` +
      "</div>" +
      '<div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">';
    for (const e of group.events) {
      html += renderEventCardHtml(e, sitePrefix);
    }
    html += "</div></div>";
  }
  return html;
}

function replaceDivInnerHtmlByClassMarker(html: string, classMarker: string, newInner: string, fromIndex = 0): string {
  const markerIdx = html.indexOf(classMarker, fromIndex);
  if (markerIdx < 0) return html;
  const openStart = html.lastIndexOf("<div", markerIdx);
  if (openStart < 0) return html;
  const contentStart = html.indexOf(">", openStart) + 1;
  let depth = 1;
  let i = contentStart;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf("<div", i);
    const nextClose = html.indexOf("</div>", i);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
    } else {
      depth -= 1;
      if (depth === 0) {
        return html.slice(0, contentStart) + newInner + html.slice(nextClose);
      }
      i = nextClose + 6;
    }
  }
  return html;
}

export function injectHomeEventsHtml(
  html: string,
  events: CompanySiteEventCard[],
  sitePrefix: string,
): string {
  if (!events.length) return html;
  const sectionIdx = html.indexOf('id="events"');
  if (sectionIdx < 0) return html;
  const gridMarker = 'class="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3"';
  const cards = events.slice(0, 6).map((e) => renderEventCardHtml(e, sitePrefix)).join("");
  return replaceDivInnerHtmlByClassMarker(html, gridMarker, cards, sectionIdx);
}

export function injectEventsListHtml(
  html: string,
  events: CompanySiteEventCard[],
  sitePrefix: string,
): string {
  if (!events.length) return html;
  const groups = groupByState(events);
  let output = html.replace(
    /(\d+)(?:<!--\s*-->)?\s*events across(?:\s*<!--\s*-->)?\s*(\d+)(?:<!--\s*-->)?\s*states — and growing\./,
    `${events.length} events across ${groups.length} states — and growing.`,
  );

  const chipsHtml = groups
    .map(
      (g) =>
        `<a href="#${g.code}" class="rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-forest-deep hover:bg-forest hover:text-cream transition">${escapeHtml(g.state)} (${g.events.length})</a>`,
    )
    .join("");

  const chipsMarker = 'class="flex flex-wrap justify-center gap-2"';
  const mountMarker = 'class="mt-16 space-y-16"';
  const mountIdx = output.indexOf(mountMarker);
  if (mountIdx >= 0) {
    output = replaceDivInnerHtmlByClassMarker(
      output,
      mountMarker,
      renderEventsListHtml(events, sitePrefix),
    );
    const sectionIdx = output.lastIndexOf("<section", mountIdx);
    if (sectionIdx >= 0) {
      output = replaceDivInnerHtmlByClassMarker(output, chipsMarker, chipsHtml, sectionIdx);
    }
  }

  return output;
}

export function injectEventDetailHtml(html: string, event: CompanySiteEventDetail): string {
  const title = escapeHtml(event.title);
  const venue = escapeHtml(event.venue);
  const descriptionTitle = escapeHtml(event.descriptionTitle || `You're Invited to ${event.title}!`);
  const pageTitle = `Plant Bingo — ${event.city}, ${event.state} · ${event.month} ${event.day}`;

  let output = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(pageTitle)}</title>`);

  output = output.replace(
    /(<meta name="description" content=")[^"]*(")/,
    `$1${escapeHtml(`${event.title} on ${event.dayName} ${event.month} ${event.day}. Play bingo, win plants, everyone goes home a winner.`)}$2`,
  );

  output = output.replace(
    /(<h1 class="mt-2 font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-cream drop-shadow">)([\s\S]*?)(<\/h1><p class="mt-3 text-lg text-cream\/90">)([\s\S]*?)(<\/p>)/,
    `$1${title}$3${venue}$5`,
  );

  output = output.replace(
    /(<h2 class="font-display text-3xl font-bold text-forest-deep">)([\s\S]*?)(<\/h2>)/,
    `$1${descriptionTitle}$3`,
  );

  return output;
}
