import { createFileRoute } from "@tanstack/react-router";
import { ScrollText, Printer, ListOrdered } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — The Social Greenhouse" },
      {
        name: "description",
        content:
          "How The Social Greenhouse collects, uses, discloses, retains, and safeguards Personal Information across its Platform and Services.",
      },
      { property: "og:title", content: "Privacy Policy — The Social Greenhouse" },
      {
        property: "og:description",
        content:
          "Read our full Privacy Policy — data collection, cookies, user rights, GDPR & CCPA, retention, security, and more.",
      },
    ],
  }),
  component: PrivacyPage,
});

type Section = { id: string; title: string; body: React.ReactNode };

const sections: Section[] = [
  {
    id: "introduction",
    title: "Introduction",
    body: (
      <>
        <p>
          This Privacy Policy (the &ldquo;Policy&rdquo;) describes how The Social
          Greenhouse (the &ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo;
          or &ldquo;our&rdquo;) collects, uses, discloses, retains, and safeguards
          Personal Information in connection with its websites, applications,
          application programming interfaces, mobile experiences, administrative
          portals, communications, marketing activities, and any related products or
          services (collectively, the &ldquo;Platform&rdquo; or the
          &ldquo;Services&rdquo;).
        </p>
        <p>
          We are committed to protecting the privacy of every individual who
          interacts with the Services, and this Policy is intended to explain, in a
          clear and transparent manner, the practices that govern the information we
          handle. Our data practices are designed to comply with applicable data
          protection and privacy laws in the jurisdictions in which we operate and
          to reflect widely accepted principles of fair information practices,
          including lawfulness, fairness, transparency, purpose limitation, data
          minimization, accuracy, storage limitation, integrity, confidentiality,
          and accountability.
        </p>
        <p>
          By accessing or using the Services, you acknowledge that you have read,
          understood, and agree to the practices described in this Policy.
        </p>
      </>
    ),
  },
  {
    id: "definitions",
    title: "Definitions",
    body: (
      <>
        <p>
          For the purposes of this Policy, the following capitalized terms have the
          meanings assigned to them below. Words denoting the singular include the
          plural and vice versa, and words denoting any gender include all genders.
        </p>
        <dl className="space-y-4">
          <Definition term="Company">
            The entity providing the Services, together with its parents,
            subsidiaries, affiliates, successors, and assigns.
          </Definition>
          <Definition term="Services">
            Any product, feature, subscription, application, tool, integration, API,
            dashboard, communication channel, event, or professional service made
            available by the Company.
          </Definition>
          <Definition term="Platform">
            The technical infrastructure, software, and interfaces through which the
            Services are delivered.
          </Definition>
          <Definition term="User">
            Any natural person who accesses or uses the Services, including visitors,
            authorized users of a Customer account, invited collaborators, and
            individuals engaging with support or sales channels.
          </Definition>
          <Definition term="Customer">
            Any organization or individual that has entered into an agreement with
            the Company for access to the Services.
          </Definition>
          <Definition term="Personal Information">
            Any information that identifies, relates to, describes, is reasonably
            capable of being associated with, or could reasonably be linked with a
            particular individual or household.
          </Definition>
          <Definition term="Sensitive Information">
            A subset of Personal Information warranting heightened protection, such
            as government identifiers, financial account information, precise
            geolocation, biometric or genetic data, and health information.
          </Definition>
          <Definition term="Processing">
            Any operation performed on Personal Information, including collection,
            recording, storage, use, disclosure, and deletion.
          </Definition>
        </dl>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information We Collect",
    body: (
      <>
        <p>
          We collect several categories of Personal Information in connection with
          the Services. The specific information collected depends on how you
          interact with us, the features you use, the configuration selected by the
          Customer, and the requirements of Applicable Law.
        </p>
        <SubHeading>3.1 Identity and Contact Information</SubHeading>
        <p>
          Name, email address, phone number, mailing address, job title, and any
          other identifying information you provide when creating an account,
          subscribing to communications, or contacting us.
        </p>
        <SubHeading>3.2 Business Information</SubHeading>
        <p>
          Where you interact with the Services on behalf of an organization, we may
          collect the organization&rsquo;s name, address, industry, size, and your
          role.
        </p>
        <SubHeading>3.3 Account and Profile Information</SubHeading>
        <p>
          Login credentials, preferences, profile settings, and communication
          preferences.
        </p>
        <SubHeading>3.4 Device, Browser, and Network Information</SubHeading>
        <p>
          IP address, browser type and version, operating system, device
          identifiers, referring URLs, and other technical signals.
        </p>
        <SubHeading>3.5 Usage and Activity Information</SubHeading>
        <p>
          Pages viewed, features accessed, session duration, click paths, and
          interactions with the Services.
        </p>
        <SubHeading>3.6 Payment Information</SubHeading>
        <p>
          Billing details processed by qualified third-party payment providers that
          maintain PCI DSS compliance. We do not store full payment card numbers.
        </p>
        <SubHeading>3.7 Content You Provide</SubHeading>
        <p>
          Files, text, images, and other materials uploaded to or transmitted
          through the Services.
        </p>
        <SubHeading>3.8 Authentication Data</SubHeading>
        <p>
          Records of logins, authentication tokens, multi-factor authentication
          events, and related security events.
        </p>
      </>
    ),
  },
  {
    id: "how-information-is-collected",
    title: "How Information Is Collected",
    body: (
      <>
        <p>
          Personal Information is collected directly from you, automatically through
          your use of the Services, and from authorized Third Parties acting on
          behalf of, or in cooperation with, the Company.
        </p>
        <SubHeading>4.1 Registration and Account Creation</SubHeading>
        <p>Information you provide when creating an account or configuring a workspace.</p>
        <SubHeading>4.2 Direct Communications</SubHeading>
        <p>Information provided via contact forms, email, phone, chat, or events.</p>
        <SubHeading>4.3 Automated Technologies</SubHeading>
        <p>
          Cookies, pixels, SDKs, and server logs record technical information as you
          use the Services.
        </p>
        <SubHeading>4.4 Analytics and Product Telemetry</SubHeading>
        <p>
          First- and third-party analytics tools measure usage, performance, and
          feature adoption.
        </p>
        <SubHeading>4.5 Third-Party Sources</SubHeading>
        <p>
          Information received from resellers, partners, integrators, publicly
          available sources, and enrichment providers.
        </p>
      </>
    ),
  },
  {
    id: "legal-basis",
    title: "Legal Basis for Processing",
    body: (
      <>
        <p>
          Where required by Applicable Law, including the EU General Data Protection
          Regulation (&ldquo;GDPR&rdquo;) and the UK GDPR, we rely on one or more of
          the following legal bases:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Contract:</strong> processing necessary to perform a contract
            with you or take steps at your request.
          </li>
          <li>
            <strong>Consent:</strong> where you have given specific, informed, and
            unambiguous consent, which you may withdraw at any time.
          </li>
          <li>
            <strong>Legitimate Interests:</strong> to operate, secure, and improve
            the Services in a manner that does not override your rights.
          </li>
          <li>
            <strong>Legal Obligations:</strong> to comply with laws, regulations,
            court orders, and lawful requests from public authorities.
          </li>
          <li>
            <strong>Vital Interests / Public Interest:</strong> where processing is
            necessary to protect vital interests or perform tasks in the public
            interest.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How We Use Information",
    body: (
      <>
        <p>We use Personal Information for the following purposes:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Providing, maintaining, and improving the Services.</li>
          <li>Authenticating users and securing accounts.</li>
          <li>Processing transactions, subscriptions, and billing.</li>
          <li>Communicating service updates, security notices, and support.</li>
          <li>
            Sending marketing communications, where permitted by Applicable Law and
            your preferences.
          </li>
          <li>Detecting, preventing, and responding to fraud, abuse, and security threats.</li>
          <li>
            Meeting legal, regulatory, tax, audit, accounting, and internal
            governance obligations.
          </li>
          <li>
            Conducting research, analytics, and product development to improve
            functionality.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "payment-processing",
    title: "Payment Processing",
    body: (
      <>
        <p>
          Payment transactions are processed by qualified third-party payment
          providers (such as Stripe) that maintain compliance with the Payment Card
          Industry Data Security Standard (&ldquo;PCI DSS&rdquo;). We do not store
          full payment card numbers on our systems. We apply commercially reasonable
          measures to ensure that pricing, tax treatment, refunds, and chargebacks
          are handled accurately and consistently with Applicable Law.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and Tracking Technologies",
    body: (
      <>
        <p>
          We use cookies, pixels, tags, SDKs, and similar technologies to operate,
          secure, personalize, and measure the performance of the Services.
        </p>
        <SubHeading>8.1 Strictly Necessary Cookies</SubHeading>
        <p>Required for core functionality such as authentication and security.</p>
        <SubHeading>8.2 Functional Cookies</SubHeading>
        <p>
          Enable a consistent, personalized experience by remembering your
          preferences.
        </p>
        <SubHeading>8.3 Performance and Analytics Cookies</SubHeading>
        <p>Help us understand how the Services are used and how to improve them.</p>
        <SubHeading>8.4 Marketing Cookies</SubHeading>
        <p>
          Used, where permitted, to measure the effectiveness of advertising and
          personalize communications.
        </p>
        <SubHeading>8.5 Local and Session Storage</SubHeading>
        <p>
          The Platform may use local and session storage to persist interface state,
          cache configuration values, and reduce round-trips to our servers.
        </p>
      </>
    ),
  },
  {
    id: "analytics",
    title: "Analytics",
    body: (
      <p>
        We use analytics providers to understand how the Services are used, prioritize
        features, monitor platform health, and inform our product and business
        decisions. Analytics providers may collect information about your device,
        interactions, and inferred attributes in accordance with their own privacy
        practices and our contractual instructions.
      </p>
    ),
  },
  {
    id: "marketing",
    title: "Marketing Communications",
    body: (
      <p>
        Subject to Applicable Law and your communication preferences, we may send
        promotional messages about our products, events, and offers. You may
        unsubscribe at any time using the mechanism provided in each communication.
        Withdrawing consent for marketing does not affect service-related messages
        necessary to provide the Services.
      </p>
    ),
  },
  {
    id: "third-party",
    title: "Third-Party Services",
    body: (
      <p>
        The Services may integrate with or link to third-party services, plugins, or
        platforms. Those third parties operate independently and are governed by
        their own privacy notices. We are not responsible for their practices, and
        we encourage you to review their policies before providing information.
      </p>
    ),
  },
  {
    id: "sharing",
    title: "Sharing and Disclosure",
    body: (
      <>
        <p>We may share Personal Information in the following circumstances:</p>
        <SubHeading>12.1 Service Providers</SubHeading>
        <p>
          With vendors and contractors that perform services on our behalf,
          including hosting, storage, analytics, communications, payment
          processing, and customer support.
        </p>
        <SubHeading>12.2 Business Transfers</SubHeading>
        <p>
          In connection with a merger, acquisition, financing, reorganization,
          bankruptcy, receivership, sale of assets, or transition of services.
        </p>
        <SubHeading>12.3 Legal and Regulatory Requirements</SubHeading>
        <p>
          Where required to comply with laws, respond to lawful requests, or
          protect rights, safety, and property.
        </p>
        <SubHeading>12.4 With Your Direction or Consent</SubHeading>
        <p>Where you direct us to share or have provided consent to do so.</p>
        <SubHeading>12.5 Fraud Prevention, Security, and Emergencies</SubHeading>
        <p>
          To detect, investigate, prevent, or respond to fraud, security incidents,
          or emergencies.
        </p>
      </>
    ),
  },
  {
    id: "international",
    title: "International Data Transfers",
    body: (
      <p>
        We may transfer, store, and process Personal Information in jurisdictions
        other than the country in which it was collected. Where required by
        Applicable Law, we implement appropriate safeguards for such transfers,
        including standard contractual clauses, adequacy decisions, or equivalent
        mechanisms proportionate to the nature and sensitivity of the data
        processed.
      </p>
    ),
  },
  {
    id: "security",
    title: "Data Security",
    body: (
      <p>
        We implement administrative, technical, and physical safeguards designed to
        protect Personal Information against unauthorized access, alteration,
        disclosure, or destruction. These safeguards include encryption in transit
        and at rest where appropriate, access controls, monitoring and logging,
        secure software development practices, personnel training, and vendor
        oversight. No method of transmission or storage is completely secure, and we
        cannot guarantee absolute security.
      </p>
    ),
  },
  {
    id: "retention",
    title: "Data Retention",
    body: (
      <p>
        We retain Personal Information for as long as necessary to fulfill the
        purposes described in this Policy, including providing the Services,
        maintaining business records, resolving disputes, enforcing agreements, and
        complying with legal, tax, audit, and regulatory obligations. Retention
        periods are determined based on the nature and sensitivity of the
        information, the potential risks associated with its processing, and
        applicable legal requirements.
      </p>
    ),
  },
  {
    id: "user-rights",
    title: "User Rights",
    body: (
      <>
        <p>
          Depending on your jurisdiction and the applicable legal basis for
          processing, you may have certain rights in respect of your Personal
          Information, including:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>The right to access Personal Information we hold about you.</li>
          <li>The right to request correction of inaccurate or incomplete information.</li>
          <li>The right to request deletion, subject to legal exceptions.</li>
          <li>The right to restrict or object to certain processing.</li>
          <li>The right to data portability.</li>
          <li>The right to withdraw consent, where processing is based on consent.</li>
          <li>The right to lodge a complaint with a supervisory authority.</li>
        </ul>
        <p>
          To exercise these rights, contact us using the details in the Contact
          Information section. We may need to verify your identity before
          responding.
        </p>
      </>
    ),
  },
  {
    id: "california",
    title: "California Privacy Rights (CCPA/CPRA)",
    body: (
      <p>
        If you are a California resident, the California Consumer Privacy Act, as
        amended by the California Privacy Rights Act, provides specific rights,
        including the right to know, delete, correct, and opt out of the sale or
        sharing of Personal Information, and the right to limit the use of Sensitive
        Personal Information. We do not sell Personal Information as that term is
        traditionally understood.
      </p>
    ),
  },
  {
    id: "gdpr",
    title: "European Privacy Rights (GDPR)",
    body: (
      <p>
        If you are located in the European Economic Area, the United Kingdom, or
        Switzerland, you have the rights described in the User Rights section above
        under GDPR and equivalent laws. You may also contact your local data
        protection authority. Where applicable, our EU/UK representative can be
        reached via the details in the Contact Information section.
      </p>
    ),
  },
  {
    id: "other-international",
    title: "Other International Privacy Laws",
    body: (
      <p>
        We comply with other applicable privacy laws in jurisdictions where we
        operate, including Canada&rsquo;s PIPEDA, Brazil&rsquo;s LGPD,
        Australia&rsquo;s Privacy Act, and similar frameworks. Where you have rights
        under those laws, we honor them consistent with local requirements.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children's Privacy",
    body: (
      <p>
        The Services are not directed to children under the age of 13 (or the
        equivalent minimum age in the relevant jurisdiction). We do not knowingly
        collect Personal Information from children. If we become aware that a child
        has provided us with Personal Information without appropriate consent, we
        will take steps to delete it.
      </p>
    ),
  },
  {
    id: "ai",
    title: "Artificial Intelligence & Automated Decision Making",
    body: (
      <p>
        We may use machine learning and automated systems to improve the Services,
        detect fraud, personalize experiences, and support operational decisions. We
        do not use solely automated decision-making that produces legal or similarly
        significant effects concerning you without appropriate safeguards, including
        the right to human review where required by Applicable Law.
      </p>
    ),
  },
  {
    id: "ugc",
    title: "User Generated Content",
    body: (
      <p>
        Content you post or make available through public areas of the Services may
        be visible to other users and the general public. You are responsible for
        the content you submit and should exercise caution before including
        Personal Information in publicly accessible areas.
      </p>
    ),
  },
  {
    id: "account-security",
    title: "Account Security Responsibilities",
    body: (
      <>
        <p>You are responsible for:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Maintaining the confidentiality of your account credentials.</li>
          <li>Restricting access to your devices and account.</li>
          <li>Using strong, unique passwords and enabling multi-factor authentication where available.</li>
          <li>Promptly notifying us of any suspected unauthorized access to your Account.</li>
        </ul>
      </>
    ),
  },
  {
    id: "business-transfers",
    title: "Business Transfers",
    body: (
      <p>
        In the event of a merger, acquisition, financing, reorganization,
        bankruptcy, receivership, sale of assets, or transition of services to
        another provider, Personal Information may be transferred as part of the
        transaction. We will notify affected users where required by Applicable Law.
      </p>
    ),
  },
  {
    id: "breach",
    title: "Data Breach Notification",
    body: (
      <p>
        In the event of a Personal Information breach that is likely to result in a
        risk to the rights and freedoms of individuals, we will notify affected
        individuals and regulators as required by Applicable Law, without undue
        delay and within any statutorily required timeframes.
      </p>
    ),
  },
  {
    id: "dnt",
    title: "Do Not Track Signals",
    body: (
      <p>
        Some browsers offer a &ldquo;Do Not Track&rdquo; setting. Because there is
        no industry consensus on how to interpret these signals, our Services do
        not currently respond to them. You may control tracking through the cookie
        and consent controls described in this Policy.
      </p>
    ),
  },
  {
    id: "accessibility",
    title: "Accessibility",
    body: (
      <p>
        We are committed to making this Policy accessible. If you require this
        Policy in an alternative format, please contact us using the details in the
        Contact Information section.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this Privacy Policy",
    body: (
      <p>
        We may update this Policy from time to time to reflect changes to our
        practices, technologies, legal requirements, or business operations. When we
        make material changes, we will provide notice as required by Applicable Law.
        The &ldquo;Last Updated&rdquo; date at the top of this Policy indicates when
        it was most recently revised.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact Information",
    body: (
      <>
        <p>
          If you have questions, concerns, or requests regarding this Policy or our
          privacy practices, please contact us at:
        </p>
        <div className="rounded-2xl border border-border/60 bg-secondary/40 p-6 not-prose">
          <div className="font-serif text-lg font-semibold text-primary">
            The Social Greenhouse
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Privacy Team
            <br />
            privacy@thesocialgreenhouse.com
          </div>
        </div>
      </>
    ),
  },
];

function Definition({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <dt className="font-serif text-base font-semibold text-primary">{term}</dt>
      <dd className="mt-1 text-sm text-muted-foreground">{children}</dd>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 font-serif text-lg font-semibold text-primary">
      {children}
    </h3>
  );
}

function PrivacyPage() {
  return (
    <main className="bg-background">
      {/* HERO */}
      <section className="border-b border-border/60 bg-[hsl(var(--primary)/0.06)]">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <ScrollText className="h-4 w-4" />
            Legal <span className="opacity-40">·</span> Policy
          </div>
          <h1 className="mt-6 font-serif text-5xl font-bold leading-[1.05] tracking-tight text-primary sm:text-6xl lg:text-7xl">
            Privacy Policy
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            This Privacy Policy explains how the Company collects, uses, discloses,
            retains, and safeguards Personal Information across its Platform and
            Services. It is designed to comply with applicable global privacy laws
            and to reflect widely accepted principles of fair information practices.
          </p>

          <div className="mt-10 grid gap-6 rounded-2xl border border-border/60 bg-card p-6 sm:grid-cols-3">
            <MetaCell label="Effective Date" value="January 1, 2026" />
            <MetaCell label="Last Updated" value="January 1, 2026" />
            <MetaCell label="Version" value="1.0" />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => typeof window !== "undefined" && window.print()}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              <Printer className="h-4 w-4" />
              Print / Save as PDF
            </button>
            <a
              href="#toc"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <ListOrdered className="h-4 w-4" />
              Jump to Table of Contents
            </a>
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[260px_1fr]">
          {/* TOC */}
          <aside id="toc" className="lg:sticky lg:top-24 lg:self-start">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Table of Contents
            </div>
            <nav className="mt-4 flex flex-col">
              {sections.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="group flex items-baseline gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-primary"
                >
                  <span className="w-6 shrink-0 text-xs font-semibold tabular-nums text-primary/60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-snug">{s.title}</span>
                </a>
              ))}
            </nav>
          </aside>

          {/* Sections */}
          <div className="min-w-0 space-y-20">
            {sections.map((s, i) => (
              <article key={s.id} id={s.id} className="scroll-mt-24">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Section {String(i + 1).padStart(2, "0")}
                </div>
                <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                  {s.title}
                </h2>
                <div className="prose prose-neutral mt-6 max-w-none text-foreground/85 [&_p]:leading-relaxed [&_p]:my-4 [&>*:first-child]:mt-0">
                  {s.body}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        {label}
      </div>
      <div className="mt-2 font-serif text-2xl font-semibold text-primary">
        {value}
      </div>
    </div>
  );
}
