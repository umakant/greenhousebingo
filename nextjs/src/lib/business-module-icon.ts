import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  Calculator,
  CalendarClock,
  CreditCard,
  FileText,
  FolderKanban,
  GraduationCap,
  Landmark,
  Repeat2,
  Route,
  Settings2,
  Shirt,
  ShoppingCart,
  UserPlus,
  Users,
  Printer,
  PartyPopper,
  FlaskConical,
  Flame,
  Sparkles,
  Building2,
  HeartPulse,
  Dna,
  Dog,
  ImageIcon,
  Trash2,
  Car,
  Home,
  Wind,
  Waves,
  Snowflake,
  TreePine,
  Leaf,
  Mountain,
  Truck,
  Wrench,
  Bug,
  Gift,
  Heart,
  Scissors,
  Pill,
  Stethoscope,
  Package,
  Droplets,
  LayoutGrid,
  MessageCircle,
  Fingerprint,
  Briefcase,
  Factory,
  Store,
  Lightbulb,
  Cpu,
  Globe,
  Handshake,
  Wallet,
} from "lucide-react";

/** Deterministic icon for Industry / Business modules from display name. */
export function getBusinessModuleIcon(name: string): LucideIcon {
  const n = (name ?? "").trim().toLowerCase();
  if (!n) return Boxes;

  type Rule = { test: (s: string) => boolean; Icon: LucideIcon };
  const rules: Rule[] = [
    { test: (s) => /dog|pet waste|poop|feces/.test(s), Icon: Dog },
    { test: (s) => s.includes("dna") || s.includes("genetic"), Icon: Dna },
    { test: (s) => s.includes("drug test") || (s.includes("drug") && s.includes("mobile")), Icon: Pill },
    { test: (s) => s.includes("diabetic"), Icon: HeartPulse },
    { test: (s) => s.includes("medical surplus") || (s.includes("medical") && s.includes("surplus")), Icon: Stethoscope },
    { test: (s) => s.includes("biohazard") || s.includes("hazmat"), Icon: FlaskConical },
    { test: (s) => s.includes("fingerprint"), Icon: Fingerprint },
    { test: (s) => s.includes("balloon") || (s.includes("event") && s.includes("decor")), Icon: PartyPopper },
    { test: (s) => s.includes("candle") || s.includes("wax"), Icon: Flame },
    { test: (s) => s.includes("rug") || s.includes("tapestry"), Icon: ImageIcon },
    { test: (s) => s.includes("apparel") || s.includes("t-shirt") || s.includes("garment"), Icon: Shirt },
    {
      test: (s) =>
        s.includes("print") ||
        s.includes("printing") ||
        s.includes("promotional product"),
      Icon: Printer,
    },
    { test: (s) => s.includes("carpet"), Icon: Sparkles },
    { test: (s) => s.includes("window clean") || s.includes("window cleaning"), Icon: LayoutGrid },
    { test: (s) => s.includes("commercial") && s.includes("clean"), Icon: Building2 },
    { test: (s) => s.includes("cleaning") || s.includes("janitorial") || s.includes("pool clean"), Icon: Sparkles },
    { test: (s) => s.includes("junk") || s.includes("debris removal"), Icon: Trash2 },
    { test: (s) => s.includes("dumpster"), Icon: Trash2 },
    { test: (s) => s.includes("pressure wash"), Icon: Droplets },
    { test: (s) => s.includes("lawn") && !s.includes("land"), Icon: Leaf },
    { test: (s) => s.includes("landscap"), Icon: Mountain },
    { test: (s) => s.includes("tree service") || (s.includes("tree") && s.includes("service")), Icon: TreePine },
    { test: (s) => s.includes("moving"), Icon: Truck },
    { test: (s) => s.includes("handyman"), Icon: Wrench },
    { test: (s) => s.includes("pest"), Icon: Bug },
    { test: (s) => s.includes("roof"), Icon: Home },
    { test: (s) => s.includes("hvac") || s.includes("heating") || s.includes("cooling"), Icon: Wind },
    { test: (s) => s.includes("plumb"), Icon: Droplets },
    { test: (s) => s.includes("electrical"), Icon: Lightbulb },
    { test: (s) => s.includes("snow"), Icon: Snowflake },
    { test: (s) => s.includes("car wash") || s.includes("mobile car"), Icon: Car },
    { test: (s) => s.includes("detailing"), Icon: Sparkles },
    { test: (s) => s.includes("promotional"), Icon: Gift },
    { test: (s) => s.includes("pool"), Icon: Waves },
    { test: (s) => s.includes("pet sitting") || (s.includes("pet") && s.includes("sit")), Icon: Heart },
    { test: (s) => s.includes("groom"), Icon: Scissors },
    { test: (s) => s.includes("surplus") && !s.includes("diabetic") && !s.includes("medical"), Icon: Package },
    { test: (s) => s.includes("commercial") && !s.includes("clean"), Icon: Building2 },
  ];

  for (const { test, Icon } of rules) {
    if (test(n)) return Icon;
  }

  const fallback: LucideIcon[] = [
    Briefcase,
    Factory,
    Store,
    Globe,
    Cpu,
    Package,
    Truck,
    Sparkles,
    Home,
    Car,
    Heart,
    Gift,
    Wrench,
    TreePine,
  ];
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (Math.imul(31, h) + n.charCodeAt(i)) | 0;
  return fallback[Math.abs(h) % fallback.length];
}

