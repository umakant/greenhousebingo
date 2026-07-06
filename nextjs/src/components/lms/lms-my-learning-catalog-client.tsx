"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { LmsStarRatingDisplay } from "@/components/lms/lms-star-rating";
import { Button } from "@/components/ui/button";
import { lmsMyLearningCoursePath } from "@/lib/lms-my-learning-path";

type SubscriptionPlanOption = {
  id: string;
  name: string;
  freePlan: boolean;
  packagePriceMonthly: string;
  packagePriceYearly: string;
  courseCount: number;
  linkedProduct: { id: string; shopUrl: string | null } | null;
};

type Pricing = {
  requiresStorefrontPurchase: boolean;
  allowsFreeEnrollment: boolean;
  requiresManualGrant: boolean;
  salePrice: string | null;
  saleCurrency: string;
  linkedProduct: {
    id: string;
    name: string;
    slug: string | null;
    price: number | null;
    shopUrl: string | null;
  } | null;
  subscriptionPlans: SubscriptionPlanOption[];
  hasActiveSubscription: boolean;
};

type Row = {
  id: string;
  title: string;
  slug: string;
  status: string;
  isPublic: boolean;
  isEnrolled: boolean;
  activeEnrollmentCount: number;
  capacity: number | null;
  seatsRemaining: number | null;
  pricing: Pricing;
  reviewSummary?: { averageRating: number | null; approvedCount: number };
};

