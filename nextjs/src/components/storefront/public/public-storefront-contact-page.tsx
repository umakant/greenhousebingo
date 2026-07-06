"use client";

import type { CSSProperties } from "react";
import * as React from "react";

import { MapPin, Mail, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { PublishedPageChrome } from "@/components/storefront/public/published-page-view";

/** Default map: 620 King St W, Toronto (matches Concept-style reference). */
const DEFAULT_MAP_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2887.2145439899775!2d-79.40261892346578!3d43.64284807109863!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x882b34dcb51bf745%3A0xceb9e311e4f1a59c!2s620%20King%20St%20W%2C%20Toronto%2C%20ON%20M5V%201M7%2C%20Canada!5e0!3m2!1sen!2sca!4v1700000000000!5m2!1sen!2sca";

const DEFAULT_ADDRESS = "620 King St W, Toronto, ON M5V 1M7, Canada";
const DEFAULT_PHONE = "+33 (0) 31-305-210";
const DEFAULT_HOURS = "mo - fri: 09:00 - 17:00";

function salesEmailFromSupport(support: string): string | null {
  const at = support.indexOf("@");
  if (at <= 0) return null;
  return `sales${support.slice(at)}`;
}

type Props = {
  publicSettings: PublicStorefrontBrandSettings;
  websiteId: string;
  style?: CSSProperties;
  /** When true, skip `PublishedPageChrome` — content mounts inside Liquid theme `#pf-react-main-slot`. */
  themeChrome?: boolean;
};

function SocialIconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center text-neutral-900 transition-opacity hover:opacity-65"
    >
      {children}
    </a>
  );
}

const inputFieldClass =
  "h-12 rounded-xl border border-neutral-200 bg-neutral-100 px-4 text-neutral-900 shadow-none placeholder:text-neutral-400 focus-visible:border-neutral-900 focus-visible:ring-neutral-900/15";

const textareaFieldClass =
  "rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-neutral-900 shadow-none placeholder:text-neutral-400 focus-visible:border-neutral-900 focus-visible:ring-neutral-900/15";

const req = <span className="text-red-600" aria-hidden> *</span>;

