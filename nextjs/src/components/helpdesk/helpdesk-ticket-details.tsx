"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import Link from "next/link";
import { Download, Paperclip, Send, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import MediaPicker from "@/components/MediaPicker";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { getImagePath } from "@/utils/image-path";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";

type UserMini = { id: string; name: string | null; email?: string | null; type?: string | null };
type CategoryMini = { id: string; name: string; color?: string; is_active?: boolean };

type Ticket = {
  id: string;
  ticketId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt?: string | null;
  category?: CategoryMini | null;
  creator?: UserMini | null;
};

type Reply = {
  id: string;
  message: string;
  attachments?: any;
  is_internal: boolean;
  created_by?: string | null;
  creator?: UserMini | null;
  created_at?: string | null;
};


function statusPill(status: string) {
  const colors: Record<string, string> = {
    open: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800",
  };
  const cls = colors[status] ?? "bg-gray-100 text-gray-800";
  const label = status.replace(/_/g, " ");
  return <span className={cn("px-2 py-1 rounded-full text-sm capitalize", cls)}>{label}</span>;
}

function priorityPill(priority: string) {
  const colors: Record<string, string> = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };
  const cls = colors[priority] ?? "bg-gray-100 text-gray-800";
  return <span className={cn("px-2 py-1 rounded-full text-sm capitalize", cls)}>{priority}</span>;
}

function attachmentUrl(nameOrPath: string) {
  const s = String(nameOrPath ?? "").trim();
  if (!s) return "";
  if (s.startsWith("http")) return s;
  if (s.startsWith("/")) return s;
  return `/uploads/media/${s}`;
}

function isImageFile(nameOrPath: string) {
  const s = String(nameOrPath ?? "").toLowerCase();
  return /\.(png|jpe?g|gif|webp|svg)$/.test(s);
}

