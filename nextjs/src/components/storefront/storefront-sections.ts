import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CalendarRange,
  CreditCard,
  FileText,
  Globe,
  LayoutDashboard,
  Layers,
  Menu,
  Package,
  Palette,
  Percent,
  Receipt,
  Settings,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";

export type StorefrontMerchantSectionId =
  | "overview"
  | "onboarding"
  | "websites"
  | "themes"
  | "pages"
  | "blog"
  | "events"
  | "events-schedule"
  | "navigation"
  | "products"
  | "collections"
  | "checkout"
  | "orders"
  | "discounts"
  | "shipping"
  | "taxes"
  | "customers"
  | "analytics"
  | "settings";

type StorefrontMerchantSectionRow = {
  id: StorefrontMerchantSectionId;
  title: string;
  href: string;
  permission: string;
  icon: LucideIcon;
};

/** Staff Storefronts module — sidebar, subnav, and permission checks use the same list. */
export const STOREFRONT_MERCHANT_SECTIONS: readonly StorefrontMerchantSectionRow[] = [
  { id: "overview", title: "Overview", href: "/storefront/overview", permission: "storefront.view", icon: LayoutDashboard },
  {
    id: "onboarding",
    title: "Onboarding",
    href: "/storefront/onboarding",
    permission: "storefront.view",
    icon: Sparkles,
  },
  { id: "websites", title: "Websites", href: "/storefront/websites", permission: "storefront.website.manage", icon: Globe },
  { id: "themes", title: "Themes", href: "/storefront/themes", permission: "storefront.theme.manage", icon: Palette },
  { id: "pages", title: "Pages", href: "/storefront/pages", permission: "storefront.page.manage", icon: FileText },
  { id: "blog", title: "Blog", href: "/storefront/blog", permission: "storefront.page.manage", icon: BookOpen },
  { id: "events", title: "Events", href: "/storefront/events", permission: "storefront.page.manage", icon: CalendarDays },
  {
    id: "events-schedule",
    title: "Events Schedule",
    href: "/storefront/events-schedule",
    permission: "storefront.page.manage",
    icon: CalendarRange,
  },
  { id: "navigation", title: "Navigation", href: "/storefront/navigation", permission: "storefront.page.manage", icon: Menu },
  { id: "products", title: "Products", href: "/storefront/products", permission: "storefront.catalog.manage", icon: Package },
  { id: "collections", title: "Collections", href: "/storefront/collections", permission: "storefront.catalog.manage", icon: Layers },
  { id: "checkout", title: "Checkout", href: "/storefront/checkout", permission: "storefront.checkout.manage", icon: CreditCard },
  { id: "orders", title: "Orders", href: "/storefront/orders", permission: "storefront.order.manage", icon: ShoppingCart },
  { id: "discounts", title: "Discounts", href: "/storefront/discounts", permission: "storefront.discount.manage", icon: Percent },
  { id: "shipping", title: "Shipping", href: "/storefront/shipping", permission: "storefront.shipping.manage", icon: Truck },
  { id: "taxes", title: "Taxes", href: "/storefront/taxes", permission: "storefront.tax.manage", icon: Receipt },
  { id: "customers", title: "Customers", href: "/storefront/customers", permission: "storefront.customer.manage", icon: Users },
  { id: "analytics", title: "Analytics", href: "/storefront/analytics", permission: "storefront.analytics.view", icon: BarChart3 },
  { id: "settings", title: "System Setup", href: "/storefront/settings", permission: "storefront.settings.manage", icon: Settings },
];
