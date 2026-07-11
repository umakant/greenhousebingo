"use client";

import * as React from "react";
import { Copy, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { formatPhone, normalizeMobileForStorage } from "@/lib/phone";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ReferralRow = {
  partnerId: string | null;
  holderId: string | null;
  name: string;
  brandName: string | null;
  slug: string | null;
  referralCode: string | null;
  status: string;
  linkActive: boolean;
  companyCount: number;
  source: "ownership" | "standalone";
};

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "pending_agreement":
    case "pending_brand_approval":
    case "pending":
      return "secondary";
    case "suspended":
      return "destructive";
    default:
      return "outline";
  }
}

export default function ReferralLinksAdmin() {
  const [rows, setRows] = React.useState<ReferralRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [origin, setOrigin] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [searchDraft, setSearchDraft] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [addMode, setAddMode] = React.useState<"ownership" | "new">("ownership");
  const [selectedHolderId, setSelectedHolderId] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newBrandName, setNewBrandName] = React.useState("");
  const [newSlug, setNewSlug] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [generatingId, setGeneratingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/partnerships/referral-links", window.location.origin);
      if (search.trim()) url.searchParams.set("search", search.trim());
      const res = await fetch(url.toString(), { credentials: "include" });
      const data = await res.json();
      if (data?.ok) setRows(data.items as ReferralRow[]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    setOrigin(window.location.origin);
    void load();
  }, [load]);

  const unlinkedHolders = React.useMemo(
    () => rows.filter((r) => r.holderId && !r.slug),
    [rows],
  );

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const generateLink = async (holderId: string) => {
    setGeneratingId(holderId);
    try {
      const res = await fetch("/api/partnerships/referral-links", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holderId }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not generate referral link.");
        return;
      }
      toast.success("Referral link generated.");
      void load();
    } finally {
      setGeneratingId(null);
    }
  };

  const openAdd = () => {
    setAddMode(unlinkedHolders.length > 0 ? "ownership" : "new");
    setSelectedHolderId(unlinkedHolders[0]?.holderId ?? "");
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewBrandName("");
    setNewSlug("");
    setAddOpen(true);
  };

  const saveReferral = async () => {
    setSaving(true);
    try {
      let body: Record<string, unknown>;
      if (addMode === "ownership") {
        if (!selectedHolderId) {
          toast.error("Select a brand partner to link.");
          return;
        }
        body = { holderId: selectedHolderId };
      } else {
        if (!newName.trim()) {
          toast.error("Partner name is required.");
          return;
        }
        body = {
          name: newName.trim(),
          email: newEmail.trim(),
          phone: normalizeMobileForStorage(newPhone),
          brandName: newBrandName.trim(),
          slug: newSlug.trim(),
          status: "active",
        };
      }

      const res = await fetch("/api/partnerships/referral-links", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not add referral.");
        return;
      }
      toast.success(addMode === "ownership" ? "Referral link generated." : "Referral partner created.");
      setAddOpen(false);
      void load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p>
          Referral links attribute new <strong className="text-foreground">Companies</strong> (tenant
          signups) to a partner. Brand ownership partners from{" "}
          <strong className="text-foreground">Partnerships → Partners</strong> appear here with their
          brand. Standalone referral partners (not tied to a brand) are listed separately.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by brand, partner, slug, or code…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchDraft);
              }
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setSearch(searchDraft)}>Search</Button>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Referral
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Companies</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Referral link</TableHead>
              <TableHead>Signup link</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No referral partners yet. Add partners under Brands or use Add Referral.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const key = r.holderId ?? r.partnerId ?? r.name;
                const referralLink = r.slug ? `${origin}/p/${r.slug}` : null;
                const signupLink = r.slug ? `${origin}/register?partner=${r.slug}` : null;
                return (
                  <TableRow key={key}>
                    <TableCell className="text-muted-foreground">{r.brandName ?? "—"}</TableCell>
                    <TableCell className="font-medium">
                      {r.name}
                      {r.source === "standalone" ? (
                        <span className="ml-2 text-xs text-muted-foreground">(standalone)</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="tabular-nums">{r.companyCount}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      {referralLink ? (
                        <code className="text-xs">{referralLink}</code>
                      ) : (
                        <span className="text-xs text-muted-foreground">No link yet</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {signupLink ? (
                        <code className="text-xs">{signupLink}</code>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {r.holderId && !r.slug ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={generatingId === r.holderId}
                            onClick={() => void generateLink(r.holderId!)}
                          >
                            {generatingId === r.holderId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Generate"
                            )}
                          </Button>
                        ) : null}
                        {referralLink ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => copy(referralLink)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => copy(signupLink!)}>
                              Signup
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add Referral</SheetTitle>
            <SheetDescription>
              Generate a referral link for a brand ownership partner or create a standalone referral
              partner.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={addMode}
                onValueChange={(v) => setAddMode(v as "ownership" | "new")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ownership">Brand ownership partner</SelectItem>
                  <SelectItem value="new">New standalone referral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {addMode === "ownership" ? (
              <div className="space-y-2">
                <Label>Brand partner *</Label>
                {unlinkedHolders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    All brand partners already have referral links, or none exist yet. Add partners
                    under Partnerships → Partners first.
                  </p>
                ) : (
                  <Select value={selectedHolderId} onValueChange={setSelectedHolderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select partner" />
                    </SelectTrigger>
                    <SelectContent>
                      {unlinkedHolders.map((h) => (
                        <SelectItem key={h.holderId!} value={h.holderId!}>
                          {h.brandName ? `${h.brandName} — ${h.name}` : h.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ref-name">Partner name *</Label>
                  <Input
                    id="ref-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Acme Growth Partners"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ref-brand">Brand name (optional)</Label>
                  <Input
                    id="ref-brand"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ref-email">Email (optional)</Label>
                  <Input
                    id="ref-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ref-phone">Phone (optional)</Label>
                  <Input
                    id="ref-phone"
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(formatPhone(e.target.value))}
                    placeholder="(000) 000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ref-slug">Slug (optional)</Label>
                  <Input
                    id="ref-slug"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    placeholder="auto-generated from name"
                  />
                </div>
              </>
            )}
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveReferral()}
              disabled={
                saving ||
                (addMode === "ownership" && (unlinkedHolders.length === 0 || !selectedHolderId))
              }
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {addMode === "ownership" ? "Generate link" : "Create referral"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
