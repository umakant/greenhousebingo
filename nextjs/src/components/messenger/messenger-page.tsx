"use client";

import * as React from "react";
import {
  MessageCircle, Users, Star, User, Search,
  Send, Trash2, MoreVertical, ChevronDown,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "@/contexts/translation-context";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface MessengerUser {
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  last_message?: { body: string; created_at: string } | null;
  unread_count?: number;
  is_online?: boolean;
  is_favorite?: boolean;
}

export interface ChatMessage {
  id: string;
  from_id: string;
  to_id: string;
  body: string;
  attachment: string | null;
  seen: boolean;
  created_at: string;
  is_mine: boolean;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ user, size = "md" }: { user: Pick<MessengerUser, "name" | "avatar">; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconClass = size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <div className={cn("flex flex-shrink-0 items-center justify-center rounded-full bg-muted", sizeClass)}>
      {user.avatar ? (
        <img src={user.avatar} alt={user.name} className={cn("rounded-full object-cover", sizeClass)} />
      ) : (
        <User className={cn("text-muted-foreground", iconClass)} />
      )}
    </div>
  );
}

export function MessengerPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  /** Avoid resetting the open conversation every time the user list refreshes (polling). */
  const lastSyncedWithParamRef = React.useRef<string | null>(null);
  const [tab, setTab] = React.useState<"all" | "favorites">("all");
  const [search, setSearch] = React.useState("");
  const [users, setUsers] = React.useState<MessengerUser[]>([]);
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = React.useState(true);

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [inputText, setInputText] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const fetchUsers = React.useCallback(async (silent = false) => {
    if (!silent) setLoadingUsers(true);
    try {
      const res = await fetch("/api/messenger/users", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      const list: MessengerUser[] = Array.isArray(data?.users) ? data.users : [];
      setUsers(list);
      const fav = new Set<string>();
      list.forEach((u) => { if (u.is_favorite) fav.add(u.id); });
      setFavorites(fav);
    } finally {
      if (!silent) setLoadingUsers(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
    const interval = setInterval(() => fetchUsers(true), 10000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  const withParam = searchParams?.get("with");
  React.useEffect(() => {
    if (!withParam) {
      lastSyncedWithParamRef.current = null;
      return;
    }
    if (users.length === 0) return;
    if (!users.some((u) => u.id === withParam)) return;
    if (lastSyncedWithParamRef.current === withParam) return;
    lastSyncedWithParamRef.current = withParam;
    setSelectedUserId(withParam);
  }, [withParam, users]);

  const fetchMessages = React.useCallback(async (peerId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/messenger/messages?with=${peerId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      fetchUsers(true);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [fetchUsers]);

  React.useEffect(() => {
    if (!selectedUserId) { setMessages([]); return; }
    fetchMessages(selectedUserId);
    const interval = setInterval(() => fetchMessages(selectedUserId, true), 3000);
    return () => clearInterval(interval);
  }, [selectedUserId, fetchMessages]);

  React.useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const filteredUsers = React.useMemo(() => {
    let list = users;
    if (tab === "favorites") list = list.filter((u) => favorites.has(u.id));
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((u) =>
      u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
    return list;
  }, [users, tab, favorites, search]);

  const selectedUser = selectedUserId ? users.find((u) => u.id === selectedUserId) : null;

  const handleSelectUser = (id: string) => {
    setSelectedUserId(id);
    lastSyncedWithParamRef.current = id;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("with", id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !selectedUserId || sending) return;
    setSending(true);
    setInputText("");
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      from_id: "me",
      to_id: selectedUserId,
      body: text,
      attachment: null,
      seen: false,
      created_at: new Date().toISOString(),
      is_mine: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    try {
      const res = await fetch("/api/messenger/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_id: selectedUserId, body: text }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.message) {
          setMessages((prev) =>
            prev.map((m) => (m.id === optimistic.id ? data.message : m))
          );
        }
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setInputText(text);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInputText(text);
    } finally {
      setSending(false);
      fetchUsers(true);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    await fetch(`/api/messenger/messages/${msgId}`, {
      method: "DELETE",
      credentials: "include",
    });
  };

  const handleToggleFavorite = async (userId: string) => {
    const wasFav = favorites.has(userId);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (wasFav) next.delete(userId); else next.add(userId);
      return next;
    });
    setUsers((prev) =>
      prev.map((u) => u.id === userId ? { ...u, is_favorite: !wasFav } : u)
    );
    await fetch("/api/messenger/favorites", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite_id: userId }),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const totalUnread = users.reduce((sum, u) => sum + (u.unread_count ?? 0), 0);

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[480px] gap-4">
      {/* Left panel */}
      <Card className="flex w-full max-w-[320px] flex-shrink-0 flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-2 border-b py-3 px-4">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
          <span className="flex-1 font-medium">{t("Conversations")}</span>
          {totalUnread > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
              {totalUnread}
            </span>
          )}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-2 overflow-hidden p-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "favorites")} className="flex flex-1 flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="all" className="flex items-center gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5" />
                {t("All Users")}
              </TabsTrigger>
              <TabsTrigger value="favorites" className="flex items-center gap-1.5 text-xs">
                <Star className="h-3.5 w-3.5" />
                {t("Favorites")}
              </TabsTrigger>
            </TabsList>

            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search users...")}
                className="h-8 pl-8 text-sm"
              />
            </div>

            {(["all", "favorites"] as const).map((tabKey) => (
              <TabsContent
                key={tabKey}
                value={tabKey}
                className="mt-1 flex-1 overflow-y-auto data-[state=active]:flex data-[state=active]:flex-col"
              >
                <UserList
                  users={filteredUsers}
                  selectedUserId={selectedUserId}
                  onSelect={handleSelectUser}
                  loading={loadingUsers}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  emptyMessage={
                    tabKey === "favorites"
                      ? t("No favorites yet. Star users to add them here.")
                      : t("No users found. Try adjusting your search.")
                  }
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Right panel */}
      <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {selectedUser ? (
          <>
            {/* Chat header */}
            <CardHeader className="flex flex-row items-center gap-3 border-b py-3 px-4">
              <Avatar user={selectedUser} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-sm">{selectedUser.name || selectedUser.email || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedUser.is_online ? (
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      {t("Online")}
                    </span>
                  ) : t("Offline")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                title={favorites.has(selectedUser.id) ? t("Remove from favorites") : t("Add to favorites")}
                onClick={() => handleToggleFavorite(selectedUser.id)}
              >
                <Star
                  className={cn("h-4 w-4 transition-colors", favorites.has(selectedUser.id) && "fill-yellow-400 text-yellow-400")}
                />
              </Button>
            </CardHeader>

            {/* Messages area */}
            <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {t("Loading messages...")}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                    <MessageCircle className="h-10 w-10 opacity-30" />
                    <p>{t("No messages yet. Say hello!")}</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, i) => {
                      const prevMsg = i > 0 ? messages[i - 1] : null;
                      const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
                      return (
                        <React.Fragment key={msg.id}>
                          {showDate && (
                            <div className="flex items-center justify-center">
                              <span className="rounded-full bg-muted px-3 py-0.5 text-xs text-muted-foreground">
                                {new Date(msg.created_at).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
                              </span>
                            </div>
                          )}
                          <MessageBubble
                            msg={msg}
                            onDelete={handleDeleteMessage}
                          />
                        </React.Fragment>
                      );
                    })}
                    <div ref={bottomRef} />
                  </>
                )}
              </div>

              {/* Input area */}
              <div className="border-t p-3">
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("Type a message...")}
                    className="flex-1 text-sm"
                    disabled={sending}
                    autoComplete="off"
                  />
                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={!inputText.trim() || sending}
                    className="shrink-0"
                  >
                    <Send className="h-4 w-4" />
                    <span className="ml-1.5 hidden sm:inline">{t("Send")}</span>
                  </Button>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{t("Press Enter to send")}</p>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 opacity-30" />
            <p className="font-medium">{t("Select a conversation")}</p>
            <p className="text-sm">{t("Choose a user from the list to start messaging.")}</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function MessageBubble({
  msg,
  onDelete,
}: {
  msg: ChatMessage;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn("group flex items-end gap-2", msg.is_mine ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "relative max-w-[70%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
          msg.is_mine
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
        <p className={cn(
          "mt-0.5 text-[10px] leading-tight",
          msg.is_mine ? "text-primary-foreground/70 text-right" : "text-muted-foreground",
        )}>
          {formatTime(msg.created_at)}
          {msg.is_mine && (
            <span className="ml-1">{msg.seen ? "✓✓" : "✓"}</span>
          )}
        </p>
      </div>
      <div className={cn(
        "flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100",
        msg.is_mine ? "flex-row-reverse" : "flex-row",
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={msg.is_mine ? "end" : "start"} className="w-36">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(msg.id)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              {t("Delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function UserList({
  users,
  selectedUserId,
  onSelect,
  loading,
  favorites,
  onToggleFavorite,
  emptyMessage,
}: {
  users: MessengerUser[];
  selectedUserId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  emptyMessage: string;
}) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-8 text-sm text-muted-foreground">
        {t("Loading...")}
      </div>
    );
  }
  if (users.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
        <User className="h-10 w-10 opacity-30" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-0.5">
      {users.map((u) => (
        <li key={u.id} className="group relative">
          <button
            type="button"
            onClick={() => onSelect(u.id)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/60",
              selectedUserId === u.id && "bg-muted",
            )}
          >
            <div className="relative">
              <Avatar user={u} size="md" />
              {u.is_online && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className={cn("truncate text-sm", (u.unread_count ?? 0) > 0 && "font-semibold")}>
                  {u.name || u.email || "—"}
                </p>
                {u.last_message?.created_at && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {new Date(u.last_message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
              {u.last_message ? (
                <p className={cn(
                  "truncate text-xs",
                  (u.unread_count ?? 0) > 0 ? "font-medium text-foreground" : "text-muted-foreground",
                )}>
                  {u.last_message.body}
                </p>
              ) : (
                <p className="truncate text-xs text-muted-foreground italic">{t("No messages yet")}</p>
              )}
            </div>
            {(u.unread_count ?? 0) > 0 && (
              <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                {u.unread_count}
              </span>
            )}
          </button>
          <button
            type="button"
            title={favorites.has(u.id) ? t("Remove from favorites") : t("Add to favorites")}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(u.id); }}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 opacity-0 transition-opacity group-hover:opacity-100",
              selectedUserId === u.id && "opacity-100",
              (u.unread_count ?? 0) > 0 && "right-8",
            )}
          >
            <Star className={cn(
              "h-3.5 w-3.5 transition-colors",
              favorites.has(u.id) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground",
            )} />
          </button>
        </li>
      ))}
    </ul>
  );
}
