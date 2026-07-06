"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Edit as EditIcon, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TableActionButton } from "@/components/ui/table-action-button";
import { t } from "@/lib/admin-t";

type CategoryRow = { id: string; name: string };

type TicketRow = {
  id: string;
  ticket_id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  category_id?: string;
};


export default function HelpdeskTicketRowActions({
  ticket,
  categories,
  canEdit,
  canDelete,
}: {
  ticket: TicketRow;
  categories: CategoryRow[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [openEdit, setOpenEdit] = React.useState(false);
  const [openDelete, setOpenDelete] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    title: ticket.title || "",
    description: ticket.description || "",
    status: ticket.status || "open",
    priority: ticket.priority || "medium",
    category_id: ticket.category_id || "",
  });

  React.useEffect(() => {
    setForm({
      title: ticket.title || "",
      description: ticket.description || "",
      status: ticket.status || "open",
      priority: ticket.priority || "medium",
      category_id: ticket.category_id || "",
    });
  }, [ticket]);

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch(`/api/helpdesk-tickets/${ticket.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          status: form.status,
          priority: form.priority,
          category_id: form.category_id || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Failed to update ticket.");
      setOpenEdit(false);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to update ticket.");
    } finally {
      setProcessing(false);
    }
  }

  async function confirmDelete() {
    if (!canDelete) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch(`/api/helpdesk-tickets/${ticket.id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Failed to delete ticket.");
      setOpenDelete(false);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to delete ticket.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <>
      <TableActionButton
        label={t("Edit")}
        onPrimaryClick={() => setOpenEdit(true)}
        disabled={!canEdit}
        items={[
          { label: t("Edit"), onSelect: () => setOpenEdit(true), disabled: !canEdit, icon: <EditIcon className="h-4 w-4" /> },
          { label: t("Delete"), onSelect: () => setOpenDelete(true), disabled: !canDelete, destructive: true, icon: <Trash2 className="h-4 w-4" /> },
        ]}
      />

      <Sheet open={openEdit} onOpenChange={setOpenEdit}>
        <SheetContent side="right" className="sm:max-w-none w-[560px] max-w-[92vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("Edit Support Ticket")}</SheetTitle>
            <SheetDescription>{t("Update the ticket details below.")}</SheetDescription>
          </SheetHeader>

          <form onSubmit={saveEdit} className="mt-6 space-y-4">
            {error ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor={`edit-title-${ticket.id}`}>{t("Title")}</Label>
              <Input
                id={`edit-title-${ticket.id}`}
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t("Description")}</Label>
              <RichTextEditor
                content={form.description}
                onChange={(v) => setForm((p) => ({ ...p, description: v }))}
                placeholder={t("Describe your issue in detail")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("Status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{t("Open")}</SelectItem>
                    <SelectItem value="in_progress">{t("In Progress")}</SelectItem>
                    <SelectItem value="resolved">{t("Resolved")}</SelectItem>
                    <SelectItem value="closed">{t("Closed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("Priority")}</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t("Low")}</SelectItem>
                    <SelectItem value="medium">{t("Medium")}</SelectItem>
                    <SelectItem value="high">{t("High")}</SelectItem>
                    <SelectItem value="urgent">{t("Urgent")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("Category")}</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => setForm((p) => ({ ...p, category_id: v }))}
                disabled={!categories.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder={categories.length ? t("Select category") : t("No categories available")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenEdit(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={processing || !canEdit}>
                {processing ? t("Updating...") : t("Update")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Delete Ticket")}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">{t("Are you sure you want to delete this ticket?")}</div>
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpenDelete(false)}>
              {t("Cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={processing || !canDelete}>
              {processing ? t("Deleting...") : t("Delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