export function PublicStorefrontContactPage({ publicSettings, websiteId, style, themeChrome }: Props) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const supportEmail = publicSettings.supportEmail?.trim() || "";
  const displayContact = supportEmail || "contact@yourstore.com";
  const salesEmail = supportEmail ? salesEmailFromSupport(supportEmail) : "sales@yourstore.com";

  const address = process.env.NEXT_PUBLIC_STOREFRONT_CONTACT_ADDRESS?.trim() || DEFAULT_ADDRESS;
  const phoneDisplay = process.env.NEXT_PUBLIC_STOREFRONT_CONTACT_PHONE?.trim() || DEFAULT_PHONE;
  const hoursDisplay = process.env.NEXT_PUBLIC_STOREFRONT_CONTACT_HOURS?.trim() || DEFAULT_HOURS;
  const mapSrc = process.env.NEXT_PUBLIC_STOREFRONT_CONTACT_MAP_EMBED_URL?.trim() || DEFAULT_MAP_EMBED;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject) {
      toast.error("Please choose a subject.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/storefront/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Could not send your message. Try again later.");
        return;
      }
      toast.success("Message sent. We will get back to you soon.");
      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
    } catch {
      toast.error("Network error. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const inner = (
    <main
      className="mx-auto w-full max-w-6xl min-h-[calc(100svh-220px)] bg-white px-4 py-10 text-neutral-950 antialiased md:px-6 md:py-14 lg:px-8"
      style={style}
    >
      <div className="grid items-stretch gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 md:text-[2.25rem] md:leading-tight">
              Contact Us
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-neutral-600 md:text-base">
              We&apos;d love to hear from you. Our team is here to help. Let your customers get in touch with you by
              filling out the email form below.
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pf-contact-name" className="text-sm font-medium text-neutral-800">
                  Name{req}
                </Label>
                <Input
                  id="pf-contact-name"
                  name="name"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  placeholder="Your name"
                  className={inputFieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pf-contact-email" className="text-sm font-medium text-neutral-800">
                  Email{req}
                </Label>
                <Input
                  id="pf-contact-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="you@example.com"
                  className={inputFieldClass}
                />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pf-contact-phone" className="text-sm font-medium text-neutral-800">
                  Phone number
                </Label>
                <PhoneInput
                  id="pf-contact-phone"
                  name="phone"
                  autoComplete="tel"
                  value={phone}
                  onChange={setPhone}
                  className={inputFieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pf-contact-subject" className="text-sm font-medium text-neutral-800">
                  Subject
                </Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger
                    id="pf-contact-subject"
                    className={cn(inputFieldClass, "[&>span]:text-neutral-700")}
                  >
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General support</SelectItem>
                    <SelectItem value="order">Order question</SelectItem>
                    <SelectItem value="returns">Returns</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-contact-message" className="text-sm font-medium text-neutral-800">
                Message{req}
              </Label>
              <Textarea
                id="pf-contact-message"
                name="message"
                required
                rows={6}
                value={message}
                onChange={(ev) => setMessage(ev.target.value)}
                placeholder="How can we help?"
                className={cn(textareaFieldClass, "min-h-[168px] resize-y leading-relaxed")}
              />
            </div>
            <div className="flex flex-col gap-3 pt-1">
              <Button
                type="submit"
                disabled={sending || !subject}
                data-pf-contact-submit
                className="h-12 w-full rounded-full bg-neutral-950 px-8 text-[15px] font-medium !text-white opacity-100 shadow-none hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:!text-neutral-600 disabled:opacity-100 sm:w-auto sm:min-w-[200px]"
              >
                {sending ? "Sending…" : "Send message"}
              </Button>
              <p className="max-w-xl text-[11px] leading-relaxed text-neutral-500">
                This site is protected by hCaptcha and the hCaptcha Privacy Policy and Terms of Service apply.
              </p>
            </div>
          </form>
        </div>

        <div className="relative min-h-[300px] w-full overflow-hidden rounded-3xl bg-neutral-950 ring-1 ring-neutral-800 lg:min-h-[520px]">
          <iframe
            title="Store location"
            src={mapSrc}
            className="absolute inset-0 h-full w-full origin-center scale-[1.02] border-0 brightness-[0.42] contrast-[1.12] saturate-[0.85]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>

      <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4 lg:gap-5">
        <article className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-7">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Address</h2>
          <div className="mt-4 flex gap-3 text-sm leading-relaxed text-neutral-900">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-700" aria-hidden />
            <p>{address}</p>
          </div>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-7">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Email</h2>
          <div className="mt-4 flex gap-3 text-sm">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-neutral-700" aria-hidden />
            <p className="flex flex-col gap-2 leading-relaxed">
              <a className="text-neutral-900 underline-offset-4 hover:underline" href={`mailto:${displayContact}`}>
                {displayContact}
              </a>
              {salesEmail ? (
                <a className="text-neutral-900 underline-offset-4 hover:underline" href={`mailto:${salesEmail}`}>
                  {salesEmail}
                </a>
              ) : null}
            </p>
          </div>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-7">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Phone</h2>
          <div className="mt-4 flex gap-3 text-sm">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-neutral-700" aria-hidden />
            <div>
              <p className="font-medium leading-relaxed text-neutral-900">{phoneDisplay}</p>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">{hoursDisplay}</p>
            </div>
          </div>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-7">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Follow us</h2>
          <div className="mt-5 flex flex-wrap gap-1">
            <SocialIconLink href="https://www.facebook.com" label="Facebook">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
            </SocialIconLink>
            <SocialIconLink href="https://twitter.com" label="X">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </SocialIconLink>
            <SocialIconLink href="https://www.instagram.com" label="Instagram">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8A3.6 3.6 0 0 0 20 16.4V7.6A3.6 3.6 0 0 0 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
              </svg>
            </SocialIconLink>
            <SocialIconLink href="https://www.youtube.com" label="YouTube">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
              </svg>
            </SocialIconLink>
          </div>
        </article>
      </section>
    </main>
  );

  if (themeChrome) {
    return inner;
  }

  return (
    <PublishedPageChrome
      publicSettings={publicSettings}
      title="Contact Us"
      websiteId={websiteId}
      style={style}
    >
      {inner}
    </PublishedPageChrome>
  );
}
