import "server-only";

import { seatmapOverviewDemo } from "@/lib/event-platform/seatmaps/seatmap-overview-demo";
import {
  countRowsInLayout,
  countSectionsInLayout,
  countSeatsInLayout,
  inferCategory,
  inferMapType,
  inferPreviewVariant,
} from "@/lib/event-platform/seatmaps/seatmap-layout-utils";
import type { SeatmapLayout } from "@/lib/event-platform/seatmaps/seatmap-schemas";
import type {
  SeatmapKpiBlock,
  SeatmapOverviewPayload,
  SeatmapTemplateRow,
} from "@/lib/event-platform/seatmaps/seatmap-overview-types";
import { prisma } from "@/lib/prisma";

function rowFromDb(row: {
  id: bigint;
  name: string;
  status: string;
  layoutJson: unknown;
  createdAt: Date;
  updatedAt: Date | null;
  archivedAt: Date | null;
}): SeatmapTemplateRow {
  const layout = row.layoutJson as SeatmapLayout;
  const mapType = inferMapType(row.name);
  const seatCount = countSeatsInLayout(layout);
  return {
    id: row.id.toString(),
    name: row.name,
    updatedAt: (row.updatedAt ?? row.createdAt).toISOString().slice(0, 10),
    createdAt: row.createdAt.toISOString().slice(0, 10),
    category: inferCategory(row.name),
    mapType,
    seatCount: seatCount || 0,
    usedInEvents: 0,
    status: row.archivedAt ? "archived" : row.status,
    sectionCount: countSectionsInLayout(layout),
    rowCount: countRowsInLayout(layout),
    previewVariant: inferPreviewVariant(mapType),
  };
}

export async function getSeatmapOverview(organizationId: bigint): Promise<SeatmapOverviewPayload> {
  const count = await prisma.eventSeatmapTemplate.count({ where: { organizationId } });
  if (count === 0) {
    return seatmapOverviewDemo();
  }

  const rows = await prisma.eventSeatmapTemplate.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
  });

  const mapped = rows.map(rowFromDb);
  const activeMaps = mapped.filter((r) => r.status !== "archived");
  const archivedMaps = mapped.filter((r) => r.status === "archived");
  const totalSeats = mapped.reduce((s, r) => s + r.seatCount, 0);
  const totalSections = mapped.reduce((s, r) => s + r.sectionCount, 0);

  const kpis: SeatmapKpiBlock = {
    totalMaps: activeMaps.length,
    totalMapsSub: "Active templates",
    totalSeats,
    totalSeatsSub: "Across all maps",
    usageCount: 0,
    usageSub: "Used in events",
    avgOccupancy: totalSeats > 0 ? 0 : 0,
    avgOccupancySub: "Across events",
    sectionCount: totalSections,
    sectionSub: "Across all maps",
  };

  return {
    ok: true,
    isDemo: false,
    kpis,
    activeMaps,
    archivedMaps,
    activeTotal: activeMaps.length,
  };
}
