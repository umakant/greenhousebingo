export const EVENT_PLANT_STATUSES = [
  "available",
  "assigned",
  "reserved",
  "awarded",
  "low_stock",
  "out_of_stock",
  "removed",
] as const;

export type EventPlantStatus = (typeof EVENT_PLANT_STATUSES)[number];

export const EVENT_PLANT_STATUS_LABELS: Record<EventPlantStatus, string> = {
  available: "Available",
  assigned: "Assigned",
  reserved: "Reserved",
  awarded: "Awarded",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  removed: "Removed",
};

export const EVENT_PLANT_ASSIGNMENT_STATUSES = ["assigned", "reserved", "awarded", "cancelled"] as const;

export type EventPlantAssignmentStatus = (typeof EVENT_PLANT_ASSIGNMENT_STATUSES)[number];

export const EVENT_PLANT_ACTIONS = [
  "add_quantity",
  "assign_to_game",
  "remove_assignment",
  "mark_awarded",
  "remove_from_event",
  "duplicate",
] as const;

export type EventPlantAction = (typeof EVENT_PLANT_ACTIONS)[number];

export const LOW_STOCK_THRESHOLD = 3;
