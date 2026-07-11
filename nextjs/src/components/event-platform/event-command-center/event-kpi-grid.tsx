"use client";



import * as React from "react";

import {

  CircleDollarSign,

  Leaf,

  Ticket,

  TrendingUp,

  UserCheck,

  Users,

} from "lucide-react";



import {

  useBonusTicketSoldCount,

  useEventCommandCenter,

} from "@/components/event-platform/event-command-center/event-command-center-context";

import {

  MetricValue,

  metricSublabel,

} from "@/components/event-platform/event-command-center/metric-display";

import { Card, CardContent } from "@/components/ui/card";

import { cn } from "@/lib/utils";



type KpiCardProps = {

  label: string;

  value: React.ReactNode;

  sublabel?: string;

  icon: React.ReactNode;

  iconClass: string;

  unavailable?: boolean;

};



function KpiCard(props: KpiCardProps) {

  return (

    <Card className="shadow-sm">

      <CardContent className="flex items-start justify-between gap-3 p-4">

        <div className="min-w-0 space-y-1">

          <p className="text-xs font-medium text-muted-foreground">{props.label}</p>

          <div className={cn("text-2xl font-bold tracking-tight tabular-nums", props.unavailable && "text-muted-foreground")}>

            {props.value}

          </div>

          {props.sublabel ? <p className="text-xs text-muted-foreground">{props.sublabel}</p> : null}

        </div>

        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", props.iconClass)}>

          {props.icon}

        </div>

      </CardContent>

    </Card>

  );

}



function formatMoney(amount: number, currency: string) {

  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);

}



export function EventKpiGrid() {

  const { summary, registrationCount, checkedInCount, tickets } = useEventCommandCenter();

  const bonusSold = useBonusTicketSoldCount(tickets);



  if (!summary) return null;



  const currency = summary.event.currency || "USD";

  const financial = summary.financial;

  const gamesCount = summary.counts.games;



  return (

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

      <KpiCard

        label="Registrations"

        value={String(registrationCount)}

        sublabel={`${summary.counts.ticketQuantity} reserved toward capacity`}

        icon={<Users className="h-5 w-5" />}

        iconClass="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"

      />

      <KpiCard

        label="Checked In"

        value={String(checkedInCount)}

        sublabel={

          registrationCount > 0

            ? `${Math.round((checkedInCount / registrationCount) * 100)}% of registrations`

            : "No registrations yet"

        }

        icon={<UserCheck className="h-5 w-5" />}

        iconClass="bg-sky-500/15 text-sky-700 dark:text-sky-400"

      />

      <KpiCard

        label="Gross Revenue"

        value={

          <MetricValue

            metric={financial.grossRevenue}

            formatter={(v) => formatMoney(v, currency)}

          />

        }

        sublabel={metricSublabel(financial.grossRevenue) ?? "Ticket & bonus card sales"}

        icon={<CircleDollarSign className="h-5 w-5" />}

        iconClass={

          financial.grossRevenue.availability === "not_configured"

            ? "bg-muted text-muted-foreground"

            : "bg-primary/15 text-primary"

        }

        unavailable={financial.grossRevenue.availability === "not_configured"}

      />

      <KpiCard

        label="Net Profit"

        value={

          <MetricValue

            metric={financial.netProfit}

            formatter={(v) => formatMoney(v, currency)}

          />

        }

        sublabel={metricSublabel(financial.netProfit) ?? metricSublabel(financial.totalExpenses) ?? "After expenses"}

        icon={<TrendingUp className="h-5 w-5" />}

        iconClass={

          financial.netProfit.availability === "not_configured"

            ? "bg-muted text-muted-foreground"

            : "bg-violet-500/15 text-violet-700 dark:text-violet-400"

        }

        unavailable={financial.netProfit.availability === "not_configured"}

      />

      <KpiCard

        label="Bonus Cards"

        value={

          financial.bonusCardRevenue.availability === "not_configured"

            ? "—"

            : bonusSold != null

              ? String(bonusSold)

              : formatMoney(financial.bonusCardRevenue.value ?? 0, currency)

        }

        sublabel={

          financial.bonusCardRevenue.availability === "not_configured"

            ? "No bonus ticket tier"

            : "Bonus card sales"

        }

        icon={<Ticket className="h-5 w-5" />}

        iconClass={

          financial.bonusCardRevenue.availability === "not_configured"

            ? "bg-muted text-muted-foreground"

            : "bg-amber-500/15 text-amber-700 dark:text-amber-400"

        }

        unavailable={financial.bonusCardRevenue.availability === "not_configured"}

      />

      <KpiCard

        label="Plants & Prizes"

        value={gamesCount > 0 ? String(gamesCount) : "—"}

        sublabel={

          summary.counts.plants.availability === "not_configured"

            ? "Inventory tracking not connected"

            : `${gamesCount} bingo rounds configured`

        }

        icon={<Leaf className="h-5 w-5" />}

        iconClass={

          gamesCount > 0

            ? "bg-lime-600/15 text-lime-800 dark:text-lime-400"

            : "bg-muted text-muted-foreground"

        }

        unavailable={gamesCount === 0}

      />

    </div>

  );

}

