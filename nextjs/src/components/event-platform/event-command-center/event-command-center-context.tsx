"use client";



import * as React from "react";



import type {

  EventCommandCenterSnapshot,

  EventCommandTabCounts,

  EventCommandTabId,

} from "@/components/event-platform/event-command-center/event-command-center-types";

import { summaryEventToLmsEvent } from "@/components/event-platform/event-command-center/summary-event-mapper";

import type { EventCommandCenterSummary } from "@/lib/event-platform/command-center/command-center-types";

import type { LmsEvent, LmsEventAttendee, LmsEventCategory, LmsEventTicket } from "@/lib/lms-events/types";
import { isBonusBingoCardTicket } from "@/lib/lms-events/event-wizard-input";



type EventCommandCenterContextValue = {

  eventId: string;

  event: LmsEvent | null;

  summary: EventCommandCenterSummary | null;

  tickets: LmsEventTicket[];

  attendees: LmsEventAttendee[];

  categories: LmsEventCategory[];

  loading: boolean;

  summaryLoading: boolean;

  error: string | null;

  permissionDenied: boolean;

  checkedInCount: number;

  registrationCount: number;

  regTrendDays: number | "all";

  tabCounts: EventCommandTabCounts;

  reload: () => Promise<boolean>;

  reloadSummary: (regTrend?: number | "all") => Promise<boolean>;

  setCategories: React.Dispatch<React.SetStateAction<LmsEventCategory[]>>;

};



const EventCommandCenterContext = React.createContext<EventCommandCenterContextValue | null>(null);



export function useEventCommandCenter() {

  const ctx = React.useContext(EventCommandCenterContext);

  if (!ctx) {

    throw new Error("useEventCommandCenter must be used within EventCommandCenterProvider");

  }

  return ctx;

}



function computeTabCounts(summary: EventCommandCenterSummary | null): EventCommandTabCounts {

  if (!summary) return {};

  return {

    attendees: summary.counts.registrations,

    games: summary.counts.games,

  };

}



export function EventCommandCenterProvider(props: {

  eventId: string;

  children: React.ReactNode;

  initialSnapshot?: EventCommandCenterSnapshot | null;

}) {

  const [summary, setSummary] = React.useState<EventCommandCenterSummary | null>(null);

  const [event, setEvent] = React.useState<LmsEvent | null>(props.initialSnapshot?.event ?? null);

  const [tickets, setTickets] = React.useState<LmsEventTicket[]>(props.initialSnapshot?.tickets ?? []);

  const [attendees, setAttendees] = React.useState<LmsEventAttendee[]>(props.initialSnapshot?.attendees ?? []);

  const [categories, setCategories] = React.useState<LmsEventCategory[]>(

    props.initialSnapshot?.categories ?? [],

  );

  const [loading, setLoading] = React.useState(!props.initialSnapshot);

  const [summaryLoading, setSummaryLoading] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);

  const [permissionDenied, setPermissionDenied] = React.useState(false);

  const [regTrendDays, setRegTrendDays] = React.useState<number | "all">(30);

  const [tabCounts, setTabCounts] = React.useState<EventCommandTabCounts>(() =>

    props.initialSnapshot

      ? { attendees: props.initialSnapshot.attendees.length, games: props.initialSnapshot.event.detailContent?.bingoRounds?.length ?? 0 }

      : {},

  );



  const reloadSummary = React.useCallback(

    async (regTrend: number | "all" = regTrendDays) => {

      setSummaryLoading(true);

      const qs = regTrend === "all" ? "regTrend=all" : `regTrend=${regTrend}`;

      const res = await fetch(

        `/api/event-platform/events/${encodeURIComponent(props.eventId)}/command-center?${qs}`,

        { credentials: "include", cache: "no-store" },

      );

      const data = (await res.json().catch(() => null)) as {

        ok?: boolean;

        message?: string;

        summary?: EventCommandCenterSummary;

      } | null;



      setSummaryLoading(false);



      if (res.status === 403) {

        setPermissionDenied(true);

        setError(data?.message ?? "You do not have permission to view this event.");

        setSummary(null);

        setEvent(null);

        return false;

      }



      if (!res.ok || !data?.ok || !data.summary) {

        setPermissionDenied(false);

        setError(data?.message ?? "Event not found.");

        setSummary(null);

        setEvent(null);

        return false;

      }



      setPermissionDenied(false);

      setSummary(data.summary);

      setEvent(summaryEventToLmsEvent(data.summary));

      setRegTrendDays(regTrend);

      setError(null);

      setTabCounts(computeTabCounts(data.summary));

      return true;

    },

    [props.eventId, regTrendDays],

  );



  const reloadLmsDetail = React.useCallback(async () => {

    const res = await fetch(`/api/lms/admin/events/${encodeURIComponent(props.eventId)}`, {

      credentials: "include",

      cache: "no-store",

    });

    const data = (await res.json().catch(() => null)) as {

      ok?: boolean;

      tickets?: LmsEventTicket[];

      attendees?: LmsEventAttendee[];

    } | null;

    if (res.ok && data?.ok) {

      setTickets(data.tickets ?? []);

      setAttendees(data.attendees ?? []);

    }

  }, [props.eventId]);



  const reload = React.useCallback(async () => {

    const ok = await reloadSummary(regTrendDays);

    if (ok) await reloadLmsDetail();

    return ok;

  }, [reloadSummary, reloadLmsDetail, regTrendDays]);



  React.useEffect(() => {

    if (props.initialSnapshot) return;

    let cancelled = false;

    void (async () => {

      setLoading(true);

      await reloadSummary(30);

      await reloadLmsDetail();

      if (!cancelled) setLoading(false);

    })();

    return () => {

      cancelled = true;

    };

  }, [props.initialSnapshot, reloadSummary, reloadLmsDetail]);



  const registrationCount = summary?.counts.registrations ?? attendees.length;

  const checkedInCount = summary?.counts.checkedIn ?? attendees.filter((a) => a.checkedInAt).length;



  const value = React.useMemo<EventCommandCenterContextValue>(

    () => ({

      eventId: props.eventId,

      event,

      summary,

      tickets,

      attendees,

      categories,

      loading,

      summaryLoading,

      error,

      permissionDenied,

      checkedInCount,

      registrationCount,

      regTrendDays,

      tabCounts,

      reload,

      reloadSummary,

      setCategories,

    }),

    [

      props.eventId,

      event,

      summary,

      tickets,

      attendees,

      categories,

      loading,

      summaryLoading,

      error,

      permissionDenied,

      checkedInCount,

      registrationCount,

      regTrendDays,

      tabCounts,

      reload,

      reloadSummary,

    ],

  );



  return (

    <EventCommandCenterContext.Provider value={value}>{props.children}</EventCommandCenterContext.Provider>

  );

}



export function useBonusTicketSoldCount(tickets: LmsEventTicket[]): number | null {
  const bonus = tickets.find(isBonusBingoCardTicket);
  return bonus ? bonus.soldCount : null;
}



export function useActiveTabMount(activeTab: EventCommandTabId, tabId: EventCommandTabId): boolean {

  return activeTab === tabId;

}

