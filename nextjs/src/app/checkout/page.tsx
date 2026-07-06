import type { Metadata } from "next";
import { WaterIceShell } from "@/components/waterice/waterice-shell";
import { CheckoutClient } from "./checkout-client";

export const metadata: Metadata = {
  title: "Checkout — Water Ice Express",
  description: "Securely complete your eBook purchase.",
};

export default function CheckoutPage() {
  return (
    <WaterIceShell>
      <CheckoutClient />
    </WaterIceShell>
  );
}
