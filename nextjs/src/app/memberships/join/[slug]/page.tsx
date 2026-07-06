import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WaterIceShell } from "@/components/waterice/waterice-shell";
import { getMembershipPlan } from "@/lib/waterice/membership-plans";
import { MembershipJoinClient } from "./membership-join-client";

export const metadata: Metadata = {
  title: "Join a Membership — Water Ice Express",
  description: "Become a Water Ice Express member and unlock exclusive perks.",
};

export default async function MembershipJoinPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const plan = getMembershipPlan(slug);
  if (!plan) notFound();

  return (
    <WaterIceShell>
      <MembershipJoinClient
        plan={{
          slug: plan.slug,
          name: plan.name,
          price: plan.price,
          billingPeriod: plan.billingPeriod,
          tagline: plan.tagline,
        }}
      />
    </WaterIceShell>
  );
}
