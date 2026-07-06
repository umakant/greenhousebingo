import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Truck,
} from "lucide-react";

import type { NavItem } from "@/types";
import { t } from "@/lib/admin-t";


export function getMarketplaceVendorMenu(): NavItem[] {
  return [
    {
      title: t("Vendor Dashboard"),
      href: "/marketplace/vendor",
      icon: LayoutDashboard,
      permission: "marketplace.vendor_portal.dashboard.view",
      order: 100,
    },
    {
      title: t("Products"),
      href: "/marketplace/vendor/products",
      icon: Package,
      permission: "marketplace.vendor_portal.products.view",
      order: 110,
    },
    {
      title: t("Orders"),
      href: "/marketplace/vendor/orders",
      icon: ShoppingCart,
      permission: "marketplace.vendor_portal.orders.view",
      order: 120,
    },
    {
      title: t("Delivery Queue"),
      href: "/marketplace/vendor/delivery-queue",
      icon: Boxes,
      permission: "marketplace.vendor_portal.delivery_queue.view",
      order: 130,
    },
    {
      title: t("Delivery Events"),
      href: "/marketplace/vendor/delivery-events",
      icon: Truck,
      permission: "marketplace.vendor_portal.delivery_queue.view",
      order: 140,
    },
    {
      title: t("Reports"),
      href: "/marketplace/vendor/reports",
      icon: BarChart3,
      permission: "marketplace.vendor_portal.reports.view",
      order: 150,
    },
    {
      title: t("Settings"),
      href: "/marketplace/vendor/profile",
      icon: Settings,
      permission: "marketplace.vendor_portal.profile.manage",
      order: 160,
    },
  ];
}
