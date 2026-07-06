/**
 * Canonical catalog for Industry Modules admin (category sidebar + module cards).
 * DB rows in `business_modules` are matched by normalized name.
 */

export type IndustryCatalogCategory = {
  id: string;
  title: string;
  description: string;
  moduleNames: string[];
};

/** Sidebar order: alphabetical by display name (Automotive → Roofing). */
export const INDUSTRY_MODULE_CATEGORIES: IndustryCatalogCategory[] = [
  {
    id: "automotive-services",
    title: "Automotive Services",
    description: "Detailing, coatings, washes, and light mechanical for consumer and fleet.",
    moduleNames: [
      "Auto Detailing",
      "Interior Detailing",
      "Exterior Detailing",
      "Ceramic Coating",
      "Paint Correction",
      "Car Wash",
      "Mobile Mechanic",
      "Oil Change Service",
      "Brake Repair",
      "Fleet Washing",
    ],
  },
  {
    id: "cleaning-services",
    title: "Cleaning Services",
    description:
      "Residential and commercial cleaning, specialty surfaces, and regulated cleanup workflows.",
    moduleNames: [
      "House Cleaning",
      "Deep Cleaning",
      "Move-In / Move-Out Cleaning",
      "Commercial Cleaning",
      "Janitorial Services",
      "Carpet Cleaning",
      "Upholstery Cleaning",
      "Window Cleaning",
      "Gutter Cleaning",
      "Pressure Washing",
      "Soft Washing",
      "Roof Cleaning",
      "Solar Panel Cleaning",
      "Trash Bin Cleaning",
      "Biohazard Cleanup",
      "Crime Scene Cleanup",
      "Hoarding Cleanup",
      "Pet Waste Removal",
    ],
  },
  {
    id: "commercial-services",
    title: "Commercial Services",
    description: "Waste, removal, site services, security, and freight programs for businesses.",
    moduleNames: [
      "Dumpster Rental",
      "Roll-Off Dumpster Rental",
      "Junk Removal",
      "Commercial Junk Removal",
      "Demolition",
      "Security Guard Services",
      "Armed Security",
      "Patrol Services",
      "Shipping Rebates",
      "Freight Auditing",
    ],
  },
  {
    id: "core-trades",
    title: "Core Trades",
    description:
      "HVAC, plumbing, electrical, finishing trades, and common residential/commercial repair services.",
    moduleNames: [
      "HVAC Installation",
      "HVAC Repair",
      "HVAC Maintenance",
      "Plumbing Repair",
      "Drain Cleaning",
      "Water Heater Installation",
      "Sewer Line Repair",
      "Electrical Installation",
      "Electrical Repair",
      "Panel Upgrades",
      "Handyman Services",
      "Painting (Interior)",
      "Painting (Exterior)",
      "Drywall Repair",
      "Drywall Installation",
      "Flooring Installation",
      "Tile Installation",
      "Masonry",
      "Brick Repair",
      "Locksmith",
      "Emergency Locksmith",
    ],
  },
  {
    id: "event-services",
    title: "Event Services",
    description: "Decor, rentals, logistics, parking, and relocation around events.",
    moduleNames: [
      "Event Decor",
      "Balloon Decor",
      "Event Rentals",
      "Tent Rentals",
      "Party Rentals",
      "Event Parking",
      "Valet Services",
      "Moving Services",
    ],
  },
  {
    id: "food-beverage",
    title: "Food & Beverage",
    description: "Mobile food, catering, desserts, beverages, and front-of-house concepts.",
    moduleNames: [
      "Food Trucks",
      "Mobile Food Vendors",
      "Catering",
      "Corporate Catering",
      "Dessert Catering",
      "Frozen Desserts",
      "Ice Cream Shops",
      "Water Ice",
      "Shaved Ice",
      "Beverage Services",
      "Coffee Services",
      "Smoothie Bars",
      "Juice Bars",
    ],
  },
  {
    id: "health-services",
    title: "Health Services",
    description: "Testing, compliance screening, and regulated health-adjacent supply categories.",
    moduleNames: [
      "DNA Testing",
      "Paternity Testing",
      "Drug Testing",
      "Mobile Drug Testing",
      "Fingerprinting",
      "Background Checks",
      "Medical Surplus",
      "Diabetic Supplies",
    ],
  },
  {
    id: "installation-services",
    title: "Installation Services",
    description: "Installed equipment, doors, appliances, power, solar, and security systems.",
    moduleNames: [
      "Garage Door Installation",
      "Garage Door Repair",
      "Appliance Repair",
      "Appliance Installation",
      "EV Charger Installation",
      "Generator Installation",
      "Generator Repair",
      "Solar Panel Installation",
      "Solar Maintenance",
      "Home Security System Installation",
    ],
  },
  {
    id: "outdoor-services",
    title: "Outdoor Services",
    description:
      "Outdoor maintenance, landscape, irrigation, pools, pests, snow, and exterior specialty trades.",
    moduleNames: [
      "Lawn Care",
      "Lawn Fertilization",
      "Weed Control",
      "Landscaping",
      "Landscape Design",
      "Irrigation Installation",
      "Irrigation Repair",
      "Tree Services",
      "Stump Grinding",
      "Land Clearing",
      "Grading & Excavation",
      "Snow Removal",
      "Ice Management",
      "Fencing Installation",
      "Deck Building",
      "Pool Service",
      "Pool Repair",
      "Pest Control",
      "Mosquito Control",
      "Outdoor Lighting",
    ],
  },
  {
    id: "paving-services",
    title: "Paving Services",
    description: "Asphalt and lot work, preservation, and pavement marking.",
    moduleNames: [
      "Asphalt Paving",
      "Driveway Paving",
      "Parking Lot Paving",
      "Sealcoating",
      "Crack Filling",
      "Line Striping",
    ],
  },
  {
    id: "pet-services",
    title: "Pet Services",
    description: "Care, exercise, and grooming for companion animals.",
    moduleNames: ["Pet Sitting", "Dog Walking", "Pet Grooming", "Mobile Pet Grooming", "Pet Boarding"],
  },
  {
    id: "printing-products",
    title: "Printing & Products",
    description: "Decorated goods, wide-format, promo, and small-batch manufactured products.",
    moduleNames: [
      "Apparel Printing",
      "Screen Printing",
      "Embroidery",
      "Custom Printing",
      "Large Format Printing",
      "Promotional Products",
      "Custom Rugs",
      "Candle Making",
      "Label Printing",
    ],
  },
  {
    id: "remodeling-construction",
    title: "Remodeling & Construction",
    description: "Renovation, room additions, concrete, epoxy, and structural rough-in scopes.",
    moduleNames: [
      "General Contracting",
      "Home Remodeling",
      "Kitchen Remodeling",
      "Bathroom Remodeling",
      "Room Additions",
      "Garage Conversions",
      "Concrete Installation",
      "Concrete Repair",
      "Epoxy Flooring",
      "Framing",
    ],
  },
  {
    id: "restoration-services",
    title: "Restoration Services",
    description: "Damage recovery, environmental remediation, and structural waterproofing.",
    moduleNames: [
      "Mold Remediation",
      "Water Damage Restoration",
      "Fire Damage Restoration",
      "Storm Damage Restoration",
      "Smoke Damage Cleanup",
      "Flood Cleanup",
      "Waterproofing",
      "Crawlspace Encapsulation",
      "Foundation Repair",
    ],
  },
  {
    id: "roofing-exteriors",
    title: "Roofing & Exteriors",
    description: "Roof systems, siding, gutters, fenestration, and building envelope work.",
    moduleNames: [
      "Roof Installation",
      "Roof Repair",
      "Metal Roofing",
      "Flat Roofing",
      "Siding Installation",
      "Siding Repair",
      "Gutter Installation",
      "Gutter Guards",
      "Window Replacement",
      "Door Installation",
    ],
  },
];

export function normalizeIndustryModuleName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function catalogNormalizedNameSet(categories: IndustryCatalogCategory[] = INDUSTRY_MODULE_CATEGORIES): Set<string> {
  const set = new Set<string>();
  for (const c of categories) {
    for (const n of c.moduleNames) {
      set.add(normalizeIndustryModuleName(n));
    }
  }
  return set;
}
