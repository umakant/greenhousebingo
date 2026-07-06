"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export default function NotificationsPageClient() {
  const router = useRouter();
  const [items, setItems] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=100", { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setItems(data.items as Notification[]);
        setUnreadCount(data.unreadCount as number);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}/read`, { method: "POST", credentials: "include" }).catch(() => undefined);
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications/read-all", { method: "POST", credentials: "include" }).catch(() => undefined);
  };

  const onClick = async (n: Notification) => {
    if (!n.read) await markRead(n.id);
    if (n.link) router.push(n.link);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Notifications</h1>
          {unreadCount > 0 ? <Badge variant="secondary">{unreadCount} unread</Badge> : null}
        </div>
        {unreadCount > 0 ? (
          <Button variant="outline" size="sm" onClick={() => void markAllRead()}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        ) : null}
      </div>

      <div className="rounded-xl border bg-background">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">You have no notifications.</div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => void onClick(n)}
              className={cn(
                "flex w-full flex-col items-start gap-1 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50 last:border-b-0",
                !n.read && "bg-blue-50/60 dark:bg-blue-950/20",
              )}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
              {n.body ? <span className="text-sm text-muted-foreground">{n.body}</span> : null}
              {n.module ? (
                <Badge variant="outline" className="mt-1 text-[10px] capitalize">
                  {n.module}
                </Badge>
              ) : null}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
