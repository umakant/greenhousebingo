import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { Handshake, Package, TrendingUp, Megaphone } from "lucide-react";

export const Route = createFileRoute("/partner/dashboard")({
  head: () => ({ meta: [{ title: "Partner Dashboard · Greenhouse Bingo" }] }),
  component: () => (
    <RoleGuard allow={["partner"]}>
      <PartnerDashboard />
    </RoleGuard>
  ),
});

function PartnerDashboard() {
  const { user } = useSession();
  const [profile, setProfile] = useState<any>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-widest text-forest">Partner Dashboard</p>
        <h1 className="mt-2 font-display text-5xl font-bold text-forest-deep">
          {profile?.company_name || "Your Company"}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
          Manage sponsorships, supply orders, and co-marketing campaigns.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<Handshake className="h-5 w-5" />} label="Active Partnerships" value="0" />
          <StatCard icon={<Package className="h-5 w-5" />} label="Open Orders" value="0" />
          <StatCard icon={<Megaphone className="h-5 w-5" />} label="Campaigns" value="0" />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Reach (30d)" value="0" />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <PanelCard title="Partnership Overview" description="Review your current agreements and terms." />
          <PanelCard title="Supply Orders" description="Track plant, prize, and equipment shipments." />
          <PanelCard title="Co-Marketing" description="Kick off campaigns and view creative assets." />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-lime/40 text-forest-deep">{icon}</span>
        <p className="text-xs font-bold uppercase tracking-widest text-forest">{label}</p>
      </div>
      <p className="mt-4 font-display text-3xl font-bold text-forest-deep">{value}</p>
    </div>
  );
}

function PanelCard({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <h3 className="font-display text-xl font-bold text-forest-deep">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}
