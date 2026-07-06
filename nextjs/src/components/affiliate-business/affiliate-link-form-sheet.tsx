"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type PartnerOption = { id: string; name: string; referralCode: string };
type ProgramOption = { id: string; name: string };

export type AffiliateLinkFormValues = {
  id?: string;
  partnerId: string;
  programId: string;
  label: string;
  destinationUrl: string;
  status: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial: AffiliateLinkFormValues | null;
  defaultPartnerId?: string;
  defaultProgramId?: string;
  onSaved: () => void;
};

export function AffiliateLinkFormSheet({
  open,
  onOpenChange,
  mode,
  initial,
  defaultPartnerId,
  defaultProgramId,
  onSaved,
}: Props) {
  const [saving, setSaving] = React.useState(false);
  const [partners, setPartners] = React.useState<PartnerOption[]>([]);
  const [programs, setPrograms] = React.useState<ProgramOption[]>([]);
  const [form, setForm] = React.useState<AffiliateLinkFormValues>({
    partnerId: "",
    programId: "",
    label: "",
    destinationUrl: "",
    status: "active",
  });

  React.useEffect(() => {
    if (!open) return;
    void Promise.all([
      fetch("/api/affiliate-business/partners", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/affiliate-business/programs", { credentials: "include" }).then((r) => r.json()),
    ]).then(([pData, progData]) => {
      const pItems = (pData as { items?: PartnerOption[] })?.items ?? [];
      const progItems = (progData as { items?: ProgramOption[] })?.items ?? [];
      setPartners(pItems);
      setPrograms(progItems);
    });
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setForm(initial);
      return;
    }
    setForm({
      partnerId: defaultPartnerId ?? "",
      programId: defaultProgramId ?? "",
      label: "",
      destinationUrl: "",
      status: "active",
    });
  }, [open, mode, initial, defaultPartnerId, defaultProgramId]);

  const save = async () => {
    if (mode === "create" && (!form.partnerId || !form.programId)) {
      toast.error("Select a partner and program");
      return;
    }
    setSaving(true);
    try {
      const url =
        mode === "edit" && form.id
          ? `/api/affiliate-business/links/${form.id}`
          : "/api/affiliate-business/links";
      const res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Save failed");
        return;
      }
      toast.success(mode === "edit" ? "Link updated" : "Link created");
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[92vw] overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{mode === "edit" ? "Edit affiliate link" : "Create affiliate link"}</SheetTitle>
          <SheetDescription>
            Assign a partner to a program. A trackable URL is generated with ref, program, and link slug.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {mode === "create" ? (
            <>
              <div className="grid gap-2">
                <Label>Partner</Label>
                <Select
                  value={form.partnerId}
                  onValueChange={(v) => setForm((f) => ({ ...f, partnerId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select partner" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.referralCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Program</Label>
                <Select
                  value={form.programId}
                  onValueChange={(v) => setForm((f) => ({ ...f, programId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}
          <div className="grid gap-2">
            <Label>Label (optional)</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Alex — LMS Course Sales"
            />
          </div>
          <div className="grid gap-2">
            <Label>Custom destination URL (optional)</Label>
            <Input
              value={form.destinationUrl}
              onChange={(e) => setForm((f) => ({ ...f, destinationUrl: e.target.value }))}
              placeholder="https://yoursite.com/signup"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the default landing URL from Affiliate Settings.
            </p>
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
