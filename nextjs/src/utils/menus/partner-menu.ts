import {
  LayoutGrid,
  Users,
  Building2,
  BadgeDollarSign,
  Link2,
  FileText,
  Wallet,
  UserCog,
  Store,
  Coins,
  TrendingUp,
} from "lucide-react";

import type { NavItem } from "@/types";
import { t } from "@/lib/admin-t";


export const getPartnerMenu = (): NavItem[] => [
  {
    title: t("Dashboard"),
    href: "/partner",
    icon: LayoutGrid,
    permission: "view-partner-dashboard",
    order: 1,
  },
  {
    title: t("My Referrals"),
    href: "/partner/referrals",
    icon: Users,
    permission: "manage-partner-referrals",
    order: 2,
  },
  {
    title: t("My Companies"),
    href: "/partner/companies",
    icon: Building2,
    permission: "manage-partner-referrals",
    order: 3,
  },
  {
    title: t("My Commission"),
    href: "/partner/commission",
    icon: BadgeDollarSign,
    permission: "view-partner-commissions",
    order: 4,
  },
  {
    title: t("Marketplace Referrals"),
    href: "/partner/marketplace-referrals",
    icon: Store,
    permission: "manage-partner-referrals",
    order: 4.1,
  },
  {
    title: t("Marketplace Commissions"),
    href: "/partner/marketplace-commissions",
    icon: Coins,
    permission: "view-partner-commissions",
    order: 4.2,
  },
  {
    title: t("Marketplace Revenue"),
    href: "/partner/marketplace-revenue",
    icon: TrendingUp,
    permission: "view-partner-commissions",
    order: 4.3,
  },
  {
    title: t("Marketing Links"),
    href: "/partner/marketing-links",
    icon: Link2,
    permission: "access-partner-portal",
    order: 5,
  },
  {
    title: t("Landing Pages"),
    href: "/partner/landing-pages",
    icon: FileText,
    permission: "access-partner-portal",
    order: 6,
  },
  {
    title: t("Payout Settings"),
    href: "/partner/payout-settings",
    icon: Wallet,
    permission: "view-partner-payouts",
    order: 7,
  },
  {
    title: t("Profile Settings"),
    href: "/partner/profile",
    icon: UserCog,
    permission: "edit-partner-profile",
    order: 8,
  },
];
