"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";


type Notification = {
  id: string;
  module: string | null;
  type: string | null;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsDropdown() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=20", { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setItems(data.items as Notification[]);
        setUnreadCount(data.unreadCount as number);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll the unread count periodically so the badge stays fresh.
  React.useEffect(() => {
    let active = true;
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/notifications?limit=1", { credentials: "include" });
        const data = await res.json().catch(() => null);
        if (active && data?.ok) setUnreadCount(data.unreadCount as number);
      } catch {
        /* ignore */
      }
    };
    void fetchCount();
    const id = window.setInterval(fetchCount, 60000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications/read-all", { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }
  };

  const onItemClick = async (n: Notification) => {
    if (!n.read) await markRead(n.id);
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label={t("Notifications")}>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
          <span className="sr-only">{t("Notifications")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <h4 className="text-sm font-semibold">{t("Notifications")}</h4>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t("Mark all read")}
            </button>
          ) : null}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{t("No new notifications")}</div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => void onItemClick(n)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 border-b px-3 py-2.5 text-left transition-colors hover:bg-muted/50 last:border-b-0",
                  !n.read && "bg-blue-50/60 dark:bg-blue-950/20",
                )}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</span>
                  {!n.read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" /> : null}
                </div>
                {n.body ? <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span> : null}
                <span className="text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
              </button>
            ))
          )}
        </div>

        <div className="border-t p-2">
          <Button variant="ghost" className="w-full text-sm" asChild>
            <Link href="/notifications" onClick={() => setOpen(false)}>
              {t("View All Notifications")}
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
