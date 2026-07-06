import type { Metadata } from "next";
import { SiteHeader } from "@/components/waterice/site-header";
import { WaterIceShell } from "@/components/waterice/waterice-shell";

export const metadata: Metadata = {
  title: "Privacy Policy — Water Ice Express",
  description: "Privacy policy and SMS messaging terms for Water Ice Express LLC.",
  openGraph: {
    title: "Privacy Policy — Water Ice Express",
    description:
      "How Water Ice Express LLC handles your information and SMS communications.",
  },
};

export default function PrivacyPage() {
  return (
    <WaterIceShell>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl md:text-5xl font-extrabold text-foreground">
          Privacy Policy
        </h1>

        <div className="mt-8 space-y-6 text-base md:text-lg text-muted-foreground leading-relaxed">
          <p>
            No mobile information will be shared with third parties/affiliates for marketing/promotional purposes. All the stated categories in this privacy policy exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.
          </p>

          <h2 className="font-display text-2xl font-bold text-foreground pt-4">
            Messaging Terms &amp; Conditions
          </h2>
          <p>
            Upon messaging opt-in, you consent to receive SMS messages from Water Ice Express LLC related to [inquiry, orders, deliveries, shipments, virtual session links, etc].
          </p>

          <h3 className="font-display text-xl font-semibold text-foreground pt-2">
            Message Frequency
          </h3>
          <p>Message frequency may vary.</p>

          <h3 className="font-display text-xl font-semibold text-foreground pt-2">
            Message and Data Rates
          </h3>
          <p>
            Standard message and data rates may apply, depending on your mobile carrier plan.
          </p>

          <h3 className="font-display text-xl font-semibold text-foreground pt-2">
            Opting Out
          </h3>
          <p>
            You may opt out of receiving SMS messages at any time by replying with <span className="font-semibold text-foreground">&quot;STOP&quot;</span> to any SMS message you receive from us. After you send &quot;STOP,&quot; you will receive a confirmation message, and no further SMS messages will be sent to your number.
          </p>

          <h3 className="font-display text-xl font-semibold text-foreground pt-2">
            Help and Support
          </h3>
          <p>For assistance with our SMS service:</p>
          <ul className="list-disc pl-6">
            <li>Reply with <span className="font-semibold text-foreground">&quot;HELP&quot;</span> to any SMS message</li>
          </ul>
        </div>
      </main>
    </WaterIceShell>
  );
}
