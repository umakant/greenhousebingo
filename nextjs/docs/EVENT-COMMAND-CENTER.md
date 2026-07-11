# Event Command Center

Canonical route: `/admin/event-platform/events/[id]` with tab query params (`?tab=attendees`, etc.) and Live Mode (`?live=1`).

## Architecture

```
EventCommandCenter (client)
  └── EventCommandCenterProvider (context)
        ├── GET /api/event-platform/events/[id]/command-center  → overview KPIs, health, charts
        ├── GET /api/lms/admin/events/[id]                      → tickets, attendees list
        └── Tab panels (lazy-mounted via useActiveTabMount)
              ├── Overview      → command-center summary
              ├── Attendees     → event-attendees-service
              ├── Games         → bingo-round-service
              ├── Plants        → event-plant-service
              ├── Financials    → event-financials-service
              ├── Venue & Host  → event-venue-host-service
              ├── Marketing     → event-marketing-service
              ├── Activity      → event-operations-service (EventAuditLog + checklist)
              └── Live Mode     → live-event-service (?live=1 overlay)
```

All data is **tenant-scoped** via `organizationId` on every query (`requireEventPlatformApi`).

## Data sources

| Area | Primary tables / sources |
|------|-------------------------|
| Event summary | `lms_events`, `detailContent` JSON |
| Registrations | `lms_event_registrations`, `lms_event_transactions` |
| Games / winners | `event_bingo_round_instances`, `event_bingo_winners` |
| Plants | `event_plants`, `event_plant_requests` |
| Financials | `event_expenses`, `lms_event_transactions`, commission ledger |
| Marketing | Registration attribution fields + `affiliate_commissions` |
| Activity | `event_audit_logs` (reuse — no separate EventActivity model) |
| Checklist | `event_operational_tasks` |
| Incidents (live) | `event_live_incidents` |

## New models (Phases 8–11)

- `EventHostPerformanceNote` — host notes
- `EventOperationalTask` — operational checklist (idempotent defaults via `templateKey`)
- `EventAlertDismissal` — non-critical alert dismissals
- `EventLiveIncident` — live event incident notes
- `EventAuditLog.eventId` — optional FK for event-scoped activity queries

Run migrations:

```powershell
cd nextjs
npx prisma migrate deploy
npx prisma generate
```

## APIs

| Route | Purpose |
|-------|---------|
| `GET .../command-center` | Overview JSON |
| `GET .../reports?format=json\|html\|pdf` | Unified event report |
| `GET .../reports` (JSON) | Report + scorecard data |
| `GET .../attendees/export` | Attendee CSV |
| `GET .../financials/export?section=lines\|summary` | P&L lines or summary CSV |
| `GET .../games/export?section=winners` | Winner list CSV |
| `GET .../plants/export` | Plant inventory CSV |
| `GET .../plants/requests/export` | Plant requests CSV |
| `GET .../marketing/export?section=...` | Marketing sectional CSV |
| `GET .../operations/export` | Activity log CSV |
| `GET .../venue-host/export?section=venue\|host` | History CSV |
| `GET .../live` | Live mode snapshot (15s poll) |
| `POST .../live/actions` | Walk-in, bonus sale, incident, announcement |

## KPI & health calculations

- **Health score** (`command-center-health.ts`): Weighted factors — capacity fill, host, venue, games, plants, revenue, promotions, checklist. Max 100.
- **Break-even** (`event-financials-service.ts`): `breakEvenRevenue = actual + pending + projected expenses`; tickets/bonus cards needed from remaining gap.
- **Check-in rate**: `checkedIn / validRegistrations × 100`
- **Profit margin**: `netProfit / grossRevenue × 100` (null if gross ≤ 0)
- **Plant remaining**: `quantityPurchased - quantityAwarded - quantityRemoved`
- **Plant popularity**: Request counts + historical wins (`event-plant-service.ts`)
- **Marketing attribution**: Single primary source per registration (affiliate → promo → UTM → venue/host → direct) — no double-counting

## Post-event scorecard

Rule-based dimensions (attendance, profitability, venue, host, plants, marketing, operations) in `post-event-scorecard.ts`. Recommendations are **transparent rules** (e.g. low capacity → “Start ticket promotion earlier”), not AI analytics.

## Permissions

| Permission | Typical use |
|------------|-------------|
| `events.view` | Read tabs, exports, reports |
| `events.update` | Tasks, alerts, incidents, announcements |
| `bookings.manage` | Check-in, walk-ins |
| `bingoGames.manage` | Round lifecycle, winners |
| `payments.manage` | Bonus card sales, financial actions |

## Live Event Mode

Open via **Start Event Mode** or `?live=1`. Full-screen overlay on the same route. Polls `GET .../live` every 15s. Critical actions (payments, walk-in registration, winner record) require server confirmation.

## Reports & exports

Overview tab includes **Event report & exports** panel. PDF uses existing `puppeteer` via `html-to-pdf-server.ts` (same pattern as project SOW PDFs). Print-friendly HTML at `?format=html`.

## Testing

```powershell
cd nextjs
npm run test -- src/lib/event-platform/reports/event-platform-reports.test.ts
npm run test -- src/app/api/event-platform/events/[id]/reports/route.test.ts
```

### Integration test checklist (manual / QA)

Exercise each event state (draft → archived), empty data conditions, attendance edge cases, game/plant/financial scenarios, cross-tenant access denial, and large attendee lists (pagination on list endpoints).

### Automated coverage

- Unit: `report-calculations.ts`, `post-event-scorecard.ts`, `csv-utils.ts`
- Route: reports API permission + 404 handling

## Tenant safeguards

- All services filter by `organizationId` from authenticated session
- No hard-coded company or event IDs in production code paths
- List endpoints use pagination (`page`, `pageSize`)
- Tabs lazy-load to avoid loading all panels at once
