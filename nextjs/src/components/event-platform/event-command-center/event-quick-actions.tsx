"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  Copy,
  Download,
  Mail,
  MoreHorizontal,
  Pencil,
  Play,
  QrCode,
  Receipt,
  Sprout,
  Ticket,
  Trophy,
  UserPlus,
  CalendarPlus,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  EventActionsDrawer,
  type EventActionId,
} from "@/components/event-platform/event-command-center/event-actions-drawer";
import { useEventCommandCenter } from "@/components/event-platform/event-command-center/event-command-center-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { lmsEventAdminCheckInPath, lmsEventAdminTicketsPath } from "@/lib/lms-events/paths";

type EventQuickActionsProps = {
  onEdit: () => void;
  onCheckIn: () => void;
  onStartLiveMode?: () => void;
  eventId?: string;
  className?: string;
};

function comingSoon(label: string) {
  toast.info(`${label} will be available in a future update.`);
}

export function EventQuickActions(props: EventQuickActionsProps) {
  const { eventId, event } = useEventCommandCenter();
  const [action, setAction] = React.useState<EventActionId | null>(null);

  if (!event) return null;

  return (
    <div className={props.className}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          onClick={() => (props.onStartLiveMode ? props.onStartLiveMode() : comingSoon("Event Mode"))}
        >
          <Play className="h-4 w-4" />
          <span className="hidden sm:inline">Start Event Mode</span>
          <span className="sm:hidden">Event Mode</span>
        </Button>
        <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={props.onCheckIn}>
          <QrCode className="h-4 w-4" />
          Check In
        </Button>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" asChild>
          <Link href={lmsEventAdminTicketsPath(eventId)}>
            <Ticket className="h-4 w-4" />
            <span className="hidden md:inline">Sell Ticket</span>
            <span className="md:hidden">Tickets</span>
          </Link>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 hidden sm:inline-flex"
          onClick={() => comingSoon("Bonus card sales")}
        >
          <Ticket className="h-4 w-4" />
          Sell Bonus Cards
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="gap-1.5">
              <MoreHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">More</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={props.onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Event
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setAction("add_attendee")}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Attendee
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setAction("add_expense")}>
              <Receipt className="mr-2 h-4 w-4" />
              Add Expense
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setAction("add_plant")}>
              <Sprout className="mr-2 h-4 w-4" />
              Add Plant
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setAction("add_game")}>
              <Trophy className="mr-2 h-4 w-4" />
              Add Game
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setAction("record_winner")}>
              <Trophy className="mr-2 h-4 w-4" />
              Record Winner
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setAction("message")}>
              <Mail className="mr-2 h-4 w-4" />
              Message Attendees
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setAction("duplicate")}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate Event
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setAction("schedule_again")}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              Schedule Again
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => {
              if (props.eventId) {
                window.open(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/reports?format=pdf`, "_blank");
              } else {
                comingSoon("Export report");
              }
            }}>
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setAction("cancel")}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Event
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button type="button" size="icon" variant="ghost" className="sm:hidden" asChild>
          <Link href={lmsEventAdminCheckInPath(eventId)} aria-label="Open check-in page">
            <QrCode className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <EventActionsDrawer
        action={action}
        onOpenChange={(o) => {
          if (!o) setAction(null);
        }}
        onEdit={props.onEdit}
      />
    </div>
  );
}
