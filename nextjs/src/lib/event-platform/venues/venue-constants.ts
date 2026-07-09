import { US_STATES } from "@/lib/project-sow-form";

export { US_STATES };

export const EVENT_VENUE_CATEGORIES = [
  "Entertainment",
  "Food & Beverage",
  "Hospitality",
  "Outdoor",
  "Community",
  "Retail",
] as const;

export const EVENT_VENUE_TYPES = [
  "Brewery",
  "Greenhouse",
  "Cidery",
  "Taproom",
  "Nursery",
  "Beer Hall",
  "Event Hall",
  "Lounge",
  "Restaurant",
  "Bar",
] as const;

export const VENUE_WIZARD_STEPS = [
  { id: "details", label: "Venue Details" },
  { id: "amenities", label: "Amenities & Hours" },
  { id: "contact", label: "Contact" },
  { id: "review", label: "Review" },
] as const;

export type VenueWizardStepId = (typeof VENUE_WIZARD_STEPS)[number]["id"];
