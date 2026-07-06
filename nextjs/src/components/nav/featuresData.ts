import {
  FileText,
  Send,
  Camera,
  Calendar,
  ClipboardCheck,
  MapPin,
  BarChart3,
  Users,
  Headphones,
  MessageSquare,
  LayoutGrid,
  CalendarCheck,
  Star,
  Mail,
  Megaphone,
  Globe,
  type LucideIcon,
} from "lucide-react";

export type FeatureItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type FeatureColumn = {
  heading: string;
  items: FeatureItem[];
};

export const featureColumns: FeatureColumn[] = [
  {
    heading: "Job Tools",
    items: [
      { icon: FileText, title: "Estimates", description: "Create and send professional estimates." },
      { icon: Send, title: "Invoicing", description: "Send, track and collect invoices." },
      { icon: Camera, title: "PaperFlight Cam", description: "Capture and document every job with ease." },
      { icon: Calendar, title: "Scheduling", description: "Schedule jobs to your calendar in seconds." },
      { icon: ClipboardCheck, title: "Inspection Forms", description: "Create and complete inspection reports." },
      { icon: MapPin, title: "MapMeasure Pro", description: "Measure and price properties instantly." },
    ],
  },
  {
    heading: "Business Control Center",
    items: [
      { icon: BarChart3, title: "Business Analytics", description: "Real-time insight into your performance." },
      { icon: Users, title: "EmployeeHub", description: "Assign, schedule & pay employees." },
      { icon: Headphones, title: "Virtual Call Team", description: "Never miss a call with 24/7 AI call assistant." },
      { icon: MessageSquare, title: "ClientHub", description: "Send and keep messages inside Paper Flight." },
      { icon: LayoutGrid, title: "InstaQuote", description: "Allow customers to create estimates themselves." },
      { icon: CalendarCheck, title: "InstaSchedule", description: "Let clients schedule appointments themselves." },
    ],
  },
  {
    heading: "Business Growth",
    items: [
      { icon: Star, title: "Review Multiplier", description: "Send automated review requests." },
      { icon: Mail, title: "Email & Text Automation", description: "Send automated follow-ups, discounts, & more." },
      { icon: Megaphone, title: "Mass Campaigns", description: "Message your entire contacts list in a few clicks." },
      { icon: Globe, title: "AI Website Builder", description: "Create a professional business website in minutes." },
    ],
  },
];
