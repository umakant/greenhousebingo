import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/event-platform/reports/event-report-service", () => ({
  buildEventReport: vi.fn(),
}));

vi.mock("@/lib/html-to-pdf-server", () => ({
  htmlToPdfBuffer: vi.fn(async () => Buffer.from("pdf")),
}));

vi.mock("@/lib/event-platform/event-platform-api-auth", () => ({
  requireEventPlatformApi: vi.fn(async () => ({
    organizationId: 1n,
    userId: 2n,
    permissions: ["events.view"],
  })),
  isEventPlatformApiError: () => false,
}));

import { buildEventReport } from "@/lib/event-platform/reports/event-report-service";
import { GET } from "@/app/api/event-platform/events/[id]/reports/route";

function makeRequest(url: string) {
  return new NextRequest(url);
}

describe("reports route", () => {
  it("returns 404 when event missing", async () => {
    vi.mocked(buildEventReport).mockResolvedValueOnce(null);
    const res = await GET(
      makeRequest("http://localhost/api/event-platform/events/99/reports"),
      { params: Promise.resolve({ id: "99" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns json report by default", async () => {
    vi.mocked(buildEventReport).mockResolvedValueOnce({
      generatedAt: new Date().toISOString(),
      eventId: "1",
      eventSummary: { name: "Test Event" },
    } as Awaited<ReturnType<typeof buildEventReport>>);

    const res = await GET(
      makeRequest("http://localhost/api/event-platform/events/1/reports"),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.report.eventId).toBe("1");
  });
});
