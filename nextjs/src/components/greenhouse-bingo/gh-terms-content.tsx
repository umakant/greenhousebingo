"use client";

import { Scale, Printer, ListOrdered } from "lucide-react";

type Section = { id: string; title: string; body: React.ReactNode };

const sections: Section[] = [
  {
    id: "introduction",
    title: "Introduction",
    body: (
      <>
        <p>
          These Terms of Service (the &ldquo;Terms,&rdquo; &ldquo;Agreement,&rdquo;
          or &ldquo;Terms of Service&rdquo;) constitute a legally binding agreement
          between The Social Greenhouse (the &ldquo;Company,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us,&rdquo; or &ldquo;our&rdquo;) and you, whether acting on your
          own behalf as an individual or on behalf of a legal entity (the
          &ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;), and govern
          your access to and use of the Company&rsquo;s websites, web applications,
          mobile applications, hosted software, application programming interfaces,
          administrative dashboards, developer tools, documentation, communications,
          and any other products or services made available by the Company
          (collectively, the &ldquo;Services&rdquo;).
        </p>
        <p>
          By accessing, browsing, downloading, installing, registering for, or
          otherwise using any portion of the Services, you acknowledge that you have
          read this Agreement, that you understand its terms, and that you agree to
          be bound by all of its provisions.
        </p>
        <p>
          If you are entering into this Agreement on behalf of an organization, you
          represent and warrant that you have the legal authority to bind such
          entity. If you do not have such authority, or if you do not agree with any
          part of this Agreement, you must not access or use the Services.
        </p>
        <div className="rounded-2xl border border-border/60 bg-secondary/40 p-6 not-prose">
          <div className="font-serif text-base font-semibold text-primary">
            Binding Legal Agreement
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Please read this Agreement carefully. It contains important provisions
            concerning your legal rights, including disclaimers of warranties,
            limitations of liability, and, where permitted by law, mandatory
            arbitration and class action waivers.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "definitions",
    title: "Definitions",
    body: (
      <>
        <p>
          For the purposes of this Agreement, the following capitalized terms have
          the meanings set forth below.
        </p>
        <dl className="space-y-4">
          <Definition term="Company">
            The Social Greenhouse, together with its parents, subsidiaries,
            successors, and assigns.
          </Definition>
          <Definition term="Services">
            All products, features, subscriptions, functionality, tools,
            integrations, APIs, dashboards, communications, and professional
            services made available by the Company.
          </Definition>
          <Definition term="Platform">
            The technical infrastructure, hosted environments, software, and
            interfaces through which the Services are delivered.
          </Definition>
          <Definition term="Website">
            Any website operated by the Company, including subdomains, mobile web
            versions, and related digital properties.
          </Definition>
          <Definition term="Software">
            Any downloadable, embeddable, or hosted software components, libraries,
            SDKs, mobile applications, or client applications made available by the
            Company.
          </Definition>
          <Definition term="User">
            Any natural person or legal entity that accesses or uses the Services.
          </Definition>
          <Definition term="Customer">
            An organization or individual that has entered into a subscription or
            other paid arrangement with the Company.
          </Definition>
          <Definition term="Account">
            The record established when a User registers to access the Services,
            together with all associated credentials, settings, workspaces, and
            Content.
          </Definition>
          <Definition term="Subscription">
            A time-limited or renewing right to access designated Services in
            exchange for applicable Fees.
          </Definition>
          <Definition term="Content">
            All information, materials, data, text, images, video, audio, software,
            files, and other content made available through the Services.
          </Definition>
          <Definition term="User Content">
            All Content that is uploaded, transmitted, submitted, generated, or
            otherwise made available by or on behalf of a User.
          </Definition>
          <Definition term="Applicable Law">
            All statutes, regulations, rules, orders, decisions, and decrees of any
            governmental authority applicable to the parties.
          </Definition>
        </dl>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility",
    body: (
      <>
        <SubHeading>3.1 Minimum Age and Legal Capacity</SubHeading>
        <p>
          You must be at least the age of majority in your jurisdiction and have the
          legal capacity to enter into a binding contract in order to use the
          Services.
        </p>
        <SubHeading>3.2 Organizational Authority</SubHeading>
        <p>
          If you use the Services on behalf of an entity, you represent that you are
          authorized to bind that entity and to accept these Terms on its behalf.
        </p>
        <SubHeading>3.3 Prohibited Jurisdictions and Compliance</SubHeading>
        <p>
          You may not use the Services if you are located in, or a resident of, any
          jurisdiction where such use would be prohibited by Applicable Law, or if
          you are on any restricted or denied party list maintained by a competent
          governmental authority.
        </p>
      </>
    ),
  },
  {
    id: "account-registration",
    title: "Account Registration",
    body: (
      <>
        <SubHeading>4.1 Creating an Account</SubHeading>
        <p>
          To access certain features of the Services you may be required to register
          for an Account and provide accurate, current, and complete information.
        </p>
        <SubHeading>4.2 Accuracy of Information</SubHeading>
        <p>
          You agree to promptly update your Account information as necessary. Failure
          to maintain accurate information may result in suspension or termination
          of your Account.
        </p>
        <SubHeading>4.3 Account Security and Multi-Factor Authentication</SubHeading>
        <p>
          You are responsible for maintaining the confidentiality of your
          credentials and for all activity that occurs under your Account. We
          recommend enabling multi-factor authentication where offered.
        </p>
        <SubHeading>4.4 Notification of Unauthorized Use</SubHeading>
        <p>
          You must notify the Company immediately of any unauthorized access to or
          use of your Account.
        </p>
        <SubHeading>4.5 Account Ownership and Transfer Restrictions</SubHeading>
        <p>
          Accounts may not be transferred, sold, or assigned to any third party
          without the Company&rsquo;s prior written consent.
        </p>
      </>
    ),
  },
  {
    id: "user-responsibilities",
    title: "User Responsibilities",
    body: (
      <>
        <p>Your responsibilities include, without limitation, the following:</p>
        <SubHeading>5.1 Lawful Use</SubHeading>
        <p>Using the Services only in compliance with Applicable Law and these Terms.</p>
        <SubHeading>5.2 Accurate Information</SubHeading>
        <p>Providing accurate information and updating it as necessary.</p>
        <SubHeading>5.3 Security of Credentials and Reporting Obligations</SubHeading>
        <p>
          Maintaining the confidentiality of your credentials and promptly reporting
          any suspected security incident.
        </p>
        <SubHeading>5.4 Respect for Other Users</SubHeading>
        <p>Interacting with other Users and the public in a respectful, lawful manner.</p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use Policy",
    body: (
      <>
        <p>You agree not to engage in any prohibited activity, including:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Using the Services for any unlawful, harmful, fraudulent, or deceptive purpose.</li>
          <li>Reverse engineering, decompiling, or disassembling any portion of the Services.</li>
          <li>Interfering with, disrupting, or overloading the Services or associated infrastructure.</li>
          <li>Attempting to gain unauthorized access to any Accounts, systems, or data.</li>
          <li>Uploading viruses, malware, or other malicious code.</li>
          <li>Sharing Accounts with unauthorized individuals or circumventing user-based limitations.</li>
          <li>Scraping, harvesting, or collecting information about other Users without authorization.</li>
          <li>Using the Services to send unsolicited or unauthorized communications.</li>
        </ul>
        <p>
          The Company reserves the right to investigate suspected violations,
          suspend or terminate offending Accounts, cooperate with law enforcement,
          and pursue any available civil or criminal remedies.
        </p>
      </>
    ),
  },
  {
    id: "subscriptions",
    title: "Subscriptions",
    body: (
      <>
        <p>
          Certain Services are made available on a subscription basis. The scope,
          duration, features, and pricing of each Subscription are described at the
          time of purchase.
        </p>
        <SubHeading>7.1 Upgrades and Downgrades</SubHeading>
        <p>
          Upgrades take effect immediately (subject to prorated Fees), and downgrades
          take effect at the start of the next Billing Cycle.
        </p>
        <SubHeading>7.2 Cancellations</SubHeading>
        <p>
          Cancellations take effect at the end of the current Billing Cycle, and,
          except where required by Applicable Law, do not entitle you to a refund of
          Fees already paid.
        </p>
      </>
    ),
  },
  {
    id: "billing",
    title: "Billing & Payments",
    body: (
      <>
        <p>
          You agree to pay all Fees in the currency and by the payment methods
          accepted by the Company. By providing a payment method, you authorize us
          to charge that payment method for all applicable Fees, taxes, and
          renewals.
        </p>
        <SubHeading>8.1 Automatic Renewals</SubHeading>
        <p>
          Subscriptions automatically renew for successive Billing Cycles unless
          cancelled in accordance with these Terms.
        </p>
        <SubHeading>8.2 Failed Payments and Collections</SubHeading>
        <p>
          If a payment is declined or overdue, the Company may suspend or terminate
          your access to the Services and pursue collection of amounts owed.
        </p>
      </>
    ),
  },
  {
    id: "refund-policy",
    title: "Refund Policy",
    body: (
      <p>
        Except where required by Applicable Law or expressly stated in an applicable
        order form, all Fees are non-refundable. Refunds, where offered, are at the
        Company&rsquo;s sole discretion and do not entitle you to any future refund
        or credit.
      </p>
    ),
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    body: (
      <p>
        The Services, including all Software, Content, trademarks, logos, and
        related Intellectual Property, are owned by the Company or its licensors.
        All rights not expressly granted are reserved. You may not copy, modify,
        distribute, publicly display, or create derivative works of the Services
        except as expressly permitted.
      </p>
    ),
  },
  {
    id: "user-content",
    title: "User Content",
    body: (
      <>
        <p>
          You retain ownership of your User Content. By making User Content
          available through the Services, you grant the Company a worldwide,
          non-exclusive, royalty-free license to host, store, reproduce, modify (to
          the extent necessary to provide the Services), display, and transmit such
          User Content solely as needed to operate and improve the Services.
        </p>
        <p>
          The Company has the right, but not the obligation, to monitor, review, and
          remove User Content that it reasonably believes violates this Agreement,
          Applicable Law, or the rights of others.
        </p>
      </>
    ),
  },
  {
    id: "third-party-services",
    title: "Third-Party Services",
    body: (
      <p>
        The Services may integrate with or rely on third-party providers, including
        infrastructure providers, email and SMS providers, mapping providers,
        identity and authentication providers, analytics providers, and advertising
        platforms. Such Third Parties operate independently and are governed by
        their own terms and policies.
      </p>
    ),
  },
  {
    id: "service-availability",
    title: "Service Availability",
    body: (
      <p>
        The Company will use commercially reasonable efforts to make the Services
        available in accordance with the applicable Subscription. However, the
        Services may be unavailable from time to time due to scheduled maintenance,
        upgrades, or events beyond our reasonable control, and we do not guarantee
        uninterrupted availability.
      </p>
    ),
  },
  {
    id: "software-updates",
    title: "Software Updates",
    body: (
      <p>
        The Company may release updates, patches, or new versions of the Software
        from time to time. You agree that such updates may be installed
        automatically and that continued use of the Services may require the most
        recent version.
      </p>
    ),
  },
  {
    id: "data-security",
    title: "Data Security",
    body: (
      <p>
        The Company maintains a comprehensive information security program designed
        to protect the confidentiality, integrity, and availability of the
        Services. You are responsible for configuring your Account in a secure
        manner and for the security of any systems used to access the Services.
      </p>
    ),
  },
  {
    id: "privacy",
    title: "Privacy",
    body: (
      <p>
        Our collection and use of Personal Information in connection with the
        Services is described in our Privacy Policy, which is incorporated into
        these Terms by reference. In the event of a conflict between these Terms
        and the Privacy Policy with respect to Personal Information, the Privacy
        Policy shall control.
      </p>
    ),
  },
  {
    id: "confidentiality",
    title: "Confidentiality",
    body: (
      <p>
        Each party (the &ldquo;Receiving Party&rdquo;) may have access to
        Confidential Information of the other party. The Receiving Party shall
        maintain the confidentiality of such information using at least the same
        degree of care it uses to protect its own confidential information, and
        shall not disclose or use it except as necessary to exercise its rights or
        perform its obligations under this Agreement.
      </p>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <p className="uppercase">
        The Services, the Software, the Website, and any related Content are
        provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; with all
        faults and without warranty of any kind, whether express, implied, or
        statutory. The Company disclaims all warranties, including merchantability,
        fitness for a particular purpose, and non-infringement. The Company does
        not warrant that the Services will be uninterrupted or error-free, that
        defects will be corrected, or that the Services or the servers that make
        them available are free of viruses or other harmful components.
      </p>
    ),
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    body: (
      <p className="uppercase">
        To the maximum extent permitted by Applicable Law, in no event shall the
        Company be liable for any indirect, incidental, special, consequential, or
        punitive damages, or for any loss of profits, revenue, business, goodwill,
        use, data, or other intangible losses, arising out of or in connection
        with this Agreement or the Services. The Company&rsquo;s aggregate
        liability shall not exceed the greater of (a) the amounts paid by you to
        the Company in the twelve months preceding the event giving rise to the
        claim, or (b) one hundred U.S. dollars (US$100.00).
      </p>
    ),
  },
  {
    id: "indemnification",
    title: "Indemnification",
    body: (
      <p>
        You agree to defend, indemnify, and hold harmless the Company and its
        officers, directors, employees, and agents from and against any claims,
        damages, liabilities, and expenses (including reasonable attorneys&rsquo;
        fees) arising out of or related to (a) your access to or use of the
        Services; (b) your User Content; (c) your violation of these Terms; or
        (d) your violation of any Applicable Law or third-party right.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Termination",
    body: (
      <>
        <SubHeading>21.1 Termination by You</SubHeading>
        <p>
          You may terminate this Agreement at any time by cancelling your
          Subscription and discontinuing all use of the Services.
        </p>
        <SubHeading>21.2 Termination by the Company</SubHeading>
        <p>
          The Company may suspend or terminate your access to the Services at any
          time for violation of these Terms or as otherwise permitted by Applicable
          Law.
        </p>
        <SubHeading>21.3 Effect of Termination</SubHeading>
        <p>
          Upon termination, all rights and licenses granted to you under this
          Agreement shall immediately cease, and you must discontinue use of the
          Services.
        </p>
      </>
    ),
  },
  {
    id: "force-majeure",
    title: "Force Majeure",
    body: (
      <p>
        Neither party shall be liable for any failure or delay in performance
        caused by events beyond its reasonable control, including acts of God,
        natural disasters, fires, floods, epidemics, war, terrorism, labor
        disputes, or governmental actions. The affected party shall resume
        performance once the Force Majeure Event has ceased.
      </p>
    ),
  },
  {
    id: "export-compliance",
    title: "Export Compliance",
    body: (
      <p>
        You agree to comply with all applicable export control and sanctions laws.
        You represent that you are not located in, or a national of, any country
        subject to comprehensive sanctions, and that you are not on any restricted
        or denied party list maintained by a competent governmental authority.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing Law",
    body: (
      <p>
        This Agreement shall be governed by and construed in accordance with the
        laws of the jurisdiction in which the Company is established, without
        regard to its conflict-of-laws principles.
      </p>
    ),
  },
  {
    id: "dispute-resolution",
    title: "Dispute Resolution",
    body: (
      <>
        <SubHeading>25.1 Informal Resolution</SubHeading>
        <p>
          The parties agree to first attempt to resolve any dispute informally by
          contacting the other party in writing.
        </p>
        <SubHeading>25.2 Binding Arbitration</SubHeading>
        <p>
          Where permitted by Applicable Law, any unresolved dispute shall be
          finally resolved by binding arbitration administered by a recognized
          arbitration body at the seat of arbitration designated by the Company.
        </p>
        <SubHeading>25.3 Class Action Waiver</SubHeading>
        <p>
          To the maximum extent permitted by Applicable Law, disputes must be
          brought in an individual capacity and not as part of a class or
          representative action.
        </p>
      </>
    ),
  },
  {
    id: "electronic-communications",
    title: "Electronic Communications",
    body: (
      <p>
        You consent to receive communications from the Company in electronic form,
        including via email or through the Services, and you agree that such
        electronic communications satisfy any legal requirement that such
        communications be in writing.
      </p>
    ),
  },
  {
    id: "changes-services",
    title: "Changes to Services",
    body: (
      <p>
        The Company may modify, suspend, or discontinue any part of the Services at
        any time. Where a change materially reduces the functionality of a paid
        Service during an active Subscription term, we will provide reasonable
        notice.
      </p>
    ),
  },
  {
    id: "changes-terms",
    title: "Changes to Terms",
    body: (
      <p>
        We may update these Terms from time to time. When we make material changes,
        we will provide notice as required by Applicable Law. Your continued use of
        the Services after the effective date of the revised Terms constitutes your
        acceptance of the changes.
      </p>
    ),
  },
  {
    id: "severability",
    title: "Severability",
    body: (
      <p>
        If any provision of this Agreement is held to be invalid or unenforceable,
        the remaining provisions shall remain in full force and effect, and the
        invalid provision shall be modified to the minimum extent necessary to make
        it valid and enforceable.
      </p>
    ),
  },
  {
    id: "waiver",
    title: "Waiver",
    body: (
      <p>
        No failure or delay by the Company in exercising any right or remedy shall
        operate as a waiver, nor shall any single or partial exercise preclude any
        other or further exercise of that right or remedy.
      </p>
    ),
  },
  {
    id: "assignment",
    title: "Assignment",
    body: (
      <p>
        You may not assign or transfer this Agreement, in whole or in part, without
        the Company&rsquo;s prior written consent. The Company may assign this
        Agreement freely, including in connection with a merger, acquisition, or
        sale of assets.
      </p>
    ),
  },
  {
    id: "no-agency",
    title: "No Agency",
    body: (
      <p>
        Nothing in this Agreement shall be construed as creating a partnership,
        joint venture, agency, employment, or fiduciary relationship between you
        and the Company.
      </p>
    ),
  },
  {
    id: "survival",
    title: "Survival",
    body: (
      <p>
        All provisions of this Agreement which by their nature should survive
        termination shall survive, including ownership provisions, warranty
        disclaimers, indemnity, and limitations of liability.
      </p>
    ),
  },
  {
    id: "entire-agreement",
    title: "Entire Agreement",
    body: (
      <p>
        This Agreement, together with the Privacy Policy and any applicable order
        form or referenced policy, constitutes the entire agreement between you and
        the Company with respect to the subject matter hereof and supersedes all
        prior or contemporaneous understandings.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact Information",
    body: (
      <>
        <p>
          If you have questions or concerns regarding these Terms, please contact
          us at:
        </p>
        <div className="rounded-2xl border border-border/60 bg-secondary/40 p-6 not-prose">
          <div className="font-serif text-lg font-semibold text-primary">
            The Social Greenhouse
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Legal Team
            <br />
            legal@thesocialgreenhouse.com
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

export function GhTermsContent() {
  return (
    <main className="bg-background">
      {/* HERO */}
      <section className="border-b border-border/60 bg-[hsl(var(--primary)/0.06)]">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Scale className="h-4 w-4" />
            Legal <span className="opacity-40">·</span> Agreement
          </div>
          <h1 className="mt-6 font-serif text-5xl font-bold leading-[1.05] tracking-tight text-primary sm:text-6xl lg:text-7xl">
            Terms of Service
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            This Terms of Service agreement governs your access to and use of the
            Company&rsquo;s Platform, Software, Website, and Services. It defines
            the rights and obligations of both the Company and each User and is a
            legally binding contract.
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
