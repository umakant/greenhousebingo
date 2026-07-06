"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DASHBOARD_STAT_CARD_CLASS,
  DASHBOARD_STAT_ICON_CLASS,
  DASHBOARD_STAT_SUB_CLASS,
} from "@/components/dashboard/dashboard-stat-styles";
import { cn } from "@/lib/utils";

export type DashboardStatCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  /** When set, the whole card navigates to this route on click. */
  href?: string;
  className?: string;
  textClass?: string;
  subClass?: string;
};

export function DashboardStatCard({
  label,
  value,
  sub,
  icon,
  href,
  className,
  textClass,
  subClass = DASHBOARD_STAT_SUB_CLASS,
}: DashboardStatCardProps) {
  const card = (
    <Card
      className={cn(
        "h-full",
        DASHBOARD_STAT_CARD_CLASS,
        href && "cursor-pointer transition-shadow hover:shadow-md hover:opacity-95",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn("text-sm font-medium", textClass)}>{label}</CardTitle>
        {icon ? <span className={cn("shrink-0", DASHBOARD_STAT_ICON_CLASS, textClass)}>{icon}</span> : null}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", textClass)}>{value}</div>
        {sub ? <p className={cn("mt-1 text-xs", subClass)}>{sub}</p> : null}
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link
      href={href}
      className="block h-full min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {card}
    </Link>
  );
}
