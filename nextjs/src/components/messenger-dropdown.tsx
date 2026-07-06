"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/contexts/translation-context";

const POLL_MS = 20_000;
const PREVIEW_LIMIT = 10;

type MessengerUserRow = {
  id: string;
  name: string;
  email: string | null;
  last_message?: { body: string; created_at: string } | null;
  unread_count?: number;
};

function playMessengerChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 500);
  } catch {
    /* ignore */
  }
}

function showMessengerBrowserNotification(incoming: number) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const title = "Paper Flight";
  const body = incoming === 1 ? "You have a new message." : `You have ${incoming} new messages.`;
  try {
    const n = new Notification(title, { body, tag: "pf-messenger", renotify: true } as NotificationOptions);
    window.setTimeout(() => n.close(), 8000);
  } catch {
    /* ignore */
  }
}

function requestNotificationPermission() {
  if (typeof Notification === "undefined" || Notification.permission !== "default") return;
  void Notification.requestPermission();
}

function sortForPreview(list: MessengerUserRow[]): MessengerUserRow[] {
  return [...list].sort((a, b) => {
    const ua = a.unread_count ?? 0;
    const ub = b.unread_count ?? 0;
    if (ua > 0 && ub === 0) return -1;
    if (ub > 0 && ua === 0) return 1;
    const ta = a.last_message?.created_at ?? "";
    const tb = b.last_message?.created_at ?? "";
    return tb.localeCompare(ta);
  });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-indigo-500",
];

function avatarColor(id: string): string {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

export function MessengerDropdown({ canAccess }: { canAccess: boolean }) {
  const { t: tr } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [users, setUsers] = React.useState<MessengerUserRow[]>([]);
  const [loadingList, setLoadingList] = React.useState(false);
  const [totalUnread, setTotalUnread] = React.useState(0);
  const lastTotalRef = React.useRef<number | null>(null);

  const fetchUnread = React.useCallback(async () => {
    if (!canAccess) return;
    try {
      const res = await fetch("/api/messenger/unread-count", { credentials: "include", cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { total?: number };
      const next = typeof data.total === "number" && Number.isFinite(data.total) ? Math.max(0, data.total) : 0;
      const prev = lastTotalRef.current;
      if (prev !== null && next > prev) {
        const delta = next - prev;
        playMessengerChime();
        const hiddenOrBlurred = typeof document !== "undefined" && (document.hidden || !document.hasFocus());
        if (hiddenOrBlurred) showMessengerBrowserNotification(delta);
      }
      lastTotalRef.current = next;
      setTotalUnread(next);
    } catch {
      /* ignore */
    }
  }, [canAccess]);

  const loadUsers = React.useCallback(async () => {
    if (!canAccess) return;
    setLoadingList(true);
    try {
      const res = await fetch("/api/messenger/users", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      const list: MessengerUserRow[] = Array.isArray(data?.users) ? data.users : [];
      setUsers(list);
    } catch {
      setUsers([]);
    } finally {
      setLoadingList(false);
    }
  }, [canAccess]);

  React.useEffect(() => {
    if (!canAccess) return;
    void fetchUnread();
    const id = window.setInterval(() => void fetchUnread(), POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void fetchUnread();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [canAccess, fetchUnread]);

  React.useEffect(() => {
    if (open && canAccess) void loadUsers();
  }, [open, canAccess, loadUsers]);

  if (!canAccess) return null;

  const preview = sortForPreview(users).slice(0, PREVIEW_LIMIT);
  const hasUnread = totalUnread > 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 shrink-0"
          aria-label={tr("Messages")}
          title={tr("Messages")}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="sr-only">{tr("Messages")}</span>
          {hasUnread ? (
            <span className="pointer-events-none absolute right-0 top-0 flex h-4 min-w-4 translate-x-0.5 -translate-y-0.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" onCloseAutoFocus={(e) => e.preventDefault()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">{tr("Messages")}</h4>
          {hasUnread && (
            <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground">
              {totalUnread > 99 ? "99+" : totalUnread} {tr("new")}
            </span>
          )}
        </div>

        {/* Body */}
        {loadingList ? (
          <div className="flex flex-col gap-3 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-1">
                <div className="h-9 w-9 shrink-0 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
                  <div className="h-2.5 w-full rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : preview.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{tr("No conversations yet")}</div>
        ) : (
          <ScrollArea className="max-h-[320px]">
            {preview.map((u, idx) => {
              const unread = u.unread_count ?? 0;
              return (
                <DropdownMenuItem key={u.id} asChild className="p-0 focus:bg-transparent cursor-pointer rounded-none">
                  <Link
                    href={`/messenger?with=${encodeURIComponent(u.id)}`}
                    onClick={() => {
                      requestNotificationPermission();
                      setOpen(false);
                    }}
                    className="flex items-start gap-3 px-4 py-3 outline-none hover:bg-accent transition-colors"
                    style={{ borderBottom: idx < preview.length - 1 ? "1px solid hsl(var(--border) / 0.5)" : "none" }}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(u.id)}`}
                    >
                      {getInitials(u.name)}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`truncate text-sm ${unread > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                          {u.name}
                        </span>
                        {unread > 0 && (
                          <span className="shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold leading-none text-destructive-foreground">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </div>
                      {u.last_message?.body ? (
                        <p className={`truncate text-xs ${unread > 0 ? "text-foreground/80" : "text-muted-foreground"}`}>
                          {u.last_message.body}
                        </p>
                      ) : (
                        <p className="truncate text-xs text-muted-foreground italic">{tr("No messages yet")}</p>
                      )}
                    </div>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </ScrollArea>
        )}

        {/* Footer */}
        <div className="border-t p-2">
          <Button variant="ghost" className="w-full text-sm justify-center" asChild>
            <Link href="/messenger" onClick={() => requestNotificationPermission()}>
              {tr("View all messages")}
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
