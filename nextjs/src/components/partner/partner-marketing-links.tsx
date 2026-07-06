"use client";

import * as React from "react";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LandingPage = { id: string; title: string; slug: string; status: string };

export default function PartnerMarketingLinks({ slug, referralCode }: { slug: string; referralCode: string }) {
  const [pages, setPages] = React.useState<LandingPage[]>([]);
  const [origin, setOrigin] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setOrigin(window.location.origin);
    (async () => {
      try {
        const res = await fetch("/api/partner/landing-pages", { credentials: "include" });
        const d = await res.json();
        if (d?.ok) setPages((d.items as LandingPage[]).filter((p) => p.status === "active"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const links = [
    { label: "Referral landing page", url: `${origin}/p/${slug}` },
    { label: "Direct signup", url: `${origin}/register?partner=${slug}` },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Standard links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {links.map((l) => (
            <div key={l.label} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm text-muted-foreground">{l.label}</div>
                <code className="block truncate text-xs">{l.url}</code>
              </div>
              <Button size="sm" variant="outline" onClick={() => copy(l.url)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="text-sm">
            <span className="text-muted-foreground">Referral code: </span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{referralCode}</code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Branded landing pages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : pages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active landing pages. Create one under Landing Pages.
            </p>
          ) : (
            pages.map((p) => {
              const url = `${origin}/p/${slug}/${p.slug}`;
              return (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{p.title}</div>
                    <code className="block truncate text-xs">{url}</code>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copy(url)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