/**
 * Icons for Add-ons Manager cards — keyed by package slug (`module`) with fallbacks from display name.
 * Keeps visual parity with Industry Modules (distinct icon per add-on instead of one generic glyph).
 */
export function getAddOnModuleIcon(moduleSlug: string, displayName: string): LucideIcon {
  const s = `${moduleSlug ?? ""} ${displayName ?? ""}`.trim().toLowerCase();
  if (!s) return Package;

  const slug = (moduleSlug ?? "").trim().toLowerCase();

  type Rule = { test: (key: string, full: string) => boolean; Icon: LucideIcon };
  const rules: Rule[] = [
    {
      test: (key, full) =>
        key.includes("affiliate") ||
        key.includes("affiliatebusiness") ||
        /\baffiliate\b/.test(full),
      Icon: Handshake,
    },
    { test: (key, full) => key === "lms" || /\blms\b/.test(full) || /\blearning\b/.test(full), Icon: GraduationCap },
    { test: (key) => /^(account|accounting|bookkeeping)/.test(key) || /\baccounting\b/.test(key), Icon: Calculator },
    { test: (key, full) => key.startsWith("appointment") || full.includes("appointment"), Icon: CalendarClock },
    { test: (key) => /^assets?$/.test(key) || key.includes("asset"), Icon: Boxes },
    { test: (key) => key.includes("business-module"), Icon: Settings2 },
    { test: (key, full) => /^(lead|crm|customer)/.test(key) || /\bcrm\b/.test(full), Icon: Users },
    { test: (key) => key.includes("form") && key.includes("builder"), Icon: FileText },
    { test: (key) => /^hrm$/.test(key) || key.includes("hrm"), Icon: Users },
    { test: (key) => key.includes("paypal") || key.includes("stripe"), Icon: CreditCard },
    { test: (key) => /^(pos|point.of.sale)/.test(key) || /\bpos\b/.test(key), Icon: ShoppingCart },
    { test: (key) => /taskly|project/.test(key), Icon: FolderKanban },
    { test: (key, full) => key.includes("routing") || /\broute\b/.test(full), Icon: Route },
    { test: (key) => key.includes("recruit"), Icon: UserPlus },
    { test: (key) => key.includes("recurring") || key.includes("invoice") || key.includes("bill"), Icon: Repeat2 },
    { test: (key) => key.includes("whatsapp"), Icon: MessageCircle },
    {
      test: (key, full) =>
        key.includes("expense") ||
        key.includes("expensemanagement") ||
        /\bexpense\b/.test(full),
      Icon: Wallet,
    },
    {
      test: (key) =>
        key.includes("bank") || key.includes("ledger") || key.includes("payment") || key.includes("tax"),
      Icon: Landmark,
    },
  ];

  for (const { test, Icon } of rules) {
    if (test(slug, s)) return Icon;
  }

  return getBusinessModuleIcon(displayName || moduleSlug);
}
