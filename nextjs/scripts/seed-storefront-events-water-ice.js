/* eslint-disable no-console */

/**
 * Seeder — Water Ice Express May 2026 tour calendar.
 *
 * Inserts a curated set of "Water Ice Express" published events into the
 * `storefront_events` table for a given organization. Mirrors the seasonal
 * calendar shared by the team (Birmingham, Nashville, Charlotte, Jacksonville,
 * Indianapolis, etc.).
 *
 * Idempotent: uses `ON CONFLICT (organization_id, slug) DO UPDATE` so this
 * script can be re-run safely — every event is overwritten with the freshly
 * defined data, never duplicated.
 *
 * Usage:
 *   cd nextjs
 *   node scripts/seed-storefront-events-water-ice.js                 # org 1000, all websites
 *   node scripts/seed-storefront-events-water-ice.js --org 1234      # different org
 *   node scripts/seed-storefront-events-water-ice.js --website 1     # pin to a specific website_id
 *   node scripts/seed-storefront-events-water-ice.js --clear         # wipe prior water-ice-express-* rows for the org first
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { Client } = require("pg");

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

const ORG_ID = BigInt(arg("--org", "1000"));
const WEBSITE_ID_RAW = arg("--website", null);
const WEBSITE_ID = WEBSITE_ID_RAW != null ? BigInt(WEBSITE_ID_RAW) : null;
const SHOULD_CLEAR = hasFlag("--clear");

/**
 * Default slug prefix used for clearing/identifying seeded rows so this
 * doesn't accidentally touch user-created events.
 */
const SEED_SLUG_PREFIX = "water-ice-express-";

/**
 * Three rotating cover images (Unsplash, public CDN, no API key needed) so cards
 * don't look identical on the storefront strip.
 */
const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=1600&q=80", // colorful popsicles
  "https://images.unsplash.com/photo-1497636577773-f1231844b336?auto=format&fit=crop&w=1600&q=80", // rainbow popsicles
  "https://images.unsplash.com/photo-1568827999250-3f6afff96e66?auto=format&fit=crop&w=1600&q=80", // snow cone close-up
];

/** Hours the truck is open at each stop, captured in the local-civil time of the host city. */
const OPEN_HOUR_LOCAL = 11; // 11:00 AM
const CLOSE_HOUR_LOCAL = 21; // 9:00 PM

/**
 * Source-of-truth event list — mirrors the May 2026 calendar graphic.
 * `id` becomes the slug suffix (kept short + URL-safe).
 */
