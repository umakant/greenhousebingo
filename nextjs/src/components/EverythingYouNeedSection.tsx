import {
  Users,
  MessageSquare,
  Calendar,
  Workflow,
  Globe,
  BarChart3,
  Mail,
  Phone,
  Sparkles,
  Palette,
  CreditCard,
  Target,
  Megaphone,
  FileText,
  Search,
  QrCode,
  Zap,
  Plus,
  type LucideIcon,
} from "lucide-react";

type Card = {
  title: string;
  desc: string;
  icon: LucideIcon;
  tone: string; // tailwind bg classes
};

const cards: Card[] = [
  { title: "Unlimited Subaccounts", desc: "No per-seat pricing. No limits. Scale to hundreds of client accounts on any plan.", icon: Users, tone: "bg-sky-500" },
  { title: "Unified Inbox", desc: "Email, WhatsApp, SMS, Instagram DMs, and Facebook Messenger — every conversation in one place.", icon: MessageSquare, tone: "bg-blue-500" },
  { title: "Smart Scheduling", desc: "Auto-booking with round-robin, buffer times, and calendar sync. 40% fewer no-shows.", icon: Calendar, tone: "bg-sky-600" },
  { title: "Visual Workflows", desc: "Drag-and-drop automation builder with triggers, conditions, and multi-step sequences.", icon: Workflow, tone: "bg-blue-600" },
  { title: "Website & Funnel Builder", desc: "Drag-and-drop pages, funnels, and full websites — no developers needed.", icon: Globe, tone: "bg-sky-500" },
  { title: "Analytics & Reporting", desc: "Real-time dashboards for pipeline, revenue, campaigns, and team performance.", icon: BarChart3, tone: "bg-blue-500" },
  { title: "Email Marketing", desc: "Drag-and-drop email builder with templates, sequences, A/B testing, and deliverability tracking.", icon: Mail, tone: "bg-sky-600" },
  { title: "Phone System", desc: "VoIP calling, call tracking, auto-dialer, voicemail drops, and call recording via Twilio.", icon: Phone, tone: "bg-blue-700" },
  { title: "AI Assistant", desc: "AI that qualifies leads, books appointments, writes content, and responds to customers 24/7.", icon: Sparkles, tone: "bg-sky-500" },
  { title: "White Label", desc: "Your brand everywhere. Custom domains, logos, colors, and login — clients never see us.", icon: Palette, tone: "bg-blue-600" },
  { title: "Payments & Invoicing", desc: "Invoices, subscriptions, one-time payments, and checkout pages with Stripe and PayPal.", icon: CreditCard, tone: "bg-sky-600" },
  { title: "Pipeline & CRM", desc: "Visual deal pipelines, contact management, tags, smart lists, and lead scoring.", icon: Target, tone: "bg-blue-500" },
  { title: "Campaigns", desc: "Multi-channel campaigns across email, SMS, and social — all from one dashboard.", icon: Megaphone, tone: "bg-sky-700" },
  { title: "Forms & Surveys", desc: "Custom forms, surveys, and quizzes with conditional logic and CRM integration.", icon: FileText, tone: "bg-blue-500" },
  { title: "SEO Tools", desc: "On-page SEO, meta management, sitemap generation, and keyword tracking built in.", icon: Search, tone: "bg-sky-600" },
  { title: "QR Codes", desc: "Generate branded QR codes for funnels, booking links, review pages, and more.", icon: QrCode, tone: "bg-blue-700" },
  { title: "AI Workspace Builder", desc: "Describe your business and AI builds your entire setup — site, funnels, workflows — in minutes.", icon: Zap, tone: "bg-sky-500" },
  { title: "And Tons More", desc: "Reputation management, social scheduling, memberships, communities, AI agents, call tracking, chat widgets, and more — all included.", icon: Plus, tone: "bg-blue-600" },
];

export function EverythingYouNeedSection() {
  return (
    <section className="bg-background px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Everything You Need.
          <br />
          <span className="text-brand">Nothing You Don't.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base text-muted-foreground sm:text-lg">
          One platform. All the tools. No upsells. No per-seat fees.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.tone} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
