"use client";

import * as React from "react";

import {
  CheckInTrendChart,
  RegistrationTrendChart,
  RevenueExpensesChart,
} from "@/components/event-platform/event-command-center/charts/command-center-charts";
import { useEventCommandCenter } from "@/components/event-platform/event-command-center/event-command-center-context";
import type { EventCommandTabId } from "@/components/event-platform/event-command-center/event-command-center-types";
import {
  EventHealthScore,
  EventTimelinePanel,
  OperationalAlertsPanel,
  OverviewQuickActions,
  RecentActivityPanel,
} from "@/components/event-platform/event-command-center/overview/overview-panels";
import { EventReportPanel } from "@/components/event-platform/event-command-center/reports/event-report-panel";
import { MetricValue } from "@/components/event-platform/event-command-center/metric-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CommandCenterAlert } from "@/lib/event-platform/command-center/command-center-types";

type OverviewTabProps = {
  onEdit: () => void;
  onCheckIn: () => void;
  onTabChange?: (tab: EventCommandTabId) => void;
};

export function OverviewTab(props: OverviewTabProps) {
  const { summary, summaryLoading, reloadSummary, regTrendDays, eventId } = useEventCommandCenter();
  const [chartError, setChartError] = React.useState<string | null>(null);

  const handleRegTrendChange = React.useCallback(
    (range: number | "all") => {
      setChartError(null);
      void reloadSummary(range).then((ok) => {
        if (!ok) setChartError("Could not refresh registration trend.");
      });
    },
    [reloadSummary],
  );

  const handleAlertAction = React.useCallback(
    (alert: CommandCenterAlert) => {
      if (alert.actionKind === "edit") {
        props.onEdit();
        return;
      }
      if (alert.actionKind === "check_in") {
        props.onCheckIn();
        return;
      }
      if (alert.actionKind === "games") {
        props.onTabChange?.("games");
        return;
      }
      if (alert.actionKind === "financials") {
        props.onTabChange?.("financials");
        return;
      }
      if (alert.actionKind === "hosts") {
        props.onTabChange?.("venue-host");
        return;
      }
    },
    [props],
  );

  if (!summary) return null;

  const event = summary.event;
  const currency = event.currency || "USD";
  const formatMoney = (v: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(v);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <RegistrationTrendChart
          data={summary.charts.registrationTrend}
          loading={summaryLoading}
          error={chartError}
          rangeDays={regTrendDays}
          onRangeChange={handleRegTrendChange}
        />
        <CheckInTrendChart
          data={summary.charts.checkInTrend}
          loading={summaryLoading}
          error={chartError}
        />
        <RevenueExpensesChart
          data={summary.charts.revenueVsExpenses}
          loading={summaryLoading}
          error={chartError}
          formatMoney={formatMoney}
        />

        {event.description ? (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Event description</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
              {event.description}
            </CardContent>
          </Card>
        ) : null}

        <EventReportPanel eventId={eventId} />

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Event experience</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-muted-foreground">Featured</span>
              <div className="font-medium">{event.isFeatured ? "Yes" : "No"}</div>
            </div>
            {event.ageRule ? (
              <div>
                <span className="text-muted-foreground">Age rule</span>
                <div className="font-medium">{event.ageRule}</div>
              </div>
            ) : null}
            {event.venue.type ? (
              <div>
                <span className="text-muted-foreground">Venue type</span>
                <div className="font-medium">{event.venue.type}</div>
              </div>
            ) : null}
            {event.cardsIncluded != null ? (
              <div>
                <span className="text-muted-foreground">Cards included</span>
                <div className="font-medium">{event.cardsIncluded}</div>
              </div>
            ) : null}
            {event.foodAndDrinks ? (
              <div>
                <span className="text-muted-foreground">Food & drinks</span>
                <div className="font-medium">{event.foodAndDrinks}</div>
              </div>
            ) : null}
            {event.doorsOpen || event.bingoStart ? (
              <div>
                <span className="text-muted-foreground">Doors / Bingo</span>
                <div className="font-medium">
                  {[event.doorsOpen, event.bingoStart].filter(Boolean).join(" · ")}
                </div>
              </div>
            ) : null}
            {event.extraCardPrice != null ? (
              <div>
                <span className="text-muted-foreground">Extra card price</span>
                <div className="font-medium">{formatMoney(event.extraCardPrice)}</div>
              </div>
            ) : null}
            {event.attire ? (
              <div>
                <span className="text-muted-foreground">Attire</span>
                <div className="font-medium">{event.attire}</div>
              </div>
            ) : null}
            <div>
              <span className="text-muted-foreground">Remaining capacity</span>
              <div className="font-medium">
                <MetricValue metric={summary.counts.remainingCapacity} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <EventHealthScore health={summary.health} />
        <OperationalAlertsPanel alerts={summary.alerts} onAction={handleAlertAction} />
        <OverviewQuickActions onEdit={props.onEdit} onCheckIn={props.onCheckIn} />
        <EventTimelinePanel items={summary.timeline} />
        <RecentActivityPanel items={summary.recentActivity} />
      </div>
    </div>
  );
}
