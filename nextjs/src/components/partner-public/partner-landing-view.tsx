import Link from "next/link";

type LandingView = {
  partnerSlug: string;
  brandName: string;
  logo?: string | null;
  title?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  description?: string | null;
  industryModule?: string | null;
  callToActionText?: string | null;
};

/** Public, unauthenticated branded landing page for a partner referral. */
export default function PartnerLandingView(props: LandingView) {
  const ctaHref = `/register?partner=${encodeURIComponent(props.partnerSlug)}`;
  const ctaText = props.callToActionText || "Get started";
  const headline = props.headline || props.title || `Welcome from ${props.brandName}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {props.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.logo} alt={props.brandName} className="h-9 w-auto" />
            ) : (
              <span className="text-lg font-semibold">{props.brandName}</span>
            )}
          </div>
          <Link
            href={ctaHref}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {ctaText}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16">
        <div className="text-center">
          {props.industryModule ? (
            <span className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
              {props.industryModule.replace(/-/g, " ")}
            </span>
          ) : null}
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {headline}
          </h1>
          {props.subheadline ? (
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{props.subheadline}</p>
          ) : null}
          {props.description ? (
            <p className="mx-auto mt-6 max-w-2xl whitespace-pre-line text-base text-slate-600">{props.description}</p>
          ) : null}
          <div className="mt-10">
            <Link
              href={ctaHref}
              className="inline-flex items-center rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-sm hover:opacity-90"
            >
              {ctaText}
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">Referred by {props.brandName}</p>
        </div>
      </main>
    </div>
  );
}
