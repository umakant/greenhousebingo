"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/admin-t";


export default function HelpdeskTicketCreate() {
  const router = useRouter();
  const [subject, setSubject] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState("medium");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/helpdesk-tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, description, priority }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(json?.message || "Failed to create ticket.");
      const id = String(json?.id ?? "");
      router.push(id ? `/helpdesk-tickets/${id}` : "/helpdesk-tickets");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Create ticket")}</CardTitle>
        <CardDescription>{t("Add a new helpdesk ticket.")}</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("Subject")} *</div>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("Priority")}</div>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
            >
              <option value="low">{t("Low")}</option>
              <option value="medium">{t("Medium")}</option>
              <option value="high">{t("High")}</option>
              <option value="urgent">{t("Urgent")}</option>
            </select>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("Description")} *</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? t("Creating...") : t("Create")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

