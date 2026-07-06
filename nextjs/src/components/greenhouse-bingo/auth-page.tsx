"use client";

import Link from "next/link";
import { FormEventHandler, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resolvePostLoginDestination } from "@/lib/launchpad/resolve-post-login-destination";
import { sanitizePostLoginPath } from "@/lib/safe-post-login-path";
import { unformatPhone } from "@/lib/phone";

type AccountRole = "customer" | "rep" | "venue";

const emptySignup = {
  company_name: "",
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  password: "",
  password_confirmation: "",
};

export function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextFromQuery = searchParams?.get("next") ?? null;
  const pendingFromQuery = searchParams?.get("pending") === "1";

  const [role, setRole] = useState<AccountRole>("rep");
  const [activeTab, setActiveTab] = useState("login");
  const [loginProcessing, setLoginProcessing] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupProcessing, setSignupProcessing] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(pendingFromQuery);
  const [signupData, setSignupData] = useState(emptySignup);
  const [customerMessage, setCustomerMessage] = useState<string | null>(null);

  const isCompanySignup = role === "rep" || role === "venue";

  const submitLogin: FormEventHandler = async (e) => {
    e.preventDefault();
    setLoginProcessing(true);
    setLoginError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: loginData.email, password: loginData.password }),
    });
    const payload = (await res.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      home?: string;
    } | null;

    if (!res.ok || !payload?.ok) {
      setLoginError(payload?.message ?? "Invalid credentials.");
      setLoginProcessing(false);
      return;
    }

    const destination = nextFromQuery
      ? sanitizePostLoginPath(nextFromQuery)
      : sanitizePostLoginPath(await resolvePostLoginDestination(payload.home));
    router.push(destination);
    router.refresh();
  };

  const submitSignup: FormEventHandler = async (e) => {
    e.preventDefault();
    setSignupError(null);
    setCustomerMessage(null);

    if (role === "customer") {
      setCustomerMessage("You can browse and book events without an account.");
      return;
    }

    if (unformatPhone(signupData.phone).length !== 10) {
      setSignupError("Enter a valid 10-digit phone number.");
      return;
    }
    if (signupData.password.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }
    if (signupData.password !== signupData.password_confirmation) {
      setSignupError("Passwords do not match.");
      return;
    }

    setSignupProcessing(true);

    const res = await fetch("/api/auth/register-company", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        company_name: signupData.company_name,
        first_name: signupData.first_name,
        last_name: signupData.last_name,
        phone: signupData.phone,
        email: signupData.email,
        password: signupData.password,
        password_confirmation: signupData.password_confirmation,
      }),
    });

    const payload = (await res.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      redirect?: string;
    } | null;

    if (!res.ok || !payload?.ok) {
      setSignupError(payload?.message ?? "Registration failed. Please try again.");
      setSignupProcessing(false);
      return;
    }

    setSignupSuccess(true);
    setSignupProcessing(false);
    setSignupData(emptySignup);
    router.replace("/auth?pending=1");
  };

  if (signupSuccess || pendingFromQuery) {
    return (
      <section className="mx-auto flex max-w-md flex-col items-center px-4 py-16 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Leaf className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold">Greenhouse Bingo</span>
        </Link>
        <div className="mt-8 w-full rounded-2xl border border-border bg-card p-6 shadow-lift">
          <h2 className="font-display text-xl font-semibold">Registration received</h2>
          <div className="mt-4 rounded-lg border border-amber-500/35 bg-amber-50 px-4 py-4 text-sm leading-relaxed text-amber-950">
            <p className="font-medium">Your company is waiting for superadmin approval.</p>
            <p className="mt-2 text-amber-900/90">
              We&apos;ve saved your registration. Once a Greenhouse Bingo administrator approves your
              company, you can sign in with the email and password you registered.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              className="w-full"
              onClick={() => {
                setSignupSuccess(false);
                router.replace("/auth");
                setActiveTab("login");
              }}
            >
              Go to log in
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSignupSuccess(false);
                router.replace("/auth");
                setActiveTab("signup");
              }}
            >
              Register another company
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-md flex-col items-center px-4 py-16 sm:px-6">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Leaf className="h-5 w-5" />
        </span>
        <span className="font-display text-xl font-semibold">Greenhouse Bingo</span>
      </Link>
      <div className="mt-8 w-full rounded-2xl border border-border bg-card p-6 shadow-lift">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Log in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-6 space-y-4">
            <form onSubmit={submitLogin} className="space-y-4">
              {loginError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                  {loginError}
                </div>
              )}
              <div>
                <Label htmlFor="l-email">Email</Label>
                <Input
                  id="l-email"
                  type="email"
                  required
                  autoComplete="email"
                  className="mt-1.5"
                  value={loginData.email}
                  onChange={(e) => setLoginData((d) => ({ ...d, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="l-pw">Password</Label>
                <Input
                  id="l-pw"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="mt-1.5"
                  value={loginData.password}
                  onChange={(e) => setLoginData((d) => ({ ...d, password: e.target.value }))}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginProcessing}>
                {loginProcessing ? "Logging in..." : "Log in"}
              </Button>
              <p className="text-center text-sm">
                <Link href="/forgot-password" className="text-primary hover:underline">
                  Forgot password?
                </Link>
              </p>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-6 space-y-4">
            <form onSubmit={submitSignup} className="space-y-4">
              {signupError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                  {signupError}
                </div>
              )}
              {customerMessage && (
                <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
                  {customerMessage}{" "}
                  <Link href="/events" className="font-medium text-primary hover:underline">
                    Browse events
                  </Link>
                </div>
              )}

              <div>
                <Label htmlFor="s-role">Account type</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AccountRole)}>
                  <SelectTrigger id="s-role" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="rep">Rep / Company</SelectItem>
                    <SelectItem value="venue">Venue partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isCompanySignup && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Company accounts are saved immediately and require superadmin approval before you
                    can log in.
                  </p>
                  <div>
                    <Label htmlFor="s-company">Company name</Label>
                    <Input
                      id="s-company"
                      required
                      className="mt-1.5"
                      value={signupData.company_name}
                      onChange={(e) =>
                        setSignupData((d) => ({ ...d, company_name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="s-first">First name</Label>
                      <Input
                        id="s-first"
                        required
                        className="mt-1.5"
                        value={signupData.first_name}
                        onChange={(e) =>
                          setSignupData((d) => ({ ...d, first_name: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="s-last">Last name</Label>
                      <Input
                        id="s-last"
                        required
                        className="mt-1.5"
                        value={signupData.last_name}
                        onChange={(e) =>
                          setSignupData((d) => ({ ...d, last_name: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="s-phone">Phone</Label>
                    <Input
                      id="s-phone"
                      type="tel"
                      required
                      placeholder="(555) 123-4567"
                      className="mt-1.5"
                      value={signupData.phone}
                      onChange={(e) => setSignupData((d) => ({ ...d, phone: e.target.value }))}
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="s-email">Email</Label>
                <Input
                  id="s-email"
                  type="email"
                  required={isCompanySignup}
                  className="mt-1.5"
                  value={signupData.email}
                  onChange={(e) => setSignupData((d) => ({ ...d, email: e.target.value }))}
                />
              </div>

              {isCompanySignup && (
                <>
                  <div>
                    <Label htmlFor="s-pw">Password</Label>
                    <Input
                      id="s-pw"
                      type="password"
                      required
                      autoComplete="new-password"
                      className="mt-1.5"
                      value={signupData.password}
                      onChange={(e) => setSignupData((d) => ({ ...d, password: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="s-pw-confirm">Confirm password</Label>
                    <Input
                      id="s-pw-confirm"
                      type="password"
                      required
                      autoComplete="new-password"
                      className="mt-1.5"
                      value={signupData.password_confirmation}
                      onChange={(e) =>
                        setSignupData((d) => ({ ...d, password_confirmation: e.target.value }))
                      }
                    />
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={signupProcessing}>
                {signupProcessing
                  ? "Submitting..."
                  : isCompanySignup
                    ? "Create company account"
                    : "Continue"}
              </Button>

              {isCompanySignup && (
                <p className="text-center text-sm text-muted-foreground">
                  Already registered?{" "}
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => setActiveTab("login")}
                  >
                    Log in
                  </button>
                </p>
              )}
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
