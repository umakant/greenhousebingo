import type { SeatmapLayout } from "@/lib/event-platform/seatmaps/seatmap-schemas";

export function countSeatsInLayout(layout: SeatmapLayout | null | undefined): number {
  if (!layout?.sections?.length) return 0;
  return layout.sections.reduce(
    (sum, section) => sum + section.rows.reduce((rowSum, row) => rowSum + (row.seats?.length ?? 0), 0),
    0,
  );
}

export function countSectionsInLayout(layout: SeatmapLayout | null | undefined): number {
  return layout?.sections?.length ?? 0;
}

export function countRowsInLayout(layout: SeatmapLayout | null | undefined): number {
  if (!layout?.sections?.length) return 0;
  return layout.sections.reduce((sum, section) => sum + section.rows.length, 0);
}

export function inferMapType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("arena") || n.includes("stadium")) return "Arena";
  if (n.includes("amphitheater")) return "Amphitheater";
  if (n.includes("theater") || n.includes("hall")) return "Theater";
  if (n.includes("banquet") || n.includes("ballroom")) return "Banquet";
  if (n.includes("lounge") || n.includes("vip")) return "Lounge";
  if (n.includes("exhibition")) return "General";
  return "General";
}

export function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("concert") || n.includes("arena") || n.includes("amphitheater") || n.includes("festival")) {
    return "Concert";
  }
  if (n.includes("conference") || n.includes("training") || n.includes("workshop")) return "Conference";
  if (n.includes("banquet") || n.includes("ballroom")) return "Banquet";
  if (n.includes("exhibition")) return "Exhibition";
  if (n.includes("lounge") || n.includes("vip") || n.includes("rooftop")) return "Special";
  return "General";
}

export function inferPreviewVariant(mapType: string): "arena" | "theater" | "general" {
  if (mapType === "Arena" || mapType === "Amphitheater") return "arena";
  if (mapType === "Theater") return "theater";
  return "general";
}
