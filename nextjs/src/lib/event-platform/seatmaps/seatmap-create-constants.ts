import type { SeatmapCanvas } from "@/lib/event-platform/seatmaps/seatmap-schemas";

export const SEATMAP_CATEGORIES = [
  "Concert",
  "Conference",
  "Banquet",
  "Exhibition",
  "Special",
  "General",
] as const;

export const SEATMAP_MAP_TYPES = [
  "Arena",
  "Theater",
  "Amphitheater",
  "Banquet",
  "Lounge",
  "General",
] as const;

export const SEATMAP_LAYOUT_SHAPES = [
  { id: "rectangle", label: "Rectangle" },
  { id: "fan_arena", label: "Fan / Arena" },
  { id: "semi_circle", label: "Semi Circle" },
  { id: "custom", label: "Custom" },
] as const satisfies ReadonlyArray<{ id: SeatmapCanvas["shape"]; label: string }>;

export const DEFAULT_SEATMAP_TIERS = [
  { name: "VIP", price: 150, color: "#3b82f6" },
  { name: "Floor", price: 95, color: "#60a5fa" },
  { name: "Lower Tier", price: 65, color: "#22c55e" },
  { name: "Upper Tier", price: 45, color: "#f97316" },
] as const;

export const DEFAULT_CANVAS: SeatmapCanvas = {
  shape: "rectangle",
  width: 1200,
  height: 800,
  orientation: "horizontal",
  defaultStagePosition: true,
  rowSeatLabels: false,
};
