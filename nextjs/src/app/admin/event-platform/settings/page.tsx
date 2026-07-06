import Link from "next/link";
import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

const links = [
  { title: "Currency", href: EVENT_PLATFORM_PATHS.currency, description: "Code, symbol, separators, and position." },
  { title: "Online gateways", href: EVENT_PLATFORM_PATHS.paymentsOnline, description: "Stripe, PayPal, Razorpay." },
  { title: "Offline methods", href: EVENT_PLATFORM_PATHS.paymentsOffline, description: "Invoice, bank transfer, check." },
  { title: "Email", href: EVENT_PLATFORM_PATHS.email, description: "SMTP and templates." },
  { title: "Maintenance", href: EVENT_PLATFORM_PATHS.maintenance, description: "Customer-facing maintenance page." },
  { title: "Integrations", href: EVENT_PLATFORM_PATHS.integrations, description: "OpenAI, Stripe, Twilio, Maps." },
];

export default async function EventPlatformSettingsPage() {
  return (
    <EventPlatformPage permission="settings.manage" path="/admin/event-platform/settings" title="Settings">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <Card key={l.href} className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{l.title}</CardTitle>
              <CardDescription>{l.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild>
                <Link href={l.href}>Configure</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </EventPlatformPage>
  );
}
