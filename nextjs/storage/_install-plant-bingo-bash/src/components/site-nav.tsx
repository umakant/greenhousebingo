import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import logoUrl from "@/assets/the-social-greenhouse-logo.png";
import {
  Menu,
  X,
  ShoppingCart,
  LogOut,
  LayoutDashboard,
  UserCircle2,
  Ticket,
  Settings,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useSession, dashboardPathFor } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const { user, role, loading } = useSession();
  const dashPath = dashboardPathFor(role);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass border-b border-white/40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <Link to="/" className="flex items-center">
            <img
              src={logoUrl}
              alt="The Social Greenhouse"
              className="h-10 w-auto max-w-[min(100%,200px)] object-contain md:h-11"
            />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <NavItem to="/">Home</NavItem>
            <NavItem to="/events">Events</NavItem>
            <NavItem to="/how-it-works">How It Works</NavItem>
            <NavItem to="/community">Community</NavItem>
            <NavItem to="/contact">Contact</NavItem>
            {!loading && !user && (
              <>
                <NavItem to="/login">Login</NavItem>
                <CreateAccountLink />
              </>
            )}
            {!loading && user && <AccountMenu email={user.email ?? ""} dashPath={dashPath} />}
            <BuyTicketsLink />
          </nav>

          <button className="lg:hidden rounded-full p-2 text-forest-deep" onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>

        {open && (
          <div className="lg:hidden border-t border-white/40 bg-white/90 px-4 py-4 space-y-1">
            {[
              ["/", "Home"],
              ["/events", "Events"],
              ["/how-it-works", "How It Works"],
              ["/community", "Community"],
              ["/contact", "Contact"],
            ].map(([to, label]) => (
              <Link key={to} to={to} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-2 text-forest-deep font-semibold hover:bg-secondary">
                {label}
              </Link>
            ))}
            {!loading && !user && (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="block rounded-xl px-4 py-2 text-forest-deep font-semibold hover:bg-secondary">
                  Login
                </Link>
                <Link to="/login" search={{ tab: "signup" } as never} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-2 text-forest-deep font-semibold hover:bg-secondary">
                  Create Account
                </Link>
              </>
            )}
            {!loading && user && (
              <>
                <Link to={dashPath} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-2 text-forest-deep font-semibold hover:bg-secondary">
                  Dashboard
                </Link>
                <MobileSignOut onDone={() => setOpen(false)} />
              </>
            )}
            <MobileCartLink onClick={() => setOpen(false)} />
          </div>
        )}
      </div>
    </header>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-full px-4 py-2 text-sm font-semibold text-forest-deep hover:bg-secondary transition"
      activeProps={{ className: "bg-secondary" }}
      activeOptions={{ exact: to === "/" }}
    >
      {children}
    </Link>
  );
}

function CreateAccountLink() {
  return (
    <Link
      to="/login"
      className="rounded-full border border-forest/30 bg-white px-4 py-2 text-sm font-bold text-forest-deep hover:bg-secondary transition"
    >
      Create Account
    </Link>
  );
}

function AccountMenu({ email, dashPath }: { email: string; dashPath: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const handleSignOut = async () => {
    setOpen(false);
    const { error } = await supabase.auth.signOut();
    if (error) return toast.error(error.message);
    toast.success("Signed out");
    navigate({ to: "/", replace: true });
  };
  const initial = (email[0] || "?").toUpperCase();
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-forest-deep hover:bg-secondary transition"
        aria-label="Account menu"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-forest text-cream font-bold">{initial}</span>
        <span className="hidden xl:inline max-w-[160px] truncate">{email}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-border bg-white shadow-lifted p-2">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-bold uppercase tracking-widest text-forest">Signed in</p>
              <p className="mt-0.5 text-sm text-forest-deep truncate">{email}</p>
            </div>
            <MenuLink to={dashPath} icon={<LayoutDashboard className="h-4 w-4" />} onClick={() => setOpen(false)}>Dashboard</MenuLink>
            <MenuLink to={dashPath} icon={<UserCircle2 className="h-4 w-4" />} onClick={() => setOpen(false)}>Profile</MenuLink>
            <MenuLink to={dashPath} icon={<Ticket className="h-4 w-4" />} onClick={() => setOpen(false)}>Tickets</MenuLink>
            <MenuLink to={dashPath} icon={<Settings className="h-4 w-4" />} onClick={() => setOpen(false)}>Settings</MenuLink>
            <button
              onClick={handleSignOut}
              className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-tomato hover:bg-tomato/10"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MenuLink({
  to,
  icon,
  onClick,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-forest-deep hover:bg-secondary"
    >
      {icon} {children}
    </Link>
  );
}

function MobileSignOut({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={async () => {
        onDone();
        const { error } = await supabase.auth.signOut();
        if (error) return toast.error(error.message);
        toast.success("Signed out");
        navigate({ to: "/", replace: true });
      }}
      className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-tomato font-semibold hover:bg-tomato/10"
    >
      <LogOut className="h-4 w-4" /> Sign out
    </button>
  );
}

function BuyTicketsLink() {
  const { totalTickets } = useCart();
  return (
    <a
      href="/#events"
      aria-label={totalTickets > 0 ? `Buy Tickets, ${totalTickets} tickets in cart` : "Buy Tickets"}
      className="ml-2 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-cream shadow-soft hover:bg-forest-deep transition hover:-translate-y-0.5"
    >
      <ShoppingCart className="h-4 w-4" />
      <span>Buy Tickets{totalTickets > 0 ? ` (${totalTickets})` : ""}</span>
      {totalTickets > 0 && (
        <span className="inline-flex min-h-8 items-center justify-center rounded-full border-2 border-cream bg-sunny px-3 text-base font-black leading-none text-forest-deep shadow-md">
          {totalTickets} tickets
          <span className="sr-only"> tickets in cart</span>
        </span>
      )}
    </a>
  );
}

function MobileCartLink({ onClick }: { onClick: () => void }) {
  const { totalTickets } = useCart();
  return (
    <a
      href="/#events"
      onClick={onClick}
      aria-label={totalTickets > 0 ? `Buy Tickets, ${totalTickets} tickets in cart` : "Buy Tickets"}
      className="relative block rounded-full bg-forest px-4 py-3 text-center font-bold text-cream"
    >
      <span className="inline-flex items-center gap-2">
        <ShoppingCart className="h-4 w-4" />
        <span>Buy Tickets{totalTickets > 0 ? ` (${totalTickets})` : ""}</span>
        {totalTickets > 0 && (
          <span className="inline-flex min-h-8 items-center justify-center rounded-full border-2 border-cream bg-sunny px-3 text-base font-black leading-none text-forest-deep">
            {totalTickets} tickets
            <span className="sr-only"> tickets in cart</span>
          </span>
        )}
      </span>
    </a>
  );
}
