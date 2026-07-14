export const EVENT_PLANT_CATALOG_STATUSES = ["active", "archived"] as const;
export type EventPlantCatalogStatus = (typeof EVENT_PLANT_CATALOG_STATUSES)[number];

export const EVENT_PLANT_CARE_LEVELS = ["Easy", "Moderate", "Difficult"] as const;
export type EventPlantCareLevel = (typeof EVENT_PLANT_CARE_LEVELS)[number];

export type EventPlantCatalogDto = {
  id: string;
  name: string;
  scientificName: string | null;
  category: string | null;
  careLevel: EventPlantCareLevel;
  light: string | null;
  water: string | null;
  petSafe: boolean;
  description: string | null;
  imageUrl: string | null;
  retailValue: number | null;
  sortOrder: number;
  status: EventPlantCatalogStatus;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string | null;
};

/** Shape returned by the AI generator so the add/edit form can be pre-filled. */
export type PlantAiDetails = {
  scientificName: string;
  category: string;
  careLevel: EventPlantCareLevel;
  light: string;
  water: string;
  petSafe: boolean;
  description: string;
};
