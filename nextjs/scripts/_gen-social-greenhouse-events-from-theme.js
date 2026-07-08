/* eslint-disable no-console */
/**
 * One-shot converter: plant-bingo-bash events-data.ts → social-greenhouse-events-data.js
 * Run: node ./scripts/_gen-social-greenhouse-events-from-theme.js
 */
const fs = require("node:fs");
const path = require("node:path");

const {
  DEFAULT_BINGO_ROUNDS,
  DEFAULT_EVENT_FAQS,
  DEFAULT_WHATS_INCLUDED,
  DEFAULT_CHECKIN_STEPS,
  DEFAULT_HERO_TAGLINE,
  HOST_IMAGE_BY_KEY,
  buildDetailContent,
  defaultDescriptionTitle,
} = require("./social-greenhouse-event-detail-defaults");

const SRC = path.join(
  __dirname,
  "..",
  "storage",
  "_install-plant-bingo-bash",
  "src",
  "lib",
  "events-data.ts",
);
const OUT = path.join(__dirname, "social-greenhouse-events-data.js");

const STATE_TZ = {
  Colorado: "America/Denver",
  Florida: "America/New_York",
  "North Carolina": "America/New_York",
  Oregon: "America/Los_Angeles",
  Tennessee: "America/Chicago",
  Texas: "America/Chicago",
  Minnesota: "America/Chicago",
  "New York": "America/New_York",
};

const STATE_ABBR = {
  Colorado: "CO",
  Florida: "FL",
  "North Carolina": "NC",
  Oregon: "OR",
  Tennessee: "TN",
  Texas: "TX",
  Minnesota: "MN",
  "New York": "NY",
};

const STATE_OFFSET = {
  Colorado: "-06:00",
  Florida: "-04:00",
  "North Carolina": "-04:00",
  Oregon: "-07:00",
  Tennessee: "-05:00",
  Texas: "-05:00",
  Minnesota: "-05:00",
  "New York": "-04:00",
};

const MONTH = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };

const CITY_COORDS = {
  "Dallas / Fort Worth": { lat: 32.7767, lng: -96.797 },
  Austin: { lat: 30.2672, lng: -97.7431 },
  Denver: { lat: 39.7392, lng: -104.9903 },
  Jacksonville: { lat: 30.3322, lng: -81.6557 },
  Asheville: { lat: 35.5951, lng: -82.5515 },
  Portland: { lat: 45.5152, lng: -122.6784 },
  Nashville: { lat: 36.1627, lng: -86.7816 },
  Minneapolis: { lat: 44.9778, lng: -93.265 },
  Kingston: { lat: 41.927, lng: -73.997 },
};

function inferVenueType(venue) {
  const v = venue.toLowerCase();
  if (v.includes("pickle")) return "Entertainment venue";
  if (v.includes("puttery") || v.includes("mini golf")) return "Entertainment venue";
  if (v.includes("cider")) return "Cidery";
  if (v.includes("nursery") || v.includes("greenhouse")) return "Nursery";
  if (v.includes("taproom") || v.includes("alehouse") || v.includes("ale works")) return "Taproom";
  if (v.includes("brew")) return "Brewery";
  if (v.includes("book bingo")) return "Brewery";
  return "Venue";
}

