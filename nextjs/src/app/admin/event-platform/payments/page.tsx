import Link from "next/link";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

export default async function EventPlatformPaymentsPage() {
  return (
    <EventPlatformPage permission="payments.manage" path="/admin/event-platform/payments" title="Payment Gateways">
      <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Online gateways</CardTitle>
            <CardDescription>Stripe, PayPal, Razorpay and webhook configuration.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link href={EVENT_PLATFORM_PATHS.paymentsOnline}>Manage online</Link></Button>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Offline methods</CardTitle>
            <CardDescription>Invoice, bank transfer, and manual payment instructions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline"><Link href={EVENT_PLATFORM_PATHS.paymentsOffline}>Manage offline</Link></Button>
          </CardContent>
        </Card>
      </div>
    </EventPlatformPage>
  );
}
