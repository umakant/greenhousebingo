export type SeatmapKpiBlock = {
  totalMaps: number;
  totalMapsSub: string;
  totalSeats: number;
  totalSeatsSub: string;
  usageCount: number;
  usageSub: string;
  avgOccupancy: number;
  avgOccupancySub: string;
  sectionCount: number;
  sectionSub: string;
};

export type SeatmapTemplateRow = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  category: string;
  mapType: string;
  seatCount: number;
  usedInEvents: number;
  status: string;
  sectionCount: number;
  rowCount: number;
  previewVariant: "arena" | "theater" | "general";
};

export type SeatmapOverviewPayload = {
  ok: true;
  isDemo: boolean;
  kpis: SeatmapKpiBlock;
  activeMaps: SeatmapTemplateRow[];
  archivedMaps: SeatmapTemplateRow[];
  activeTotal: number;
};
