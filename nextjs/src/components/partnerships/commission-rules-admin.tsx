"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MarketplaceType = "none" | "percentage" | "flat";

type PartnerRow = {
  id: string;
  name: string;
  commissionRate: number | null;
  marketplaceCommissionType: MarketplaceType;
  marketplaceCommissionValue: number | null;
};

export default function CommissionRulesAdmin() {
  const [defaultRate, setDefaultRate] = React.useState("10");
  const [mpType, setMpType] = React.useState<MarketplaceType>("none");
  const [mpValue, setMpValue] = React.useState("0");
  const [partners, setPartners] = React.useState<PartnerRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingDefault, setSavingDefault] = React.useState(false);
  const [savingMp, setSavingMp] = React.useState(false);
  const [edits, setEdits] = React.useState<Record<string, string>>({});
  const [mpEdits, setMpEdits] = React.useState<Record<string, { type: MarketplaceType; value: string }>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partnerships/commission-rules", { credentials: "include" });
      const d = await res.json();
      if (d?.ok) {
        setDefaultRate(String(d.defaultRate));
        if (d.marketplaceDefault) {
          setMpType((d.marketplaceDefault.type as MarketplaceType) ?? "none");
          setMpValue(String(d.marketplaceDefault.value ?? 0));
        }
        setPartners(d.partners as PartnerRow[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const saveDefault = async () => {
    setSavingDefault(true);
    try {
      const res = await fetch("/api/partnerships/commission-rules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultRate: Number(defaultRate) }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.ok) toast.success("Default rate saved");
      else toast.error(d?.message ?? "Save failed");
    } finally {
      setSavingDefault(false);
    }
  };

  const saveMarketplaceDefault = async () => {
    setSavingMp(true);
    try {
      const res = await fetch("/api/partnerships/commission-rules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplaceDefault: { type: mpType, value: Number(mpValue) } }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.ok) toast.success("Marketplace rule saved");
      else toast.error(d?.message ?? "Save failed");
    } finally {
      setSavingMp(false);
    }
  };

  const saveOverride = async (partnerId: string) => {
    const raw = edits[partnerId];
    const res = await fetch("/api/partnerships/commission-rules", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId, commissionRate: raw === "" || raw == null ? null : Number(raw) }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      toast.success("Partner rate saved");
      void load();
    } else {
      toast.error(d?.message ?? "Save failed");
    }
  };

  const saveMarketplaceOverride = async (partnerId: string) => {
    const current = partners.find((p) => p.id === partnerId);
    const edit = mpEdits[partnerId] ?? {
      type: current?.marketplaceCommissionType ?? "none",
      value: current?.marketplaceCommissionValue == null ? "" : String(current.marketplaceCommissionValue),
    };
    const res = await fetch("/api/partnerships/commission-rules", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerId,
        marketplaceCommissionType: edit.type,
        marketplaceCommissionValue: edit.value === "" ? 0 : Number(edit.value),
      }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      toast.success("Marketplace override saved");
      void load();
    } else {
      toast.error(d?.message ?? "Save failed");
    }
  };

  const mpEditFor = (p: PartnerRow) =>
    mpEdits[p.id] ?? {
      type: p.marketplaceCommissionType ?? "none",
      value: p.marketplaceCommissionValue == null ? "" : String(p.marketplaceCommissionValue),
    };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform default commission rate</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="grid gap-2">
            <Label htmlFor="default-rate">Default rate (%)</Label>
            <Input
              id="default-rate"
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="w-40"
              value={defaultRate}
              onChange={(e) => setDefaultRate(e.target.value)}
            />
          </div>
          <Button onClick={() => void saveDefault()} disabled={savingDefault}>
            {savingDefault ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Marketplace commission rule (default)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Optional. Applied to paid marketplace orders from referred companies, separate from subscription
            commissions. Choose “Off” to disable marketplace commissions.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={mpType} onValueChange={(v) => setMpType(v as MarketplaceType)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Off</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="flat">Flat amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mp-value">{mpType === "flat" ? "Amount ($)" : "Rate (%)"}</Label>
            <Input
              id="mp-value"
              type="number"
              min={0}
              step={mpType === "flat" ? 1 : 0.5}
              className="w-40"
              value={mpValue}
              disabled={mpType === "none"}
              onChange={(e) => setMpValue(e.target.value)}
            />
          </div>
          <Button onClick={() => void saveMarketplaceDefault()} disabled={savingMp}>
            {savingMp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-partner overrides</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Subscription rate (%)</TableHead>
                <TableHead className="text-right">Save</TableHead>
                <TableHead>Marketplace rule</TableHead>
                <TableHead className="text-right">Save</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : partners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                    No partners yet.
                  </TableCell>
                </TableRow>
              ) : (
                partners.map((p) => {
                  const mp = mpEditFor(p);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          className="w-28"
                          placeholder="Default"
                          value={edits[p.id] ?? (p.commissionRate == null ? "" : String(p.commissionRate))}
                          onChange={(e) => setEdits((s) => ({ ...s, [p.id]: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => void saveOverride(p.id)}>
                          Save
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={mp.type}
                            onValueChange={(v) =>
                              setMpEdits((s) => ({ ...s, [p.id]: { type: v as MarketplaceType, value: mp.value } }))
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Default/Off</SelectItem>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="flat">Flat</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min={0}
                            step={mp.type === "flat" ? 1 : 0.5}
                            className="w-24"
                            placeholder={mp.type === "flat" ? "$" : "%"}
                            disabled={mp.type === "none"}
                            value={mp.value}
                            onChange={(e) =>
                              setMpEdits((s) => ({ ...s, [p.id]: { type: mp.type, value: e.target.value } }))
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => void saveMarketplaceOverride(p.id)}>
                          Save
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