export default function HelpdeskTicketDetails({
  ticketId,
  actorId,
  isSuperAdmin,
  permissions,
}: {
  ticketId: string;
  actorId: string | null;
  isSuperAdmin: boolean;
  permissions: string[];
}) {
  const canReply = permissions.includes("*") || permissions.includes("create-helpdesk-replies");
  const canDeleteReplies = permissions.includes("*") || permissions.includes("delete-helpdesk-replies");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [ticket, setTicket] = React.useState<Ticket | null>(null);
  const [replies, setReplies] = React.useState<Reply[]>([]);

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  const [message, setMessage] = React.useState("");
  const [attachments, setAttachments] = React.useState<string[]>([]);
  const [isInternal, setIsInternal] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [editorKey, setEditorKey] = React.useState(0);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/helpdesk-tickets/${ticketId}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Failed to load ticket.");

      const tk: Ticket = {
        id: String(json.ticket?.id ?? ""),
        ticketId: String(json.ticket?.ticketId ?? json.ticket?.ticket_id ?? ""),
        title: String(json.ticket?.title ?? ""),
        description: String(json.ticket?.description ?? ""),
        status: String(json.ticket?.status ?? "open"),
        priority: String(json.ticket?.priority ?? "medium"),
        createdAt: json.ticket?.createdAt ?? json.ticket?.created_at ?? null,
        category: json.ticket?.category ?? null,
        creator: json.ticket?.creator ?? null,
      };
      setTicket(tk);
      setReplies(Array.isArray(json.replies) ? json.replies : []);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  async function sendReply() {
    if (!canReply) return;
    if (!message.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/helpdesk-tickets/${ticketId}/replies`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          is_internal: isSuperAdmin ? isInternal : false,
          attachments: attachments.length ? attachments : null,
        }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Failed to send reply.");

      const newReply = json.reply as Reply | undefined;
      setMessage("");
      setAttachments([]);
      setIsInternal(false);
      setEditorKey((v) => v + 1);
      if (newReply) setReplies((prev) => [...prev, newReply]);
      else await load();
    } catch (e: any) {
      setError(e?.message || "Failed to send reply.");
    } finally {
      setSending(false);
    }
  }

  async function deleteReply(id: string) {
    if (!canDeleteReplies) return;
    if (!(await appConfirm(t("Are you sure you want to delete this reply?")))) return;
    setError(null);
    const res = await fetch(`/api/helpdesk-replies/${id}`, { method: "DELETE" });
    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok || !json?.ok) {
      setError(json?.message || "Delete failed.");
      return;
    }
    setReplies((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) return <div className="text-muted-foreground">{t("Loading...")}</div>;
  if (!ticket) return <div className="text-muted-foreground">{t("Not found")}</div>;

  const visibleReplies = replies.filter((r) => (r.is_internal ? isSuperAdmin : true));

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h3 className="text-xl font-bold text-gray-900">
                  #{ticket.ticketId} - {ticket.title}
                </h3>
                <div className="flex gap-2">
                  {statusPill(ticket.status)}
                  {priorityPill(ticket.priority)}
                </div>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: ticket.description }} />
            </div>

            <div className="lg:w-80 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t("Category")}</div>
                  <p className="text-sm font-medium text-gray-900 mt-1">{ticket.category?.name || "-"}</p>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t("Created By")}</div>
                  <p className="text-sm font-medium text-gray-900 mt-1">{ticket.creator?.name || "-"}</p>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t("Created At")}</div>
                <p className="text-sm font-medium text-gray-900 mt-1">{ticket.createdAt ? String(ticket.createdAt).slice(0, 19).replace("T", " ") : "-"}</p>
              </div>
              <div>
                <Link href="/helpdesk-tickets" className="text-sm text-blue-600 hover:underline">
                  {t("Back to tickets")}
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
        <CardHeader className="border-b bg-gray-50/50 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">{t("Conversation")}</CardTitle>
            <div className="text-sm text-gray-500">
              {visibleReplies.length} {visibleReplies.length === 1 ? t("message") : t("messages")}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-0">
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {visibleReplies.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-gray-400 text-2xl">…</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t("No messages yet")}</h3>
                    <p className="text-gray-500">{t("Start the conversation by sending a message below.")}</p>
                  </div>
                </div>
              ) : (
                <>
                  {visibleReplies.map((r) => {
                    const isOwn = actorId && r.created_by && String(r.created_by) === String(actorId);
                    const bubbleClass = r.is_internal
                      ? "bg-orange-100 border-l-4 border-orange-500 text-orange-900"
                      : isOwn
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-900";

                    const attachmentList = Array.isArray(r.attachments)
                      ? (r.attachments as any[]).map(String)
                      : r.attachments
                        ? (r.attachments as any)
                        : [];

                    const attachmentsArr = Array.isArray(attachmentList)
                      ? attachmentList
                      : typeof attachmentList === "string"
                        ? (() => {
                            try {
                              const parsed = JSON.parse(attachmentList);
                              return Array.isArray(parsed) ? parsed.map(String) : [String(attachmentList)];
                            } catch {
                              return [String(attachmentList)];
                            }
                          })()
                        : [];

                    return (
                      <div key={r.id} className={cn("flex mb-4", isOwn ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[70%]", isOwn ? "order-2" : "order-1")}>
                          <div className={cn("rounded-lg p-3", bubbleClass)}>
                            <div className="flex items-center justify-between mb-1 gap-3">
                              <div className="flex items-center gap-2">
                                <span className={cn("text-sm font-medium", r.is_internal ? "text-orange-700" : isOwn ? "text-blue-100" : "text-gray-600")}>
                                  {r.creator?.name || t("User")}
                                </span>
                                {r.is_internal ? <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-medium">{t("Internal Note")}</span> : null}
                              </div>
                              {canDeleteReplies ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteReply(r.id)}
                                  className={cn(
                                    "h-6 w-6 p-0",
                                    r.is_internal ? "text-orange-600 hover:text-red-600 hover:bg-red-50" : isOwn ? "text-blue-100 hover:text-white hover:bg-blue-600" : "text-gray-400 hover:text-red-600 hover:bg-red-50",
                                  )}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              ) : null}
                            </div>

                            <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: r.message }} />

                            {attachmentsArr.length ? (
                              <div className="mt-2 space-y-1">
                                {attachmentsArr.map((a, idx) => {
                                  const url = getImagePath(attachmentUrl(a));
                                  const img = isImageFile(a);
                                  return (
                                    <div key={idx} className={cn("flex items-center gap-2 p-2 rounded", isOwn ? "bg-blue-600/20" : "bg-gray-200")}>
                                      {img ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={url} alt="Preview" className="w-16 h-16 object-cover rounded" />
                                      ) : (
                                        <div className="flex items-center gap-2 flex-1">
                                          <Paperclip className="h-4 w-4" />
                                          <span className="text-sm">{a}</span>
                                        </div>
                                      )}
                                      <Button type="button" variant="ghost" size="sm" onClick={() => window.open(url, "_blank")} className="h-8 w-8 p-0">
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>

                          <div className={cn("text-xs text-gray-500 mt-1", isOwn ? "text-right" : "text-left")}>
                            {r.created_at ? String(r.created_at).slice(0, 19).replace("T", " ") : "-"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {canReply ? (
              <div className="border-t bg-gray-50/50 p-3">
                <div className="space-y-2">
                  <div className="relative">
                    <RichTextEditor
                      key={editorKey}
                      content={message}
                      onChange={(content) => setMessage(content)}
                      placeholder={t("Type your message...")}
                      disabled={ticket.status === "closed" || sending}
                      className="min-h-[80px]"
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <MediaPicker
                        label=""
                        value={attachments}
                        onChange={(value) => setAttachments(Array.isArray(value) ? value : [value].filter(Boolean))}
                        multiple={true}
                        placeholder={t("Attach")}
                        showPreview={false}
                        disabled={ticket.status === "closed" || sending}
                      />

                      {isSuperAdmin ? (
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            id="is_internal"
                            checked={isInternal}
                            onCheckedChange={(checked) => setIsInternal(!!checked)}
                            disabled={ticket.status === "closed" || sending}
                            className="h-4 w-4"
                          />
                          <label htmlFor="is_internal" className="text-xs text-gray-600 cursor-pointer whitespace-nowrap">
                            {t("Internal")}
                          </label>
                        </div>
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      onClick={sendReply}
                      disabled={!message.trim() || ticket.status === "closed" || sending}
                      size="sm"
                      className="flex items-center gap-1.5 px-4 py-2 h-8"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">{sending ? t("Sending...") : t("Send")}</span>
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

