"use client";

import * as React from "react";
import { CircleHelp, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import NoRecordsFound from "@/components/no-records-found";
import { Button } from "@/components/ui/button";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { EventBingoFaqDto } from "@/lib/event-platform/bingo-faqs/bingo-faq-types";
import { cn } from "@/lib/utils";

const emptyForm = {
  question: "",
  answer: "",
  sortOrder: 0,
  status: "active",
};

export function EventPlatformEventFaqsAdmin() {
  const [faqs, setFaqs] = React.useState<EventBingoFaqDto[] | null>(null);
  const [search, setSearch] = React.useState("");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const reload = React.useCallback(async () => {
    const res = await fetch("/api/event-platform/event-faqs", { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      items?: EventBingoFaqDto[];
      message?: string;
    } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not load FAQs.");
      setFaqs([]);
      return;
    }
    setFaqs(data.items ?? []);
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = React.useMemo(() => {
    if (!faqs) return [];
    const q = search.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q),
    );
  }, [faqs, search]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, sortOrder: (faqs?.length ?? 0) + 1 });
    setSheetOpen(true);
  }

  function openEdit(faq: EventBingoFaqDto) {
    setEditingId(faq.id);
    setForm({
      question: faq.question,
      answer: faq.answer,
      sortOrder: faq.sortOrder,
      status: faq.status,
    });
    setSheetOpen(true);
  }

  async function saveFaq() {
    setSaving(true);
    try {
      const url = editingId ? `/api/event-platform/event-faqs/${editingId}` : "/api/event-platform/event-faqs";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not save FAQ.");
        return;
      }
      toast.success(editingId ? "FAQ updated." : "FAQ created.");
      setSheetOpen(false);
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function archiveFaq(id: string) {
    const res = await fetch(`/api/event-platform/event-faqs/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not archive FAQ.");
      return;
    }
    toast.success("FAQ archived.");
    await reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Event FAQs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build reusable FAQs for bingo events, then pick which ones appear on each event page.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add FAQ
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search FAQs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        {faqs === null ? (
          <div className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading FAQs…
          </div>
        ) : filtered.length === 0 ? (
          <NoRecordsFound
            icon={CircleHelp}
            title="No FAQs yet"
            description="Add FAQs to your library, then select them when creating events."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Answer preview</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((faq) => (
                <TableRow key={faq.id}>
                  <TableCell className="max-w-[260px] font-medium">{faq.question}</TableCell>
                  <TableCell className="max-w-[320px] truncate text-muted-foreground">{faq.answer}</TableCell>
                  <TableCell>{faq.sortOrder}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        faq.status === "active"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {faq.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <TableActionButton
                      label="Edit"
                      onPrimaryClick={() => openEdit(faq)}
                      items={
                        faq.status === "active"
                          ? [
                              {
                                label: "Archive",
                                onSelect: () => void archiveFaq(faq.id),
                                destructive: true,
                              },
                            ]
                          : []
                      }
                      className="ml-auto"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit FAQ" : "Add FAQ"}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ef-question">Question</Label>
              <Input
                id="ef-question"
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                placeholder="How do I get in?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ef-answer">Answer</Label>
              <Textarea
                id="ef-answer"
                rows={5}
                value={form.answer}
                onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ef-sort">Sort order</Label>
              <Input
                id="ef-sort"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button
              onClick={() => void saveFaq()}
              disabled={saving || !form.question.trim() || !form.answer.trim()}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingId ? "Save changes" : "Create FAQ"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
