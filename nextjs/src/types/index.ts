import type { LucideIcon } from "lucide-react";

export interface User {
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  activatedPackages: string[];
}

export interface NavItem {
  title: string;
  /** Sidebar-only override (e.g. user-renamed dashboard link); falls back to `title` via `t()`. */
  displayTitle?: string;
  href?: string;
  icon?: LucideIcon;
  permission?: string;
  children?: NavItem[];
  isActive?: boolean;
  parent?: string;
  name?: string;
  order?: number;
  dashboardScope?: string;
}

