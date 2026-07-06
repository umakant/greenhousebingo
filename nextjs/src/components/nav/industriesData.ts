import {
  Zap,
  Wrench,
  Snowflake,
  Hammer,
  Refrigerator,
  Briefcase,
  PaintRoller,
  Brush,
  Droplets,
  SprayCan,
  Scissors,
  Mountain,
  Sprout,
  Trees,
  Shovel,
  Sparkles,
  Paintbrush,
  Bug,
  Waves,
  Car,
  Home,
  Construction,
  Lightbulb,
  HousePlug,
  type LucideIcon,
} from "lucide-react";

export type IndustryItem = {
  icon: LucideIcon;
  title: string;
  description?: string;
};

export type IndustryColumn = {
  heading: string;
  items: IndustryItem[];
};

export const industryColumns: IndustryColumn[] = [
  {
    heading: "Trades",
    items: [
      { icon: Lightbulb, title: "Electrical" },
      { icon: Wrench, title: "Plumbing" },
      { icon: Snowflake, title: "HVAC" },
      { icon: Hammer, title: "Handyman" },
      { icon: Refrigerator, title: "Appliance" },
      { icon: Briefcase, title: "Gen. Contractor" },
      { icon: PaintRoller, title: "Line Striping" },
      { icon: Brush, title: "Sealcoating" },
    ],
  },
  {
    heading: "Outdoor",
    items: [
      { icon: Droplets, title: "Pressure Wash" },
      { icon: SprayCan, title: "Window Clean" },
      { icon: Scissors, title: "Lawn Care" },
      { icon: Mountain, title: "Landscaping" },
      { icon: Sprout, title: "Irrigation" },
      { icon: Trees, title: "Tree Care" },
      { icon: Shovel, title: "Snow Removal" },
      { icon: Sparkles, title: "Maid Service" },
    ],
  },
  {
    heading: "Home",
    items: [
      { icon: Paintbrush, title: "Painting" },
      { icon: Bug, title: "Pest Control" },
      { icon: Waves, title: "Pool" },
      { icon: Car, title: "Garage Door" },
      { icon: Home, title: "Roofing" },
      { icon: Construction, title: "Concrete" },
      { icon: Zap, title: "Holiday Lighting" },
      { icon: HousePlug, title: "Remodeling" },
    ],
  },
];
