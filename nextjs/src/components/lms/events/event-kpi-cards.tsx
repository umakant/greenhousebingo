"use client";

import {
  Award,
  CalendarDays,
  DollarSign,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";

import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import type { LmsEventOrganizerKpis } from "@/lib/lms-events/types";
import { formatCurrency } from "@/lib/format-currency";
import { useAppSettings } from "@/contexts/app-settings-context";

export function EventKpiCards(props: { kpis: LmsEventOrganizerKpis; currency?: string }) {
  const { settings } = useAppSettings();
  const fmt = (n: number) => formatCurrency(n, settings);

  const cards = [
    {
      label: "Total events",
      value: props.kpis.totalEvents,
      sub: `${props.kpis.publishedEvents} published`,
      icon: <CalendarDays className="h-8 w-8" />,
    },
    {
      label: "Upcoming events",
      value: props.kpis.upcomingEvents,
      sub: "Scheduled ahead",
      icon: <TrendingUp className="h-8 w-8" />,
    },
    {
      label: "Registrations",
      value: props.kpis.totalRegistrations,
      sub: `${props.kpis.attendanceRate}% attendance`,
      icon: <Users className="h-8 w-8" />,
    },
    {
      label: "Net revenue",
      value: fmt(props.kpis.totalRevenue - props.kpis.refunds),
      sub: `${fmt(props.kpis.refunds)} refunded`,
      icon: <DollarSign className="h-8 w-8" />,
    },
    {
      label: "Certificates issued",
      value: props.kpis.certificatesIssued,
      sub: "Completed certifications",
      icon: <Award className="h-8 w-8" />,
    },
    {
      label: "Open support",
      value: props.kpis.openSupportTickets,
      sub: "Tickets need attention",
      icon: <Ticket className="h-8 w-8" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <DashboardStatCard
          key={card.label}
          label={card.label}
          value={card.value}
          sub={card.sub}
          icon={card.icon}
        />
      ))}
    </div>
  );
}
