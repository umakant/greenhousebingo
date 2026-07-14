import type { EventPlantStatus } from "@/lib/event-platform/event-plants/event-plant-constants";

export type EventPlantDto = {
  id: string;
  eventId: string;
  name: string;
  category: string | null;
  variety: string | null;
  description: string | null;
  imageUrl: string | null;
  supplierName: string | null;
  posProductId: string | null;
  quantityPurchased: number;
  quantityAssigned: number;
  quantityAwarded: number;
  quantityRemoved: number;
  quantityRemaining: number;
  unitCost: number;
  totalCost: number;
  retailValue: number | null;
  requestCount: number;
  inventoryGap: number;
  popularityScore: number;
  popularityLabel: string;
  assignedGameLabel: string | null;
  status: EventPlantStatus;
  notes: string | null;
  createdAt: string;
};

export const EVENT_PLANT_REQUEST_TYPES = ["take_home", "winning"] as const;
export type EventPlantRequestType = (typeof EVENT_PLANT_REQUEST_TYPES)[number];

export const EVENT_PLANT_REQUEST_TYPE_LABELS: Record<EventPlantRequestType, string> = {
  take_home: "Take-home",
  winning: "Winning",
};

export type EventPlantRequestDto = {
  id: string;
  eventId: string;
  registrationId: string;
  attendeeName: string;
  attendeeEmail: string;
  eventPlantId: string | null;
  plantName: string;
  requestType: EventPlantRequestType;
  quantity: number;
  priority: number | null;
  notes: string | null;
  createdAt: string;
};

export type EventPlantAssignmentDto = {
  id: string;
  eventPlantId: string;
  plantName: string;
  roundInstanceId: string | null;
  roundNumber: number | null;
  roundName: string | null;
  bingoGameId: string | null;
  quantity: number;
  status: string;
  assignedAt: string;
};

export type EventPlantsSummary = {
  totalPlants: number;
  totalPlantCost: number;
  averageUnitCost: number;
  estimatedRetailValue: number;
  plantsAssignedToGames: number;
  plantsAwarded: number;
  plantsRemaining: number;
  requestedPlantsAvailable: number;
  inventoryGaps: number;
};

export type EventPlantsAnalytics = {
  requestsByCategory: Array<{ key: string; label: string; count: number }>;
  inventoryVsRequests: Array<{ label: string; inventory: number; requests: number }>;
  costByCategory: Array<{ key: string; label: string; cost: number }>;
  mostPopular: Array<{ label: string; score: number; requestCount: number }>;
  inventoryBreakdown: { assigned: number; awarded: number; remaining: number };
};

export type EventPlantGapItem = {
  plantId: string;
  plantName: string;
  requestCount: number;
  available: number;
  inventoryGap: number;
};

export type EventPlantsActivityItem = {
  id: string;
  at: string;
  action: string;
  title: string;
  detail: string;
};

export type EventPlantsOverview = {
  summary: EventPlantsSummary;
  plants: EventPlantDto[];
  requests: EventPlantRequestDto[];
  gaps: EventPlantGapItem[];
  analytics: EventPlantsAnalytics;
  activity: EventPlantsActivityItem[];
  rounds: Array<{ id: string; roundNumber: number; name: string; assignedPrize: string }>;
  canManagePlants: boolean;
};

export type CreateEventPlantInput = {
  name: string;
  category?: string | null;
  variety?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  eventVendorId?: string | null;
  posProductId?: string | null;
  quantityPurchased?: number;
  unitCost?: number;
  retailValue?: number | null;
  notes?: string | null;
};

export type UpdateEventPlantInput = Partial<CreateEventPlantInput> & {
  quantityRemoved?: number;
  status?: EventPlantStatus;
};

export type CreatePlantRequestInput = {
  registrationId: string;
  eventPlantId?: string | null;
  requestedPlantName?: string | null;
  requestType?: EventPlantRequestType;
  quantity?: number | null;
  priority?: number | null;
  notes?: string | null;
};

export type EventPlantDetail = {
  plant: EventPlantDto;
  assignments: EventPlantAssignmentDto[];
  requests: EventPlantRequestDto[];
  activity: EventPlantsActivityItem[];
};