function parseClock(str) {
  const m = String(str).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return { h: 19, min: 0 };
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return { h, min };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function toIso(year, month, day, clock, offset) {
  const { h, min } = parseClock(clock);
  return `${year}-${pad(month)}-${pad(day)}T${pad(h)}:${pad(min)}:00.000${offset}`;
}

function parseAddress(address) {
  const m = String(address).match(/^(.+),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (!m) {
    return { street: address, city: "", stateAbbr: "", postal: "" };
  }
  return { street: m[1].trim(), city: m[2].trim(), stateAbbr: m[3], postal: m[4] };
}

function extractField(block, key) {
  const re = new RegExp(`${key}:\\s*("((?:\\\\.|[^"\\\\])*)"|([\\d.]+)|true|false)`, "m");
  const m = block.match(re);
  if (!m) return null;
  if (m[2] != null) return m[2].replace(/\\"/g, '"');
  if (m[3] != null) return Number(m[3]);
  return m[1] === "true";
}

function extractHost(block) {
  const m = block.match(
    /host:\s*\{\s*name:\s*"([^"]+)",\s*bio:\s*"([^"]+)",\s*image:\s*(\w+)/,
  );
  if (!m) return null;
  return { name: m[1], bio: m[2], imageKey: m[3] };
}

function extractSponsor(block) {
  const m = block.match(
    /sponsor:\s*\{\s*name:\s*"([^"]+)",\s*address:\s*"([^"]+)",\s*phone:\s*"([^"]+)",\s*perk:\s*"([^"]+)"/,
  );
  if (!m) return null;
  return { name: m[1], address: m[2], phone: m[3], perk: m[4] };
}

function titleFromVenue(venue) {
  if (/book bingo/i.test(venue)) {
    return venue.replace(/\s+/g, " ").trim();
  }
  const clean = venue.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();
  return `Plant Bingo at ${clean}`;
}

function shortDesc(venue, city, state) {
  return `Plant bingo night at ${venue} in ${city}, ${state}.`;
}

function longDescription(ev) {
  const age = ev.under21 ? "21+ only." : "All ages welcome.";
  return [
    `You're invited to Plant Bingo at ${ev.venue} in ${ev.city}!`,
    "Play classic bingo, meet plant lovers, enjoy local venues, and win beautiful plants to take home.",
    `Doors open ${ev.doorsOpen}; bingo runs ${ev.time} – ${ev.endTime}.`,
    age,
    ev.foodAndDrinks,
  ].join(" ");
}

const src = fs.readFileSync(SRC, "utf8");
const start = src.indexOf("export const events: EventDetail[] = [");
const end = src.indexOf("];", start);
const arr = src.slice(start, end);
const rawBlocks = arr.split(/\n  \},\n  \{/).map((b, i, a) => {
  let s = b;
  if (i === 0) s = s.replace(/^[\s\S]*?export const events: EventDetail\[\] = \[\s*\{/, "");
  if (i === a.length - 1) s = s.replace(/\s*$/, "");
  return s;
});

const events = rawBlocks.map((block) => {
  const slug = extractField(block, "slug");
  const month = extractField(block, "month");
  const day = String(extractField(block, "day")).padStart(2, "0");
  const year = Number(extractField(block, "year"));
  const city = extractField(block, "city");
  const state = extractField(block, "state");
  const venue = extractField(block, "venue");
  const dayName = extractField(block, "day_name");
  const doorsOpen = extractField(block, "doorsOpen");
  const time = extractField(block, "time");
  const endTime = extractField(block, "endTime");
  const left = Number(extractField(block, "left"));
  const price = Number(extractField(block, "price"));
  const address = extractField(block, "address");
  const venuePhone = extractField(block, "venuePhone");
  const under21 = Boolean(extractField(block, "under21"));
  const foodAndDrinks = extractField(block, "foodAndDrinks");
  const soldOut = Boolean(extractField(block, "soldOut")) || left <= 0;
  const hostRaw = extractHost(block);
  const sponsorRaw = extractSponsor(block);

  const capacity = 80;
  const ticketsSold = soldOut ? capacity : Math.max(0, capacity - left);
  const tz = STATE_TZ[state] || "America/Chicago";
  const offset = STATE_OFFSET[state] || "-05:00";
  const monthNum = MONTH[month] || 7;
  const addr = parseAddress(address);
  const coords = CITY_COORDS[city] || { lat: null, lng: null };
  const stateAbbr = STATE_ABBR[state] || addr.stateAbbr || "";
  const hostImageUrl = hostRaw?.imageKey ? HOST_IMAGE_BY_KEY[hostRaw.imageKey] || "" : "";

  const base = {
    slug,
    title: titleFromVenue(venue),
    featured: false,
    ageRule: under21 ? "21+" : "All ages",
    venueType: inferVenueType(venue),
    startsAt: toIso(year, monthNum, day, time, offset),
    endsAt: toIso(year, monthNum, day, endTime, offset),
    timezone: tz,
    dayName,
    doorsOpen,
    bingoStart: time,
    bingoEnd: endTime,
    venueName: venue,
    venueAddress: addr.street,
    venueCity: city.includes("/") ? city.split("/")[0].trim() : city,
    venueState: stateAbbr,
    venuePostalCode: addr.postal,
    venueLat: coords.lat,
    venueLng: coords.lng,
    venuePhone,
    price,
    cardsIncluded: 10,
    extraCardPrice: 5,
    capacity,
    ticketsSold,
    soldOut,
    foodAndDrinks,
    attire: "Casual",
    instructorName: hostRaw?.name || "",
    hostName: hostRaw?.name || "",
    hostBio: hostRaw?.bio || "",
    hostImageUrl,
    sponsorName: sponsorRaw?.name || "",
    sponsorAddress: sponsorRaw?.address || "",
    sponsorPhone: sponsorRaw?.phone || "",
    sponsorPerk: sponsorRaw?.perk || "",
    heroTagline: DEFAULT_HERO_TAGLINE,
    descriptionTitle: defaultDescriptionTitle(venue),
    cardFeePercent: 3.5,
    whatsIncluded: [...DEFAULT_WHATS_INCLUDED],
    checkInSteps: [...DEFAULT_CHECKIN_STEPS],
    bingoRounds: [...DEFAULT_BINGO_ROUNDS],
    faqs: [...DEFAULT_EVENT_FAQS],
    description: longDescription({
      venue,
      city,
      doorsOpen,
      time,
      endTime,
      under21,
      foodAndDrinks,
    }),
    shortDescription: shortDesc(venue, city, state),
    imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80",
  };

  return {
    ...base,
    detailContent: buildDetailContent(base),
    whatsIncludedText: base.whatsIncluded.join("\n"),
    checkInStepsText: base.checkInSteps.join("\n"),
  };
});

const featuredSlugs = new Set([
  "denver-aug-17",
  "dallas-07-11-chicken-n-pickle-grapevin",
  "austin-jul-26",
  "portland-aug-03",
]);
for (const ev of events) {
  if (featuredSlugs.has(ev.slug)) ev.featured = true;
}

const file = `/**
 * Plant Bingo events from The Social Greenhouse company site (plant-bingo-bash theme).
 * Generated from storage/_install-plant-bingo-bash/src/lib/events-data.ts
 * ${events.length} events with full public page detail_content.
 */
module.exports = {
  category: {
    slug: "plant-bingo",
    name: "Plant Bingo",
    description: "Community plant bingo nights at breweries, cideries, nurseries, and local venues.",
  },
  events: ${JSON.stringify(events, null, 2)},
};
`;

fs.writeFileSync(OUT, file);
console.log(`Wrote ${events.length} events → ${OUT}`);
const byState = {};
for (const e of events) {
  byState[e.venueState] = (byState[e.venueState] || 0) + 1;
}
console.log(byState);
