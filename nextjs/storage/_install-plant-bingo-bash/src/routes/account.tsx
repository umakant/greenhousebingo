import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { Ticket, Sprout, User as UserIcon, Settings } from "lucide-react";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My Account · Greenhouse Bingo" }] }),
  component: () => (
    <RoleGuard allow={["customer", "guest"]}>
      <AccountPage />
    </RoleGuard>
  ),
});

function AccountPage() {
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
        <p className="text-sm font-bold uppercase tracking-widest text-forest">Customer Dashboard</p>
        <h1 className="mt-2 font-display text-5xl font-bold text-forest-deep">
          Welcome, {profile?.full_name || "friend"} 🌿
        </h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
          Your tickets, plants, and upcoming bingo nights all in one leafy little home.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<Ticket className="h-5 w-5" />} label="Upcoming Tickets" value="0" />
          <StatCard icon={<Sprout className="h-5 w-5" />} label="Plants Won" value="0" />
          <StatCard icon={<UserIcon className="h-5 w-5" />} label="Events Attended" value="0" />
          <StatCard icon={<Settings className="h-5 w-5" />} label="Account Status" value="Active" />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <PanelCard title="My Tickets" description="View QR codes, event details, and past purchases.">
            <Link to="/events" className="mt-4 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-cream shadow-soft hover:bg-forest-deep transition">Find Events</Link>
          </PanelCard>
          <PanelCard title="My Plants" description="Track everything you've won and share care tips with the community.">
            <Link to="/community" className="mt-4 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-cream shadow-soft hover:bg-forest-deep transition">Visit Community</Link>
          </PanelCard>
          <PanelCard title="Profile & Settings" description="Update your name, email, and preferences.">
            <span className="mt-4 inline-flex text-sm font-semibold text-muted-foreground">Coming soon</span>
          </PanelCard>
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
