"use client";

import { useEffect, useState } from "react";
import { Mail, MapPin, MessageSquare, Phone, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/waterice/site-header";

const ADDRESS = "Water Ice Express LLC, 9111 Cross Park Drive, Suite D200, Knoxville, TN 39721";
const MAP_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&output=embed`;
const MAP_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`;

export function ContactClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Prefill subject/message when the visitor arrives from a flavor / buyer-type link
  // (e.g. /contact?flavor=Blueberry%20Blast&buyer=distributor).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const flavor = (params.get("flavor") ?? "").trim();
    const buyer = (params.get("buyer") ?? "").trim();
    if (flavor) {
      setSubject((prev) => prev || `Enquiry about ${flavor}`);
    } else if (buyer) {
      setSubject((prev) => prev || `${buyer.charAt(0).toUpperCase()}${buyer.slice(1)} enquiry`);
    }
    const lines: string[] = [];
    if (flavor) lines.push(`Flavor of interest: ${flavor}`);
    if (buyer) lines.push(`I'm a: ${buyer}`);
    if (lines.length) {
      setMessage((prev) => (prev ? prev : `${lines.join("\n")}\n\n`));
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in your name, email and message.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("That email address doesn't look right.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/waterice/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Something went wrong. Please try again.");
        return;
      }
      toast.success("Thanks! Your message has been sent — we'll be in touch soon.");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader active="contact" />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-accent/10 to-background border-b">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, hsl(var(--primary)/0.35) 0, transparent 40%), radial-gradient(circle at 80% 70%, hsl(var(--accent)/0.35) 0, transparent 45%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 py-20 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary mb-3">
            Get in Touch
          </p>
          <h1 className="font-display text-5xl md:text-6xl font-black tracking-tight">
            Let&apos;s talk <span className="text-primary">Water Ice</span>.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Questions about our eBook, a seminar, a wholesale order, or just want to say hi?
            Drop us a line — we read every message.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-16 grid lg:grid-cols-2 gap-10">
        {/* Form */}
        <section className="bg-card border rounded-3xl shadow-sm p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="grid place-items-center w-10 h-10 rounded-xl bg-primary/15 text-primary">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className="font-display text-2xl font-bold">Send a message</h2>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Your name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  required
                  placeholder="Jane Doe"
                  className="mt-1.5 w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  required
                  placeholder="you@email.com"
                  className="mt-1.5 w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Subject
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={120}
                placeholder="What's this about?"
                className="mt-1.5 w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                rows={6}
                required
                placeholder="Tell us how we can help..."
                className="mt-1.5 w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <p className="text-[11px] text-muted-foreground mt-1 text-right">
                {message.length}/2000
              </p>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-display font-bold py-3.5 hover:opacity-90 transition disabled:opacity-60"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? "Sending…" : "Send Message"}
            </button>
          </form>
        </section>

        {/* Map + contact details */}
        <section className="space-y-6">
          <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
            <div className="aspect-[4/3] w-full">
              <iframe
                title="Water Ice Express LLC location map"
                src={MAP_EMBED}
                width="100%"
                height="100%"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                style={{ border: 0 }}
                allowFullScreen
              />
            </div>
            <div className="p-6 flex items-start gap-3">
              <div className="grid place-items-center w-10 h-10 rounded-xl bg-primary/15 text-primary shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-display font-bold">Water Ice Express LLC</p>
                <p className="text-sm text-muted-foreground">
                  9111 Cross Park Drive, Suite D200
                  <br />
                  Knoxville, TN 39721
                </p>
                <a
                  href={MAP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-sm font-semibold text-primary hover:underline"
                >
                  Open in Google Maps →
                </a>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <a
              href="mailto:supports@watericeexpressllc.com"
              className="bg-card border rounded-2xl p-5 hover:shadow-md transition group"
            >
              <div className="grid place-items-center w-10 h-10 rounded-xl bg-primary/15 text-primary mb-3">
                <Mail className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </p>
              <p className="font-display font-bold mt-1 group-hover:text-primary transition-colors break-all">
                supports@watericeexpressllc.com
              </p>
            </a>
            <a
              href="sms:+12678317922"
              className="bg-card border rounded-2xl p-5 hover:shadow-md transition group"
            >
              <div className="grid place-items-center w-10 h-10 rounded-xl bg-primary/15 text-primary mb-3">
                <Phone className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                After-hours Text
              </p>
              <p className="font-display font-bold mt-1 group-hover:text-primary transition-colors">
                (267) 831-7922
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">Text only · after 6pm ET</p>
            </a>
          </div>

          <div className="bg-muted/40 border rounded-2xl p-5 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Business hours</p>
            <p className="mt-1">Mon – Fri · 10:00am – 6:00pm Eastern</p>
          </div>
        </section>
      </main>

      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="bg-card border rounded-3xl shadow-sm p-8 md:p-10 space-y-5 text-base text-muted-foreground leading-relaxed">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            How we can <span className="text-primary">help</span>
          </h2>
          <p>
            If you have questions about our extensive selection of water ice flavors, would like additional information regarding pricing and ordering options, or need assistance with a custom request, our team is here to help. Water Ice Express is committed to providing outstanding customer support and ensuring you have the information, guidance, and resources needed to make the best selection for your business, event, or personal needs.
          </p>
          <p>
            Whether you are interested in learning more about our products, exploring business opportunities, booking catering services, or discussing wholesale and distribution options, our customer service team is available to assist you throughout the process.
          </p>
          <p>
            We kindly ask for your patience as we respond to all inquiries. Due to a high volume of requests and consultations, a member of our team will follow up with you within approximately 72 hours. We sincerely appreciate your understanding and look forward to connecting with you and helping you take the next step with Water Ice Express.
          </p>
        </div>
      </section>
    </div>
  );
}