const EVENTS = [
  {
    id: "birmingham-may-2",
    date: "2026-05-02",
    title: "Water Ice Express — Birmingham, AL",
    city: "Birmingham",
    state: "AL",
    latitude: 33.5186,
    longitude: -86.8104,
    venue: "Railroad Park",
    description: "Kick-off pop-up of the Birmingham / Mississippi swing.",
  },
  {
    id: "nashville-may-3",
    date: "2026-05-03",
    title: "Water Ice Express — Nashville & Memphis, TN",
    city: "Nashville",
    state: "TN",
    latitude: 36.1627,
    longitude: -86.7816,
    venue: "Centennial Park",
    description: "Tennessee tour stop — Nashville morning, Memphis evening.",
  },
  {
    id: "louisville-may-9",
    date: "2026-05-09",
    title: "Water Ice Express — Kentucky · Ohio · Georgia",
    city: "Louisville",
    state: "KY",
    latitude: 38.2527,
    longitude: -85.7585,
    venue: "Waterfront Park",
    description: "Tri-state weekend featuring KY, OH and a southern stop in GA.",
    featured: true,
  },
  {
    id: "carolinas-may-11",
    date: "2026-05-11",
    title: "Water Ice Express — Carolinas Tour",
    city: "Charlotte",
    state: "NC",
    latitude: 35.2271,
    longitude: -80.8431,
    venue: "Romare Bearden Park",
    description: "Carolinas swing: Charlotte, Raleigh, Durham, Columbia.",
  },
  {
    id: "birmingham-may-16",
    date: "2026-05-16",
    title: "Water Ice Express — Birmingham, AL (return)",
    city: "Birmingham",
    state: "AL",
    latitude: 33.5186,
    longitude: -86.8104,
    venue: "Railroad Park",
    description: "Return visit to AL & Mississippi — back by popular demand.",
  },
  {
    id: "jacksonville-may-17",
    date: "2026-05-17",
    title: "Water Ice Express — Jacksonville & Ocala, FL",
    city: "Jacksonville",
    state: "FL",
    latitude: 30.3322,
    longitude: -81.6557,
    venue: "Riverside Arts Market",
    description: "Florida double-stop: Jacksonville at noon, Ocala by sunset.",
  },
  {
    id: "nashville-may-17",
    date: "2026-05-17",
    title: "Water Ice Express — Nashville & Memphis, TN (afternoon)",
    city: "Nashville",
    state: "TN",
    latitude: 36.1627,
    longitude: -86.7816,
    venue: "Centennial Park",
    description: "Tennessee afternoon pop-up; Memphis evening location TBA.",
  },
  {
    id: "louisville-may-23",
    date: "2026-05-23",
    title: "Water Ice Express — Kentucky · Ohio",
    city: "Louisville",
    state: "KY",
    latitude: 38.2527,
    longitude: -85.7585,
    venue: "Big Four Lawn",
    description: "Memorial Day weekend kick-off — KY morning, OH afternoon.",
  },
  {
    id: "brunswick-may-23",
    date: "2026-05-23",
    title: "Water Ice Express — Brunswick, GA",
    city: "Brunswick",
    state: "GA",
    latitude: 31.1499,
    longitude: -81.4915,
    venue: "Mary Ross Waterfront Park",
    description: "Coastal Georgia stop — beach-day refreshments.",
  },
  {
    id: "charlotte-may-24",
    date: "2026-05-24",
    title: "Water Ice Express — Charlotte, NC & Columbia, SC",
    city: "Charlotte",
    state: "NC",
    latitude: 35.2271,
    longitude: -80.8431,
    venue: "Freedom Park",
    description: "Memorial weekend Carolinas double-header.",
  },
  {
    id: "indianapolis-may-29",
    date: "2026-05-29",
    title: "Water Ice Express — Indianapolis, IN",
    city: "Indianapolis",
    state: "IN",
    latitude: 39.7684,
    longitude: -86.1581,
    venue: "White River State Park",
    description: "Indy 500 weekend pop-up.",
    featured: true,
  },
  {
    id: "birmingham-may-30",
    date: "2026-05-30",
    title: "Water Ice Express — Birmingham, AL (May finale)",
    city: "Birmingham",
    state: "AL",
    latitude: 33.5186,
    longitude: -86.8104,
    venue: "Railroad Park",
    description: "Closing weekend of the May tour.",
  },
];

function buildIso(date, hour) {
  // Construct in UTC so the value is deterministic across machines/timezones.
  const [y, m, d] = date.split("-").map((s) => Number.parseInt(s, 10));
  return new Date(Date.UTC(y, m - 1, d, hour, 0, 0)).toISOString();
}

function buildLocationLabel(city, state) {
  return [city, state].filter(Boolean).join(", ");
}

function pickImage(idx) {
  return COVER_IMAGES[idx % COVER_IMAGES.length];
}

function makeRow(ev, idx) {
  const slug = `${SEED_SLUG_PREFIX}${ev.id}`;
  return {
    slug,
    title: ev.title,
    location: buildLocationLabel(ev.city, ev.state),
    venue: ev.venue ?? null,
    event_date: buildIso(ev.date, OPEN_HOUR_LOCAL),
    end_date: buildIso(ev.date, CLOSE_HOUR_LOCAL),
    image_url: pickImage(idx),
    link_url: null,
    description: ev.description ?? null,
    status: "published",
    sort_order: idx,
    is_featured: !!ev.featured,
    address_line: null,
    city: ev.city,
    state: ev.state,
    postal_code: null,
    country: "United States",
    latitude: ev.latitude ?? null,
    longitude: ev.longitude ?? null,
  };
}

