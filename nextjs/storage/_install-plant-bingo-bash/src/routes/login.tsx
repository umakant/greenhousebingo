import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { useSession, dashboardPathFor, type AccountRole } from "@/hooks/use-session";
import {
  Sprout,
  Building2,
  Handshake,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  MapPin,
  Globe,
  Briefcase,
  AtSign,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In · Greenhouse Bingo" },
      {
        name: "description",
        content:
          "Sign in to your Greenhouse Bingo account, or create one as a customer, venue, or partner.",
      },
    ],
  }),
  component: AuthPage,
});

type Tab = "signin" | "signup";
type AccountType = "customer" | "venue" | "partner";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const baseSignup = {
  fullName: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Only letters, numbers, . _ -"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  confirmPassword: z.string(),
  phone: z.string().trim().min(7, "Phone number is required").max(30),
};

const customerSchema = z
  .object({ ...baseSignup, accountType: z.literal("customer") })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const venueSchema = z
  .object({
    ...baseSignup,
    accountType: z.literal("venue"),
    venueName: z.string().trim().min(1, "Business / Venue name is required").max(120),
    address: z.string().trim().min(1, "Address is required").max(200),
    city: z.string().trim().min(1, "City is required").max(80),
    state: z.string().trim().min(1, "State is required").max(40),
    website: z.string().trim().max(200).optional().or(z.literal("")),
    businessType: z.string().trim().min(1, "Business type is required").max(80),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const partnerSchema = z
  .object({
    ...baseSignup,
    accountType: z.literal("partner"),
    companyName: z.string().trim().min(1, "Company name is required").max(120),
    partnerType: z.string().trim().min(1, "Partner type is required").max(80),
    website: z.string().trim().max(200).optional().or(z.literal("")),
    city: z.string().trim().min(1, "City is required").max(80),
    state: z.string().trim().min(1, "State is required").max(40),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

function AuthPage() {
  const navigate = useNavigate();
  const { user, role, loading: sessionLoading } = useSession();
  const [tab, setTab] = useState<Tab>("signin");

  useEffect(() => {
    if (!sessionLoading && user) {
      navigate({ to: dashboardPathFor(role), replace: true });
    }
  }, [user, role, sessionLoading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <main className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16 items-start">
          <div className="hidden lg:block">
            <p className="text-sm font-bold uppercase tracking-widest text-forest">
              Your Account
            </p>
            <h1 className="mt-3 font-display text-5xl font-bold leading-tight text-forest-deep">
              Welcome to the{" "}
              <span className="text-gradient-forest">greenhouse.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-md">
              Sign in to manage your tickets and events, or create an account
              as a customer, venue, or partner.
            </p>

            <div className="mt-10 grid gap-4 max-w-md">
              <PitchRow icon={<Sprout className="h-5 w-5" />} title="Customer" text="Buy tickets, get QR codes, and win plants." />
              <PitchRow icon={<Building2 className="h-5 w-5" />} title="Venue" text="Host bingo nights at your brewery, nursery, or event space." />
              <PitchRow icon={<Handshake className="h-5 w-5" />} title="Partner" text="Sponsor, supply, or co-market with the Greenhouse network." />
            </div>
          </div>

          <div className="rounded-4xl bg-card border border-border shadow-lifted p-6 sm:p-10">
            <div className="grid grid-cols-2 gap-2 rounded-full bg-secondary p-1">
              <TabButton active={tab === "signin"} onClick={() => setTab("signin")}>Sign In</TabButton>
              <TabButton active={tab === "signup"} onClick={() => setTab("signup")}>Create Account</TabButton>
            </div>

            <div className="mt-8">
              {tab === "signin" ? <SignInForm /> : <SignUpForm />}
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <GoogleButton />

            <p className="mt-6 text-center text-xs text-muted-foreground">
              By continuing you agree to our{" "}
              <Link to="/terms" className="underline hover:text-forest-deep">Terms</Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline hover:text-forest-deep">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function PitchRow({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-border bg-card/60 p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lime/40 text-forest-deep">{icon}</div>
      <div>
        <p className="font-display text-lg font-bold text-forest-deep">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full py-2.5 text-sm font-bold transition ${
        active ? "bg-forest text-cream shadow-soft" : "text-forest-deep hover:bg-white/60"
      }`}
    >
      {children}
    </button>
  );
}

/* -------- Sign In -------- */
function SignInForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);

    setBusy(true);
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }

    const uid = signInData.user?.id;
    let role: AccountRole | null = null;
    if (uid) {
      const { data: p } = await supabase.from("profiles").select("account_type").eq("id", uid).maybeSingle();
      role = (p?.account_type as AccountRole) ?? null;
    }
    setBusy(false);
    toast.success("Signed in");
    navigate({ to: dashboardPathFor(role), replace: true });
  };

  const onForgot = async () => {
    if (!email || !email.includes("@")) {
      return toast.error("Enter your email above, then click Forgot Password");
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        icon={<Mail className="h-4 w-4" />}
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        autoComplete="email"
      />
      <Field
        icon={<Lock className="h-4 w-4" />}
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        autoComplete="current-password"
      />
      <div className="flex justify-end">
        <button type="button" onClick={onForgot} className="text-xs font-semibold text-forest hover:underline">
          Forgot Password?
        </button>
      </div>
      <SubmitButton busy={busy}>Sign In</SubmitButton>
    </form>
  );
}

/* -------- Sign Up -------- */
function SignUpForm() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<AccountType>("customer");

  // shared fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");

  // venue fields
  const [venueName, setVenueName] = useState("");
  const [address, setAddress] = useState("");
  const [businessType, setBusinessType] = useState("");

  // partner fields
  const [companyName, setCompanyName] = useState("");
  const [partnerType, setPartnerType] = useState("");

  // venue + partner shared
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [website, setWebsite] = useState("");

  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const shared = { fullName, email, username, password, confirmPassword, phone };

    let parsedData:
      | z.infer<typeof customerSchema>
      | z.infer<typeof venueSchema>
      | z.infer<typeof partnerSchema>;

    if (accountType === "customer") {
      const r = customerSchema.safeParse({ ...shared, accountType });
      if (!r.success) return toast.error(r.error.errors[0].message);
      parsedData = r.data;
    } else if (accountType === "venue") {
      const r = venueSchema.safeParse({
        ...shared,
        accountType,
        venueName,
        address,
        city,
        state,
        website,
        businessType,
      });
      if (!r.success) return toast.error(r.error.errors[0].message);
      parsedData = r.data;
    } else {
      const r = partnerSchema.safeParse({
        ...shared,
        accountType,
        companyName,
        partnerType,
        website,
        city,
        state,
      });
      if (!r.success) return toast.error(r.error.errors[0].message);
      parsedData = r.data;
    }

    setBusy(true);

    // Username uniqueness is enforced by the database unique constraint on
    // profiles.username; a duplicate will surface as a signup error below.


    const metadata: Record<string, string | null> = {
      full_name: parsedData.fullName,
      account_type: parsedData.accountType,
      username: parsedData.username,
      phone: parsedData.phone,
    };
    if (parsedData.accountType === "venue") {
      metadata.venue_name = parsedData.venueName;
      metadata.address = parsedData.address;
      metadata.city = parsedData.city;
      metadata.state = parsedData.state;
      metadata.website = parsedData.website || null;
      metadata.business_type = parsedData.businessType;
    }
    if (parsedData.accountType === "partner") {
      metadata.company_name = parsedData.companyName;
      metadata.partner_type = parsedData.partnerType;
      metadata.website = parsedData.website || null;
      metadata.city = parsedData.city;
      metadata.state = parsedData.state;
    }

    const { data, error } = await supabase.auth.signUp({
      email: parsedData.email,
      password: parsedData.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: metadata,
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);

    if (data.session) {
      toast.success("Account created — welcome!");
      navigate({ to: dashboardPathFor(parsedData.accountType), replace: true });
    } else {
      toast.success("Check your email to confirm your account.");
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-forest">
          I'm signing up as
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <AccountTypeCard
            active={accountType === "customer"}
            onClick={() => setAccountType("customer")}
            icon={<Sprout className="h-5 w-5" />}
            title="Customer"
            subtitle="Buy tickets & win plants"
          />
          <AccountTypeCard
            active={accountType === "venue"}
            onClick={() => setAccountType("venue")}
            icon={<Building2 className="h-5 w-5" />}
            title="Venue"
            subtitle="Host bingo nights"
          />
          <AccountTypeCard
            active={accountType === "partner"}
            onClick={() => setAccountType("partner")}
            icon={<Handshake className="h-5 w-5" />}
            title="Partner"
            subtitle="Sponsor or supply"
          />
        </div>
      </div>

      <Field
        icon={<UserIcon className="h-4 w-4" />}
        label={accountType === "customer" ? "Full Name" : "Contact Name"}
        value={fullName}
        onChange={setFullName}
        placeholder="Jane Gardener"
        autoComplete="name"
      />

      {accountType === "venue" && (
        <Field
          icon={<Building2 className="h-4 w-4" />}
          label="Business / Venue Name"
          value={venueName}
          onChange={setVenueName}
          placeholder="Wildflower Brewing Co."
          autoComplete="organization"
        />
      )}

      {accountType === "partner" && (
        <Field
          icon={<Building2 className="h-4 w-4" />}
          label="Company Name"
          value={companyName}
          onChange={setCompanyName}
          placeholder="GreenSpace Supply Co."
          autoComplete="organization"
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          icon={<Mail className="h-4 w-4" />}
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <Field
          icon={<AtSign className="h-4 w-4" />}
          label="Username"
          value={username}
          onChange={setUsername}
          placeholder="janegardener"
          autoComplete="username"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          icon={<Lock className="h-4 w-4" />}
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
        <Field
          icon={<Lock className="h-4 w-4" />}
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Retype password"
          autoComplete="new-password"
        />
      </div>

      <Field
        icon={<Phone className="h-4 w-4" />}
        label="Phone Number"
        type="tel"
        value={phone}
        onChange={setPhone}
        placeholder="+1 (555) 000-0000"
        autoComplete="tel"
      />

      {accountType === "venue" && (
        <>
          <Field
            icon={<MapPin className="h-4 w-4" />}
            label="Venue Address"
            value={address}
            onChange={setAddress}
            placeholder="123 Garden Lane"
            autoComplete="street-address"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field icon={<MapPin className="h-4 w-4" />} label="City" value={city} onChange={setCity} placeholder="Austin" autoComplete="address-level2" />
            <Field icon={<MapPin className="h-4 w-4" />} label="State" value={state} onChange={setState} placeholder="TX" autoComplete="address-level1" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field icon={<Globe className="h-4 w-4" />} label="Website (optional)" value={website} onChange={setWebsite} placeholder="https://..." autoComplete="url" />
            <SelectField
              icon={<Briefcase className="h-4 w-4" />}
              label="Business Type"
              value={businessType}
              onChange={setBusinessType}
              options={[
                "Brewery",
                "Restaurant",
                "Nursery / Garden Center",
                "Event Space",
                "Café / Coffee Shop",
                "Winery",
                "Other",
              ]}
            />
          </div>
        </>
      )}

      {accountType === "partner" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              icon={<Handshake className="h-4 w-4" />}
              label="Partner Type"
              value={partnerType}
              onChange={setPartnerType}
              options={[
                "Sponsor",
                "Plant Supplier",
                "Equipment Supplier",
                "Marketing Partner",
                "Business Affiliate",
                "Other",
              ]}
            />
            <Field icon={<Globe className="h-4 w-4" />} label="Website (optional)" value={website} onChange={setWebsite} placeholder="https://..." autoComplete="url" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field icon={<MapPin className="h-4 w-4" />} label="City" value={city} onChange={setCity} placeholder="Austin" autoComplete="address-level2" />
            <Field icon={<MapPin className="h-4 w-4" />} label="State" value={state} onChange={setState} placeholder="TX" autoComplete="address-level1" />
          </div>
        </>
      )}

      <SubmitButton busy={busy}>
        Create {accountType === "customer" ? "Customer" : accountType === "venue" ? "Venue" : "Partner"} Account
      </SubmitButton>
    </form>
  );
}

/* -------- Google -------- */
function GoogleButton() {
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error(result.error.message || "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    setBusy(false);
    toast.success("Signed in with Google");
    window.location.assign("/");
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-border bg-white px-6 py-3 text-sm font-bold text-forest-deep shadow-soft hover:bg-secondary transition disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleGlyph />}
      Continue with Google
    </button>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.34z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.88 11.43 0 9 0A9 9 0 0 0 .96 4.96l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

/* -------- Shared UI -------- */
function AccountTypeCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border-2 p-4 transition ${
        active
          ? "border-forest bg-lime/20 shadow-soft"
          : "border-border bg-white hover:border-forest/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`grid h-8 w-8 place-items-center rounded-full ${
            active ? "bg-forest text-cream" : "bg-secondary text-forest-deep"
          }`}
        >
          {icon}
        </span>
        <span className="font-display text-lg font-bold text-forest-deep">{title}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
    </button>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-forest">{label}</span>
      <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20 transition">
        <span className="text-muted-foreground">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-transparent text-forest-deep outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </label>
  );
}

function SelectField({
  icon,
  label,
  value,
  onChange,
  options,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-forest">{label}</span>
      <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20 transition">
        <span className="text-muted-foreground">{icon}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-forest-deep outline-none"
        >
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>
    </label>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-forest px-6 py-3 text-sm font-bold text-cream shadow-soft hover:bg-forest-deep transition disabled:opacity-60"
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
