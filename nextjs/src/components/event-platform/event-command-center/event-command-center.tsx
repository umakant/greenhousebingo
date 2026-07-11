"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { EventAlerts } from "@/components/event-platform/event-command-center/event-alerts";
import { EventCommandHeader } from "@/components/event-platform/event-command-center/event-command-header";
import {
  EventCommandCenterProvider,
  useEventCommandCenter,
} from "@/components/event-platform/event-command-center/event-command-center-context";
import { EventCommandCenterSkeleton } from "@/components/event-platform/event-command-center/event-command-center-skeleton";
import {
  EventCommandErrorState,
  EventCommandNotFoundState,
  EventCommandPermissionDeniedState,
} from "@/components/event-platform/event-command-center/event-command-center-states";
import { EventCommandTabs } from "@/components/event-platform/event-command-center/event-command-tabs";
import {
  DEFAULT_EVENT_COMMAND_TAB,
  parseEventCommandTab,
  type EventCommandTabId,
} from "@/components/event-platform/event-command-center/event-command-center-types";
import { EventKpiGrid } from "@/components/event-platform/event-command-center/event-kpi-grid";
import { ActivityTab } from "@/components/event-platform/event-command-center/tabs/activity-tab";
import { AttendeesTab } from "@/components/event-platform/event-command-center/tabs/attendees-tab";
import { GuestsTab } from "@/components/event-platform/event-command-center/tabs/guests-tab";
import { FinancialsTab } from "@/components/event-platform/event-command-center/tabs/financials-tab";
import { GamesTab } from "@/components/event-platform/event-command-center/tabs/games-tab";
import { MarketingTab } from "@/components/event-platform/event-command-center/tabs/marketing-tab";
import { OverviewTab } from "@/components/event-platform/event-command-center/tabs/overview-tab";
import { PlantsTab } from "@/components/event-platform/event-command-center/tabs/plants-tab";
import { VenueHostTab } from "@/components/event-platform/event-command-center/tabs/venue-host-tab";
import { EventLiveMode } from "@/components/event-platform/event-command-center/live/event-live-mode";
import { LmsEventFormSheet } from "@/components/lms/lms-event-form-sheet";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { LmsEventCategory } from "@/lib/lms-events/types";

const LmsEventAdminCheckInClient = dynamic(
  () =>
    import("@/components/lms/lms-event-admin-attendees-client").then((m) => m.LmsEventAdminCheckInClient),
  { ssr: false },
);

function EventCommandCenterBody(props: { eventId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    event,
    categories,
    loading,
    error,
    permissionDenied,
    reload,
    setCategories,
  } = useEventCommandCenter();

  const activeTab = parseEventCommandTab(searchParams?.get("tab") ?? null);
  const liveMode = searchParams?.get("live") === "1";
  const [editOpen, setEditOpen] = React.useState(false);
  const [checkInOpen, setCheckInOpen] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = React.useState(false);

  const exitLiveMode = React.useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("live");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : (pathname ?? ""), { scroll: false });
  }, [pathname, router, searchParams]);

  const enterLiveMode = React.useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("live", "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const setActiveTab = React.useCallback(
    (tab: EventCommandTabId) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (tab === DEFAULT_EVENT_COMMAND_TAB) {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : (pathname ?? ""), { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openEdit = React.useCallback(async () => {
    if (!categoriesLoaded) {
      const res = await fetch("/api/lms/admin/events", { credentials: "include", cache: "no-store" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        categories?: LmsEventCategory[];
      } | null;
      if (res.ok && data?.ok) {
        setCategories(data.categories ?? []);
      }
      setCategoriesLoaded(true);
    }
    setEditOpen(true);
  }, [categoriesLoaded, setCategories]);

  if (loading) {
    return <EventCommandCenterSkeleton />;
  }

  if (permissionDenied) {
    return <EventCommandPermissionDeniedState message={error ?? undefined} />;
  }

  if (!event) {
    if (error) {
      return (
        <EventCommandErrorState
          message={error}
          retrying={retrying}
          onRetry={() => {
            setRetrying(true);
            void reload().finally(() => setRetrying(false));
          }}
        />
      );
    }
    return <EventCommandNotFoundState message={error ?? undefined} />;
  }

  if (liveMode) {
    return <EventLiveMode eventId={props.eventId} onExit={exitLiveMode} />;
  }

  return (
    <div className="space-y-6">
      <EventCommandHeader onEdit={() => void openEdit()} onCheckIn={() => setCheckInOpen(true)} onStartLiveMode={enterLiveMode} />
      <EventAlerts eventId={props.eventId} onTabChange={setActiveTab} />
      <EventKpiGrid />
      <EventCommandTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="min-h-[320px] pt-2" role="tabpanel">
        {activeTab === "overview" ? (
          <OverviewTab
            onEdit={() => void openEdit()}
            onCheckIn={() => setCheckInOpen(true)}
            onTabChange={setActiveTab}
          />
        ) : null}
        <AttendeesTab eventId={props.eventId} activeTab={activeTab} />
        <GuestsTab eventId={props.eventId} activeTab={activeTab} />
        {activeTab === "games" ? <GamesTab eventId={props.eventId} activeTab={activeTab} /> : null}
        {activeTab === "plants" ? <PlantsTab eventId={props.eventId} activeTab={activeTab} /> : null}
        {activeTab === "financials" ? <FinancialsTab eventId={props.eventId} activeTab={activeTab} /> : null}
        {activeTab === "venue-host" ? <VenueHostTab eventId={props.eventId} activeTab={activeTab} /> : null}
        {activeTab === "marketing" ? <MarketingTab eventId={props.eventId} activeTab={activeTab} /> : null}
        {activeTab === "activity" ? <ActivityTab eventId={props.eventId} activeTab={activeTab} /> : null}
      </div>

      <LmsEventFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        eventId={event.id}
        eventTitle={event.title}
        categories={categories}
        onSaved={() => void reload()}
      />

      <Sheet open={checkInOpen} onOpenChange={setCheckInOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="sr-only">
            <SheetTitle>Check in attendees</SheetTitle>
            <SheetDescription>Scan a QR code or search by name or email.</SheetDescription>
          </SheetHeader>
          <LmsEventAdminCheckInClient eventId={props.eventId} compact />
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function EventCommandCenter(props: { eventId: string }) {
  return (
    <EventCommandCenterProvider eventId={props.eventId}>
      <React.Suspense fallback={<EventCommandCenterSkeleton />}>
        <EventCommandCenterBody eventId={props.eventId} />
      </React.Suspense>
    </EventCommandCenterProvider>
  );
}