export function LmsMyLearningCatalogClient() {
  const [items, setItems] = React.useState<Row[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [enrollingId, setEnrollingId] = React.useState<string | null>(null);
  const router = useRouter();

  const reload = React.useCallback(async () => {
    setErr(null);
    const res = await fetch("/api/lms/courses?view=learner", { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: Row[]; message?: string } | null;
    if (!res.ok || !data?.ok || !Array.isArray(data.items)) {
      setErr(data?.message ?? "Could not load courses.");
      setItems([]);
      return;
    }
    setItems(data.items);
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function handleEnrollAction(courseId: string, courseSlug: string) {
    setEnrollingId(courseId);
    try {
      const res = await fetch(`/api/lms/courses/${courseId}/self-enroll`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        requiresCheckout?: boolean;
        checkout?: {
          productId: string;
          shopProductUrl: string | null;
          shopCartUrl: string;
          suggestedCouponCode?: string | null;
        };
        subscription?: { id: string };
      } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Enrollment failed");
        return;
      }
      if (data.requiresCheckout && data.checkout) {
        const coupon = data.checkout.suggestedCouponCode?.trim();
        if (coupon) {
          toast.message(`First purchase: use code ${coupon} at checkout`, { duration: 8000 });
        }
        await addProductAndGoToCart(data.checkout.productId, data.checkout.shopCartUrl, data.checkout.shopProductUrl);
        return;
      }
      toast.success("You are enrolled");
      await reload();
      router.push(lmsMyLearningCoursePath({ id: courseId, slug: courseSlug }));
    } finally {
      setEnrollingId(null);
    }
  }

  async function handleSubscribe(planId: string) {
    setEnrollingId(planId);
    try {
      const res = await fetch(`/api/lms/subscription-plans/${planId}/subscribe`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricingPeriod: "monthly" }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        requiresCheckout?: boolean;
        checkout?: { productId: string; shopProductUrl: string | null; shopCartUrl: string };
      } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Subscription failed");
        return;
      }
      if (data.requiresCheckout && data.checkout) {
        await addProductAndGoToCart(
          data.checkout.productId,
          data.checkout.shopCartUrl,
          data.checkout.shopProductUrl,
        );
        return;
      }
      toast.success("Subscription active — bundled courses unlocked");
      await reload();
    } finally {
      setEnrollingId(null);
    }
  }

  async function addProductAndGoToCart(productId: string, cartUrl: string, productUrl: string | null) {
    const res = await fetch("/api/storefront/public/cart", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1, variantKey: "" }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string };
    if (!res.ok || !data?.ok) {
      if (productUrl) {
        window.location.href = productUrl;
        return;
      }
      toast.error(data?.error ?? "Could not add to cart");
      return;
    }
    toast.success("Added to cart — complete checkout to unlock the course");
    window.location.href = cartUrl;
  }

  if (items === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (err) {
    return <p className="text-sm text-destructive">{err}</p>;
  }

  if (items.length === 0) {
    return (
      <CatalogEmptyState />
    );
  }

  return (
    <ul className="divide-y divide-border/60 rounded-lg border border-border/80 bg-card">
      {items.map((c) => (
        <li key={c.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <CatalogCourseSummary course={c} />
          <CatalogCourseActions
            course={c}
            enrolling={enrollingId === c.id}
            onEnroll={() => void handleEnrollAction(c.id, c.slug)}
            onSubscribe={(planId) => void handleSubscribe(planId)}
            subscribingPlanId={enrollingId}
          />
        </li>
      ))}
    </ul>
  );
}

function CatalogEmptyState() {
  return (
    <div className="rounded-lg border border-border/80 bg-card px-4 py-10 text-center text-sm text-muted-foreground">
      No published courses are available to you yet.
    </div>
  );
}

function CatalogCourseSummary({ course }: { course: Row }) {
  const reviews = course.reviewSummary;
  const priceLabel = course.pricing.requiresStorefrontPurchase
    ? course.pricing.linkedProduct?.price != null
      ? `$${course.pricing.linkedProduct.price.toFixed(2)}`
      : "Paid"
    : course.pricing.requiresManualGrant && course.pricing.salePrice
      ? `$${Number(course.pricing.salePrice).toFixed(2)}`
      : "Free";

  return (
    <div className="min-w-0">
      <Link
        href={`/lms/courses/${course.id}`}
        className="font-medium truncate block hover:text-primary hover:underline underline-offset-2"
      >
        {course.title}
      </Link>
      {reviews?.approvedCount ? (
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <LmsStarRatingDisplay rating={reviews.averageRating ?? 0} />
          <span>
            {reviews.averageRating?.toFixed(1)} ({reviews.approvedCount})
          </span>
        </div>
      ) : null}
      <div className="mt-0.5 text-xs text-muted-foreground">
        {course.isPublic ? "Public" : "Private"}
        {course.isEnrolled ? " · Enrolled" : ` · ${priceLabel}`}
        {course.capacity != null && course.seatsRemaining != null ? (
          <span>
            {" "}
            · Seats {course.activeEnrollmentCount}/{course.capacity}
            {course.seatsRemaining === 0 ? " (full)" : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CatalogCourseActions(props: {
  course: Row;
  enrolling: boolean;
  onEnroll: () => void;
  onSubscribe: (planId: string) => void;
  subscribingPlanId: string | null;
}) {
  const { course, enrolling, onEnroll, onSubscribe, subscribingPlanId } = props;

  if (course.isEnrolled) {
    return (
      <Link
        href={lmsMyLearningCoursePath(course)}
        className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Open course
      </Link>
    );
  }

  if (course.seatsRemaining === 0) {
    return <span className="text-sm text-muted-foreground">Course full</span>;
  }

  if (course.pricing.allowsFreeEnrollment) {
    return (
      <Button type="button" size="sm" disabled={enrolling} onClick={onEnroll}>
        {enrolling ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enrolling…
          </>
        ) : (
          "Enroll free"
        )}
      </Button>
    );
  }

  if (course.pricing.requiresStorefrontPurchase) {
    return (
      <Button type="button" size="sm" disabled={enrolling} onClick={onEnroll}>
        {enrolling ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Adding…
          </>
        ) : (
          "Buy & enroll"
        )}
      </Button>
    );
  }

  if (course.pricing.requiresManualGrant) {
    return <span className="text-sm text-muted-foreground">Contact admin to enroll</span>;
  }

  const plans = course.pricing.subscriptionPlans ?? [];
  if (plans.length > 0) {
    const plan = plans[0];
    const label = plan.freePlan
      ? `Subscribe free (${plan.name})`
      : `Subscribe — $${Number(plan.packagePriceMonthly).toFixed(2)}/mo`;
    return (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={subscribingPlanId === plan.id}
        onClick={() => onSubscribe(plan.id)}
      >
        {subscribingPlanId === plan.id ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Subscribing…
          </>
        ) : (
          label
        )}
      </Button>
    );
  }

  return null;
}
