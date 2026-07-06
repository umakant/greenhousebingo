import {
  BookOpen,
  GraduationCap,
  Video,
  HelpCircle,
  Newspaper,
  Users,
  Calculator,
  Download,
  LifeBuoy,
  Code2,
  Megaphone,
  Headphones,
  type LucideIcon,
} from "lucide-react";

export type ResourceItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type ResourceColumn = {
  heading: string;
  items: ResourceItem[];
};

export const resourceColumns: ResourceColumn[] = [
  {
    heading: "Learn",
    items: [
      { icon: BookOpen, title: "Blog", description: "Tips, guides & industry insights." },
      { icon: GraduationCap, title: "Paper Flight Academy", description: "Free courses to grow your business." },
      { icon: Video, title: "Webinars", description: "Live & on-demand training sessions." },
      { icon: Newspaper, title: "Customer Stories", description: "See how pros run with Paper Flight." },
    ],
  },
  {
    heading: "Tools",
    items: [
      { icon: Calculator, title: "Pricing Calculator", description: "Estimate jobs with confidence." },
      { icon: Download, title: "Free Templates", description: "Quotes, contracts & checklists." },
      { icon: Megaphone, title: "Marketing Kit", description: "Get more leads & 5-star reviews." },
      { icon: Code2, title: "API & Integrations", description: "Connect Paper Flight to your stack." },
    ],
  },
  {
    heading: "Support",
    items: [
      { icon: HelpCircle, title: "Help Center", description: "Step-by-step articles & FAQs." },
      { icon: LifeBuoy, title: "Onboarding", description: "Get set up in days, not weeks." },
      { icon: Headphones, title: "Contact Support", description: "Talk to a real human, fast." },
      { icon: Users, title: "Community", description: "Connect with other service pros." },
    ],
  },
];