async function main() {
  const pg = process.env.DATABASE_URL
    ? new Client({ connectionString: process.env.DATABASE_URL })
    : new Client({
        host: process.env.PF_PG_HOST,
        port: process.env.PF_PG_PORT ? Number(process.env.PF_PG_PORT) : 5432,
        database: process.env.PF_PG_DATABASE,
        user: process.env.PF_PG_USER,
        password: process.env.PF_PG_PASSWORD,
      });
  await pg.connect();

  try {
    console.log(
      `[seed:water-ice] org=${ORG_ID.toString()} website=${WEBSITE_ID == null ? "(all)" : WEBSITE_ID.toString()}` +
        (SHOULD_CLEAR ? " clear=yes" : "")
    );

    if (SHOULD_CLEAR) {
      const del = await pg.query(
        `DELETE FROM storefront_events
          WHERE organization_id = $1 AND slug LIKE $2`,
        [ORG_ID.toString(), `${SEED_SLUG_PREFIX}%`]
      );
      console.log(`[seed:water-ice] cleared ${del.rowCount} prior seeded row(s).`);
    }

    let inserted = 0;
    let updated = 0;
    for (let i = 0; i < EVENTS.length; i++) {
      const r = makeRow(EVENTS[i], i);
      const res = await pg.query(
        `INSERT INTO storefront_events (
           organization_id, website_id, slug, title, location, venue,
           event_date, end_date, image_url, link_url, description,
           status, sort_order, is_featured,
           address_line, city, state, postal_code, country, latitude, longitude,
           created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10, $11,
           $12, $13, $14,
           $15, $16, $17, $18, $19, $20, $21,
           CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
         )
         ON CONFLICT (organization_id, slug) DO UPDATE SET
           website_id   = EXCLUDED.website_id,
           title        = EXCLUDED.title,
           location     = EXCLUDED.location,
           venue        = EXCLUDED.venue,
           event_date   = EXCLUDED.event_date,
           end_date     = EXCLUDED.end_date,
           image_url    = EXCLUDED.image_url,
           link_url     = EXCLUDED.link_url,
           description  = EXCLUDED.description,
           status       = EXCLUDED.status,
           sort_order   = EXCLUDED.sort_order,
           is_featured  = EXCLUDED.is_featured,
           address_line = EXCLUDED.address_line,
           city         = EXCLUDED.city,
           state        = EXCLUDED.state,
           postal_code  = EXCLUDED.postal_code,
           country      = EXCLUDED.country,
           latitude     = EXCLUDED.latitude,
           longitude    = EXCLUDED.longitude,
           updated_at   = CURRENT_TIMESTAMP
         RETURNING (xmax = 0) AS inserted`,
        [
          ORG_ID.toString(),
          WEBSITE_ID == null ? null : WEBSITE_ID.toString(),
          r.slug,
          r.title,
          r.location,
          r.venue,
          r.event_date,
          r.end_date,
          r.image_url,
          r.link_url,
          r.description,
          r.status,
          r.sort_order,
          r.is_featured,
          r.address_line,
          r.city,
          r.state,
          r.postal_code,
          r.country,
          r.latitude,
          r.longitude,
        ]
      );
      const wasInsert = res.rows[0]?.inserted === true;
      if (wasInsert) inserted++;
      else updated++;
      console.log(`  ${wasInsert ? "+" : "~"} ${r.slug.padEnd(46)}  ${r.location}  (${r.event_date.slice(0, 10)})`);
    }

    console.log(
      `[seed:water-ice] done. inserted=${inserted} updated=${updated} total=${EVENTS.length}`
    );
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error("[seed:water-ice] failed:", e);
  process.exit(1);
});
