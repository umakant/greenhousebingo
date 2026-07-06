import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AlertTriangle, Info, Shield, Scale, Printer, Gavel } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Company" },
      {
        name: "description",
        content:
          "Enterprise-grade Terms of Service governing use of the Company's Platform, Software, Website, and Services.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: TermsPage,
});

type Section = { id: string; number: number; title: string; body: React.ReactNode };

function Callout({
  variant = "info",
  title,
  children,
}: {
  variant?: "info" | "warning" | "legal";
  title: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: {
      wrap: "border-sky-blue/40 bg-sky-blue/10",
      icon: <Info className="h-5 w-5 text-sky-blue" />,
    },
    warning: {
      wrap: "border-tomato/40 bg-tomato/10",
      icon: <AlertTriangle className="h-5 w-5 text-tomato" />,
    },
    legal: {
      wrap: "border-forest/30 bg-secondary/60",
      icon: <Shield className="h-5 w-5 text-forest" />,
    },
  }[variant];

  return (
    <aside
      className={`my-8 rounded-2xl border-l-4 ${styles.wrap} p-5 sm:p-6 print:my-4 print:border print:bg-transparent`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{styles.icon}</div>
        <div className="min-w-0">
          <p className="font-display text-base font-bold text-forest-deep">{title}</p>
          <div className="mt-2 text-sm leading-relaxed text-foreground/85">{children}</div>
        </div>
      </div>
    </aside>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 leading-[1.85] text-foreground/85">{children}</p>;
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-10 font-display text-xl font-bold text-forest-deep sm:text-2xl">
      {children}
    </h3>
  );
}

function DefTerm({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <dt className="font-display text-base font-bold text-forest-deep">{term}</dt>
      <dd className="mt-1 leading-[1.8] text-foreground/85">{children}</dd>
    </div>
  );
}

function LegalCaps({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-xl border border-border bg-secondary/40 p-5 text-sm font-semibold uppercase leading-[1.75] tracking-wide text-forest-deep">
      {children}
    </p>
  );
}

const SECTIONS: Section[] = [
  {
    id: "introduction",
    number: 1,
    title: "Introduction",
    body: (
      <>
        <P>
          These Terms of Service (the &ldquo;Terms,&rdquo; &ldquo;Agreement,&rdquo; or &ldquo;Terms
          of Service&rdquo;) constitute a legally binding agreement between [Company Name] (the
          &ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) and you,
          whether acting on your own behalf as an individual or on behalf of a legal entity (the
          &ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;), and govern your access to
          and use of the Company&rsquo;s websites, web applications, mobile applications, hosted
          software, application programming interfaces, administrative dashboards, developer
          tools, documentation, communications, and any other products or services made available
          by the Company (collectively, the &ldquo;Services&rdquo;).
        </P>
        <P>
          The purpose of this Agreement is to define the rights, responsibilities, obligations,
          restrictions, warranties, disclaimers, and limitations that govern the relationship
          between the Company and each User. By accessing, browsing, downloading, installing,
          registering for, or otherwise using any portion of the Services, you acknowledge that
          you have read this Agreement, that you understand its terms, and that you agree to be
          bound by all of its provisions.
        </P>
        <P>
          If you are entering into this Agreement on behalf of an organization, company,
          partnership, governmental body, or other legal entity, you represent and warrant that
          you have the legal authority to bind such entity to this Agreement, and in such case,
          the terms &ldquo;User,&rdquo; &ldquo;you,&rdquo; and &ldquo;your&rdquo; refer to that
          entity and to any Authorized Users acting on its behalf. If you do not have such
          authority, or if you do not agree with any part of this Agreement, you must not access
          or use the Services.
        </P>
        <P>
          This Agreement, together with the Company&rsquo;s Privacy Policy, any applicable order
          form, statement of work, data processing addendum, product-specific terms, and any
          other referenced policies, constitutes the entire agreement between you and the Company
          with respect to the subject matter hereof, and supersedes all prior or contemporaneous
          understandings, communications, proposals, or representations, whether oral or written.
        </P>
        <Callout variant="legal" title="Binding Legal Agreement">
          Please read this Agreement carefully. It contains important provisions concerning your
          legal rights, including disclaimers of warranties, limitations of liability, and, where
          permitted by law, mandatory arbitration and class action waivers.
        </Callout>
      </>
    ),
  },
  {
    id: "definitions",
    number: 2,
    title: "Definitions",
    body: (
      <>
        <P>
          For the purposes of this Agreement, the following capitalized terms have the meanings
          set forth below. Words denoting the singular include the plural and vice versa; words
          denoting any gender include all genders; and headings are for convenience only and shall
          not affect the interpretation of this Agreement.
        </P>
        <dl>
          <DefTerm term="2.1 Company">
            [Company Name], together with its parents, subsidiaries, successors, and assigns.
          </DefTerm>
          <DefTerm term="2.2 Services">
            All products, features, subscriptions, functionality, tools, integrations,
            application programming interfaces, dashboards, communications, and professional
            services made available by the Company from time to time.
          </DefTerm>
          <DefTerm term="2.3 Platform">
            The technical infrastructure, hosted environments, software, and interfaces through
            which the Services are delivered.
          </DefTerm>
          <DefTerm term="2.4 Website">
            Any website operated by the Company, including any subdomains, mobile web versions,
            and related digital properties.
          </DefTerm>
          <DefTerm term="2.5 Software">
            Any downloadable, embeddable, or hosted software components, libraries, software
            development kits, mobile applications, or client applications made available by the
            Company as part of the Services.
          </DefTerm>
          <DefTerm term="2.6 Application">
            Any mobile, desktop, or web application published or provided by the Company through
            which Users access all or part of the Services.
          </DefTerm>
          <DefTerm term="2.7 User">
            Any natural person or legal entity that accesses or uses the Services, whether as a
            visitor, registered account holder, Authorized User, or otherwise.
          </DefTerm>
          <DefTerm term="2.8 Customer">
            An organization or individual that has entered into a subscription or other paid
            arrangement with the Company for access to the Services.
          </DefTerm>
          <DefTerm term="2.9 Account">
            The record established when a User registers to access the Services, together with all
            associated credentials, settings, workspaces, environments, and Content.
          </DefTerm>
          <DefTerm term="2.10 Subscription">
            A time-limited or renewing right to access designated Services in exchange for
            applicable Fees, as further described in an order form, price page, or in-product
            purchase flow.
          </DefTerm>
          <DefTerm term="2.11 Content">
            All information, materials, data, text, images, video, audio, software, files, and
            other content made available through the Services, whether by the Company, its
            licensors, or Users.
          </DefTerm>
          <DefTerm term="2.12 User Content">
            All Content that is uploaded, transmitted, submitted, generated, or otherwise made
            available by or on behalf of a User through the Services.
          </DefTerm>
          <DefTerm term="2.13 Intellectual Property">
            All patents, copyrights, trademarks, service marks, trade names, trade dress, trade
            secrets, moral rights, know-how, database rights, and all other proprietary rights
            recognized under any Applicable Law.
          </DefTerm>
          <DefTerm term="2.14 Confidential Information">
            Any non-public information disclosed by one party to the other that is designated as
            confidential or that a reasonable person would understand to be confidential given
            its nature and the circumstances of disclosure.
          </DefTerm>
          <DefTerm term="2.15 Third Party">
            Any person or entity other than you, the Company, or the Company&rsquo;s directly
            authorized personnel.
          </DefTerm>
          <DefTerm term="2.16 Affiliate">
            Any entity that directly or indirectly controls, is controlled by, or is under common
            control with a party.
          </DefTerm>
          <DefTerm term="2.17 Fees">
            All amounts payable to the Company for the Services, including subscription fees,
            usage-based charges, professional services fees, applicable taxes, and any other
            amounts specified in an order form or invoice.
          </DefTerm>
          <DefTerm term="2.18 Billing Cycle">
            The recurring period for which Fees are assessed, as described at the time of
            purchase.
          </DefTerm>
          <DefTerm term="2.19 Force Majeure">
            Any event or circumstance beyond the reasonable control of the affected party, as
            further described in Section 22.
          </DefTerm>
          <DefTerm term="2.20 Applicable Law">
            All statutes, regulations, rules, orders, decisions, decrees, and binding guidance
            issued by any competent governmental or regulatory authority applicable to a party or
            to the subject matter of this Agreement.
          </DefTerm>
          <DefTerm term="2.21 Authorized User">
            An individual (such as an employee, contractor, or agent of a Customer) who has been
            granted permission by the Customer to access and use the Services under the
            Customer&rsquo;s Account.
          </DefTerm>
        </dl>
      </>
    ),
  },
  {
    id: "eligibility",
    number: 3,
    title: "Eligibility",
    body: (
      <>
        <P>
          Access to and use of the Services is limited to persons and entities that satisfy the
          eligibility requirements set forth in this Section and any additional eligibility
          criteria that may be specified in connection with a particular feature, promotion, or
          offering.
        </P>
        <H3>3.1 Minimum Age and Legal Capacity</H3>
        <P>
          You must be at least eighteen (18) years of age, or the age of majority in your
          jurisdiction if greater, and possess the legal capacity to enter into a binding
          contract, in order to register for an Account and use the Services. The Services are
          intended for a business audience and are not directed to children.
        </P>
        <H3>3.2 Authority to Bind an Organization</H3>
        <P>
          If you access the Services on behalf of an organization, you represent and warrant that
          you are duly authorized to accept this Agreement on behalf of that organization and to
          bind that organization to the terms hereof.
        </P>
        <H3>3.3 Compliance and Prohibited Jurisdictions</H3>
        <P>
          You are responsible for ensuring that your access to and use of the Services complies
          with all Applicable Laws in your jurisdiction. The Services may not be available, or
          may be restricted, in certain jurisdictions, including those subject to comprehensive
          trade sanctions or embargoes. By using the Services, you represent that you are not
          located in, under the control of, or a national or resident of any such prohibited
          jurisdiction.
        </P>
      </>
    ),
  },
  {
    id: "registration",
    number: 4,
    title: "Account Registration",
    body: (
      <>
        <H3>4.1 Creating an Account</H3>
        <P>
          In order to access certain features of the Services, you may be required to register
          for an Account and provide certain information about yourself or your organization. You
          agree to provide accurate, current, and complete information during the registration
          process and to promptly update such information to keep it accurate and complete.
        </P>
        <H3>4.2 Identity Verification</H3>
        <P>
          The Company may, at its discretion or as required by Applicable Law, request additional
          information or documentation to verify your identity, your authority to represent an
          organization, or your eligibility to use particular features of the Services. Failure
          to provide such information may result in the suspension or termination of your Account.
        </P>
        <H3>4.3 Account Security, Passwords, and Multi-Factor Authentication</H3>
        <P>
          You are solely responsible for maintaining the confidentiality of the credentials
          associated with your Account, including passwords, tokens, recovery codes, and
          multi-factor authentication devices. You agree to use strong, unique passwords and to
          enable multi-factor authentication where offered.
        </P>
        <H3>4.4 Unauthorized Access, Suspension, and Termination</H3>
        <P>
          You must promptly notify the Company of any actual or suspected unauthorized access to
          or use of your Account. The Company may suspend, restrict, or terminate access to any
          Account that it reasonably believes has been compromised, is being used in violation of
          this Agreement, or presents a risk to the Company, other Users, or the Platform.
        </P>
        <H3>4.5 Account Ownership, Recovery, and Transfer Restrictions</H3>
        <P>
          Accounts registered under the name of an organization are owned by that organization,
          and Authorized Users acting on its behalf do not have personal rights to such Accounts.
          You may not sell, transfer, assign, sublicense, or otherwise convey your Account or any
          rights therein to any Third Party without the Company&rsquo;s prior written consent.
        </P>
      </>
    ),
  },
  {
    id: "user-responsibilities",
    number: 5,
    title: "User Responsibilities",
    body: (
      <>
        <P>
          You are responsible for your use of the Services and for the acts and omissions of any
          Authorized Users acting on your behalf. Your responsibilities include, without
          limitation, the following.
        </P>
        <H3>5.1 Compliance with Laws</H3>
        <P>
          You shall comply with all Applicable Laws in connection with your use of the Services,
          including laws relating to data protection, intellectual property, export control,
          consumer protection, anti-corruption, and electronic communications.
        </P>
        <H3>5.2 Accuracy of Information</H3>
        <P>
          You shall provide accurate, current, and complete information in connection with your
          Account, transactions, and interactions with the Company, and shall promptly update
          such information as necessary.
        </P>
        <H3>5.3 Security of Credentials and Reporting Obligations</H3>
        <P>
          You shall maintain the confidentiality and security of your credentials, shall not
          share your credentials with any Third Party, and shall promptly notify the Company of
          any actual or suspected security incident involving your Account.
        </P>
        <H3>5.4 Community Standards and Respect for Rights</H3>
        <P>
          You shall use the Services in a manner consistent with the Company&rsquo;s community
          standards, shall respect the intellectual property rights of the Company and Third
          Parties, and shall not engage in any conduct that would violate the rights of other
          Users or the public.
        </P>
      </>
    ),
  },
  {
    id: "aup",
    number: 6,
    title: "Acceptable Use Policy",
    body: (
      <>
        <P>
          You agree that you will not, and will not permit any Authorized User or Third Party to,
          engage in any of the following prohibited activities in connection with the Services.
          This list is illustrative and not exhaustive; the Company reserves the right to
          determine, in its sole discretion, whether any conduct violates this Acceptable Use
          Policy.
        </P>
        <H3>6.1 Prohibited Conduct</H3>
        <P>
          Prohibited activities include, without limitation: (a) engaging in any illegal,
          fraudulent, or deceptive activity; (b) transmitting unsolicited commercial
          communications, spam, or bulk communications in violation of Applicable Law; (c)
          uploading, transmitting, or distributing malware, viruses, worms, Trojan horses, or
          other malicious code; (d) reverse engineering, decompiling, or disassembling any
          portion of the Software, except to the limited extent expressly permitted by Applicable
          Law; (e) attempting to gain unauthorized access to any portion of the Services, other
          Accounts, or the Company&rsquo;s systems; (f) interfering with or disrupting the
          integrity or performance of the Services or the data contained therein; (g) harassing,
          threatening, defaming, or otherwise infringing the rights of any person; (h) infringing
          any copyright, trademark, patent, trade secret, or other proprietary right; (i)
          submitting false, misleading, or fraudulent information; (j) engaging in automated
          scraping, crawling, or data mining except through published interfaces and in
          accordance with applicable documentation; (k) sharing Accounts with unauthorized
          individuals or otherwise circumventing user-based limitations; (l) circumventing or
          attempting to circumvent any security, authentication, or rate-limiting measure; (m)
          abusing the Company&rsquo;s APIs or exceeding published usage limits; (n) generating
          excessive load or otherwise consuming disproportionate resources; or (o) attempting to
          discover, exploit, or disclose any vulnerability without following the Company&rsquo;s
          responsible disclosure procedures.
        </P>
        <H3>6.2 Enforcement</H3>
        <P>
          The Company reserves the right to investigate suspected violations of this Acceptable
          Use Policy and to take any action it deems appropriate, including issuing warnings,
          removing offending Content, suspending or terminating Accounts, cooperating with law
          enforcement, and pursuing civil or criminal remedies. The Company&rsquo;s failure to
          enforce any provision of this Policy in a particular instance shall not constitute a
          waiver of its right to enforce the provision on any other occasion.
        </P>
      </>
    ),
  },
  {
    id: "subscriptions",
    number: 7,
    title: "Subscriptions",
    body: (
      <>
        <H3>7.1 Plans, Renewals, and Modifications</H3>
        <P>
          Subscriptions to the Services may be offered on a monthly, annual, or other periodic
          basis, and are subject to the pricing, features, and limits described at the time of
          purchase. Unless otherwise specified, Subscriptions automatically renew for successive
          Billing Cycles of the same duration until cancelled in accordance with this Agreement.
          Upgrades take effect immediately (subject to prorated Fees), and downgrades take effect
          at the start of the next Billing Cycle unless otherwise stated.
        </P>
        <H3>7.2 Free Trials and Promotional Pricing</H3>
        <P>
          The Company may from time to time offer free trials or promotional pricing for certain
          Subscriptions. Such offers are subject to any additional terms disclosed at the time of
          the offer and may be modified, restricted, or discontinued at any time. Unless
          otherwise indicated, at the end of a free trial the Subscription will convert to a paid
          Subscription at the then-current standard rate.
        </P>
        <H3>7.3 Plan Limitations and Cancellation Timing</H3>
        <P>
          Each Subscription is subject to the usage limits, seat counts, and feature scope
          described at the time of purchase. Cancellations take effect at the end of the current
          Billing Cycle, and, except as expressly stated in Section 9, no refunds are issued for
          the unused portion of a Billing Cycle.
        </P>
      </>
    ),
  },
  {
    id: "billing",
    number: 8,
    title: "Billing & Payments",
    body: (
      <>
        <P>
          By purchasing a Subscription or otherwise incurring Fees, you agree to pay all
          applicable Fees in accordance with this Agreement, the relevant order form, and any
          invoices issued by the Company.
        </P>
        <H3>8.1 Invoicing, Payment Methods, and Authorization</H3>
        <P>
          Fees are payable in the currency specified at the time of purchase and by the payment
          methods accepted by the Company. By providing a payment method, you authorize the
          Company (and its payment processors) to charge that payment method for all Fees
          incurred, including recurring Subscription Fees, on the applicable dates.
        </P>
        <H3>8.2 Taxes, Late Payments, and Failed Payments</H3>
        <P>
          Fees are exclusive of any applicable taxes, duties, levies, or similar governmental
          assessments, all of which are your responsibility. Late payments may accrue interest at
          the lesser of one and one-half percent (1.5%) per month or the maximum rate permitted
          by Applicable Law, and the Company may suspend or terminate the Services and refer
          delinquent amounts to collections. If a payment fails, you authorize the Company to
          reattempt the charge.
        </P>
        <H3>8.3 Chargebacks, Collections, and Refund Eligibility</H3>
        <P>
          You agree to contact the Company before initiating a chargeback, and you agree to
          reimburse the Company for any chargeback that is not the result of the Company&rsquo;s
          error. Refund eligibility is governed by Section 9.
        </P>
        <H3>8.4 Pricing Changes</H3>
        <P>
          The Company may modify the Fees for the Services at any time. Pricing changes will
          apply as of the next renewal Billing Cycle following notice provided in accordance
          with this Agreement.
        </P>
      </>
    ),
  },
  {
    id: "refunds",
    number: 9,
    title: "Refund Policy",
    body: (
      <>
        <P>
          Except as expressly required by Applicable Law or as expressly set forth in an
          applicable order form, all Fees are non-refundable, and no refunds or credits will be
          issued for partial Billing Cycles, unused features, or downgraded Subscriptions.
        </P>
        <P>
          Where the Company, in its sole discretion, elects to issue a refund, the refund will
          generally be processed to the original payment method within a reasonable period and
          shall constitute the User&rsquo;s sole and exclusive remedy in respect of the amounts
          refunded. Chargebacks initiated in the absence of a good-faith dispute may result in
          suspension or termination of the Account.
        </P>
      </>
    ),
  },
  {
    id: "ip",
    number: 10,
    title: "Intellectual Property",
    body: (
      <>
        <P>
          The Services, the Software, the Platform, the Website, and all associated Content,
          including all designs, logos, graphics, text, images, video, audio, code, APIs,
          documentation, features, workflows, know-how, trade secrets, patents, patent
          applications, copyrights, trademarks, service marks, and other Intellectual Property,
          are and shall remain the sole and exclusive property of the Company and its licensors.
        </P>
        <P>
          Subject to your compliance with this Agreement and payment of all applicable Fees, the
          Company grants you a limited, non-exclusive, non-transferable, non-sublicensable,
          revocable license to access and use the Services solely for your internal business
          purposes during the term of your Subscription. All rights not expressly granted are
          reserved. You may not copy, modify, distribute, sell, lease, sublicense, or create
          derivative works of the Services, in whole or in part.
        </P>
      </>
    ),
  },
  {
    id: "user-content",
    number: 11,
    title: "User Content",
    body: (
      <>
        <H3>11.1 Ownership and License</H3>
        <P>
          You retain all right, title, and interest in and to your User Content, subject to the
          limited license granted to the Company below. By submitting User Content to the
          Services, you grant the Company a worldwide, non-exclusive, royalty-free, sublicensable
          license to host, store, reproduce, modify (for technical purposes such as formatting or
          transmission), create derivative works of (to the extent necessary to provide the
          Services), display, and transmit such User Content solely as necessary to operate and
          provide the Services in accordance with this Agreement.
        </P>
        <H3>11.2 Storage, Backups, and Retention</H3>
        <P>
          The Company will maintain reasonable technical measures to store User Content in
          accordance with the applicable Subscription and its documented backup practices. You
          remain responsible for maintaining independent backups of any User Content that is
          critical to your business.
        </P>
        <H3>11.3 Monitoring, Moderation, and Removal</H3>
        <P>
          The Company does not routinely pre-screen User Content but reserves the right, but not
          the obligation, to monitor, review, and remove User Content that it reasonably believes
          violates this Agreement, Applicable Law, or the rights of any Third Party.
        </P>
        <H3>11.4 Responsibility</H3>
        <P>
          You are solely responsible for your User Content and for the consequences of submitting
          it, including ensuring that you have all necessary rights, consents, and authorizations
          to make such User Content available through the Services.
        </P>
      </>
    ),
  },
  {
    id: "third-party",
    number: 12,
    title: "Third-Party Services",
    body: (
      <>
        <P>
          The Services may interoperate with, link to, or otherwise rely upon Third-Party
          services, including payment processors, cloud infrastructure providers, email and SMS
          providers, mapping providers, identity and authentication providers, analytics
          providers, advertising services, and public APIs.
        </P>
        <P>
          Such Third-Party services are provided and controlled by the respective Third Parties,
          not by the Company, and are subject to their own terms and privacy practices. The
          Company does not endorse, warrant, or assume responsibility for any Third-Party
          services and shall not be liable for their acts, omissions, availability, security, or
          performance. Your use of any Third-Party service is at your own risk and subject to
          your acceptance of the applicable Third-Party terms.
        </P>
      </>
    ),
  },
  {
    id: "availability",
    number: 13,
    title: "Service Availability",
    body: (
      <>
        <P>
          The Company will use commercially reasonable efforts to make the Services available in
          accordance with the applicable Subscription. However, the Company does not warrant that
          the Services will be uninterrupted, error-free, secure, or available at any particular
          time or location.
        </P>
        <P>
          The Services may be temporarily unavailable due to scheduled maintenance, emergency
          maintenance, updates, upgrades, capacity constraints, network or infrastructure
          failures, force majeure events, or other causes beyond the Company&rsquo;s reasonable
          control. Beta, preview, alpha, and early-access features are provided on an
          experimental basis and may be modified, suspended, or discontinued at any time without
          notice, and without liability to any User.
        </P>
      </>
    ),
  },
  {
    id: "updates",
    number: 14,
    title: "Software Updates",
    body: (
      <>
        <P>
          The Company may from time to time release updates, upgrades, patches, bug fixes, and
          new versions of the Software (collectively, &ldquo;Updates&rdquo;). Updates may be
          delivered automatically or made available for installation and may modify, add, or
          remove features. You consent to the automatic delivery and installation of such
          Updates, including security patches, to the extent applicable to the Services you use.
        </P>
        <P>
          The Company may discontinue support for older versions of the Software and reserves
          the right to require Users to upgrade to a supported version in order to continue using
          the Services. Continued use of an unsupported version is at your own risk.
        </P>
      </>
    ),
  },
  {
    id: "security",
    number: 15,
    title: "Data Security",
    body: (
      <>
        <P>
          The Company maintains a comprehensive information security program designed to protect
          the confidentiality, integrity, and availability of Customer data, including
          administrative, technical, and physical safeguards proportionate to the nature of the
          data processed. Such safeguards include, without limitation, encryption of data in
          transit and, where applicable, at rest; role-based access controls; network
          segmentation; centralized logging and monitoring; vulnerability management;
          documented incident response procedures; and backup and disaster recovery capabilities.
        </P>
        <P>
          Notwithstanding the foregoing, no method of transmission over the Internet and no
          method of electronic storage is completely secure, and the Company cannot and does not
          guarantee absolute security. You are responsible for configuring your Account in a
          secure manner and for the security of any systems used to access the Services.
        </P>
      </>
    ),
  },
  {
    id: "privacy",
    number: 16,
    title: "Privacy",
    body: (
      <>
        <P>
          Your use of the Services is subject to the Company&rsquo;s{" "}
          <Link to="/privacy" className="font-bold text-forest underline">
            Privacy Policy
          </Link>
          , which is incorporated into this Agreement by reference. The Privacy Policy describes
          how the Company collects, uses, discloses, retains, and safeguards personal information
          in connection with the Services. In the event of a conflict between this Agreement and
          the Privacy Policy with respect to the processing of personal information, the Privacy
          Policy shall control.
        </P>
      </>
    ),
  },
  {
    id: "confidentiality",
    number: 17,
    title: "Confidentiality",
    body: (
      <>
        <P>
          Each party (the &ldquo;Receiving Party&rdquo;) may have access to Confidential
          Information of the other party (the &ldquo;Disclosing Party&rdquo;). The Receiving
          Party shall (a) use the Confidential Information solely for the purpose of exercising
          its rights and performing its obligations under this Agreement; (b) protect the
          Confidential Information using at least the same degree of care it uses to protect its
          own confidential information of like nature, but in no event less than a reasonable
          degree of care; and (c) not disclose the Confidential Information to any Third Party
          except to its personnel, contractors, and advisors who have a need to know and who are
          bound by confidentiality obligations no less protective than those set forth herein.
        </P>
        <P>
          The obligations of confidentiality shall not apply to information that (i) is or
          becomes publicly available without breach of this Agreement; (ii) was rightfully known
          to the Receiving Party without restriction prior to disclosure; (iii) is rightfully
          received from a Third Party without duty of confidentiality; or (iv) is independently
          developed by the Receiving Party without use of or reference to the Confidential
          Information. The Receiving Party may disclose Confidential Information as required by
          Applicable Law or by valid legal process, provided that, to the extent legally
          permitted, it gives the Disclosing Party prompt notice and reasonable cooperation. The
          obligations set forth in this Section shall survive termination of this Agreement.
        </P>
      </>
    ),
  },
  {
    id: "disclaimers",
    number: 18,
    title: "Disclaimers",
    body: (
      <>
        <LegalCaps>
          The Services, the Software, the Platform, the Website, and any related Content are
          provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; with all faults and
          without warranty of any kind. To the maximum extent permitted by Applicable Law, the
          Company, on behalf of itself and its Affiliates, licensors, and suppliers, expressly
          disclaims all warranties, whether express, implied, statutory, or otherwise, including,
          without limitation, all implied warranties of merchantability, fitness for a particular
          purpose, title, non-infringement, quiet enjoyment, accuracy, and any warranties arising
          out of course of dealing or usage of trade.
        </LegalCaps>
        <P>
          Without limiting the generality of the foregoing, the Company makes no warranty that
          the Services will meet your requirements, that the operation of the Services will be
          uninterrupted or error-free, that defects will be corrected, or that the Services or
          the servers that make them available are free of viruses or other harmful components.
          Any material downloaded or otherwise obtained through the use of the Services is
          accessed at your own discretion and risk.
        </P>
      </>
    ),
  },
  {
    id: "liability",
    number: 19,
    title: "Limitation of Liability",
    body: (
      <>
        <LegalCaps>
          To the maximum extent permitted by Applicable Law, in no event shall the Company, its
          Affiliates, licensors, or suppliers be liable for any indirect, incidental, special,
          consequential, exemplary, or punitive damages, including, without limitation, damages
          for loss of profits, revenue, business, goodwill, use, data, or other intangible
          losses, arising out of or in connection with this Agreement or the Services, whether
          based in contract, tort (including negligence), strict liability, or any other legal
          theory, and whether or not the Company has been advised of the possibility of such
          damages.
        </LegalCaps>
        <LegalCaps>
          To the maximum extent permitted by Applicable Law, the aggregate liability of the
          Company and its Affiliates arising out of or in connection with this Agreement or the
          Services shall not exceed the greater of (a) the total Fees paid by you to the Company
          for the Services giving rise to the claim during the twelve (12) months immediately
          preceding the event giving rise to the claim, or (b) one hundred U.S. dollars
          (US$100.00).
        </LegalCaps>
        <P>
          Some jurisdictions do not allow the exclusion or limitation of certain damages, so
          some of the above limitations may not apply to you. In such jurisdictions, the
          Company&rsquo;s liability shall be limited to the maximum extent permitted by
          Applicable Law.
        </P>
      </>
    ),
  },
  {
    id: "indemnification",
    number: 20,
    title: "Indemnification",
    body: (
      <>
        <P>
          You agree to defend, indemnify, and hold harmless the Company and its Affiliates,
          officers, directors, employees, agents, licensors, vendors, successors, and assigns
          (collectively, the &ldquo;Indemnified Parties&rdquo;) from and against any and all
          claims, demands, actions, liabilities, damages, losses, judgments, settlements, costs,
          and expenses (including reasonable attorneys&rsquo; fees) arising out of or relating to
          (a) your access to or use of the Services; (b) your User Content; (c) your violation of
          this Agreement, any Applicable Law, or the rights of any Third Party; or (d) any
          activity conducted through your Account.
        </P>
        <P>
          The Company reserves the right, at its own expense, to assume the exclusive defense
          and control of any matter otherwise subject to indemnification by you, in which event
          you shall cooperate fully with the Company in asserting any available defenses. You
          shall not settle any claim without the Company&rsquo;s prior written consent.
        </P>
      </>
    ),
  },
  {
    id: "termination",
    number: 21,
    title: "Termination",
    body: (
      <>
        <H3>21.1 Termination by User</H3>
        <P>
          You may terminate this Agreement at any time by cancelling your Subscription and
          discontinuing all use of the Services. Termination does not entitle you to a refund of
          Fees paid, except as expressly provided in this Agreement.
        </P>
        <H3>21.2 Termination or Suspension by Company</H3>
        <P>
          The Company may, in its sole discretion, suspend or terminate your access to any or
          all of the Services, with or without notice, if the Company reasonably believes that
          (a) you have violated this Agreement or any Applicable Law; (b) your use of the
          Services poses a security or legal risk to the Company, other Users, or Third Parties;
          (c) your Account has become inactive; or (d) continued provision of the Services is no
          longer commercially reasonable.
        </P>
        <H3>21.3 Effect of Termination</H3>
        <P>
          Upon termination, all rights and licenses granted to you under this Agreement shall
          immediately cease, and you shall promptly discontinue all use of the Services. The
          Company may delete your Account and User Content in accordance with its standard
          retention practices. All Fees accrued prior to termination shall remain payable.
          Sections that by their nature should survive termination, including Sections 2, 8, 9,
          10, 15, 17, 18, 19, 20, 24, 25, 32, 33, 34, and this Section 21, shall survive.
        </P>
      </>
    ),
  },
  {
    id: "force-majeure",
    number: 22,
    title: "Force Majeure",
    body: (
      <>
        <P>
          Neither party shall be liable for any failure or delay in performing its obligations
          under this Agreement (other than payment obligations) to the extent that such failure
          or delay is caused by an event beyond the reasonable control of the affected party,
          including, without limitation, acts of God, natural disasters, fires, floods,
          earthquakes, epidemics, pandemics, wars, terrorism, civil unrest, governmental actions,
          embargoes, labor disputes, strikes, shortages of materials or transportation, Internet
          or telecommunications outages, power failures, cyberattacks, denial-of-service attacks,
          or failures of Third-Party service providers (each, a &ldquo;Force Majeure Event&rdquo;).
        </P>
        <P>
          The affected party shall use commercially reasonable efforts to mitigate the effect of
          the Force Majeure Event and shall promptly resume performance once the Force Majeure
          Event has ceased.
        </P>
      </>
    ),
  },
  {
    id: "export",
    number: 23,
    title: "Export Compliance",
    body: (
      <>
        <P>
          The Services, including any Software provided in connection therewith, may be subject
          to export control and economic sanctions laws and regulations, including those of the
          United States and other jurisdictions. You agree to comply with all such laws and
          regulations, and you represent and warrant that you are not located in, under the
          control of, or a national or resident of any country subject to comprehensive
          sanctions, and that you are not identified on any restricted party list maintained by
          any competent governmental authority.
        </P>
      </>
    ),
  },
  {
    id: "governing-law",
    number: 24,
    title: "Governing Law",
    body: (
      <>
        <P>
          This Agreement, and any dispute arising out of or relating to this Agreement or the
          Services, shall be governed by and construed in accordance with the laws of the
          [State/Province] of [State/Province Name], [Country], without regard to its conflict of
          laws principles. The United Nations Convention on Contracts for the International Sale
          of Goods shall not apply.
        </P>
        <P>
          Subject to Section 25, the parties consent to the exclusive jurisdiction and venue of
          the state and federal courts located in [County, State/Province], [Country], for any
          action or proceeding not subject to arbitration.
        </P>
      </>
    ),
  },
  {
    id: "disputes",
    number: 25,
    title: "Dispute Resolution",
    body: (
      <>
        <H3>25.1 Informal Resolution</H3>
        <P>
          Before initiating any formal proceeding, the parties agree to attempt in good faith to
          resolve any dispute arising out of or relating to this Agreement through informal
          negotiation. Either party may initiate this process by providing written notice to the
          other party describing the dispute in reasonable detail.
        </P>
        <H3>25.2 Mediation and Binding Arbitration</H3>
        <P>
          If the dispute is not resolved within thirty (30) days after the notice, the parties
          agree to submit the dispute first to non-binding mediation and, if mediation fails, to
          binding arbitration administered by a recognized arbitration body in [Seat of
          Arbitration], in accordance with its then-current rules. The arbitration shall be
          conducted in the English language by a single arbitrator, and the award shall be
          final and binding on the parties.
        </P>
        <H3>25.3 Class Action Waiver and Small Claims</H3>
        <P>
          To the maximum extent permitted by Applicable Law, the parties agree that any dispute
          shall be resolved on an individual basis, and each party waives any right to
          participate in a class action, collective action, or representative proceeding. This
          Section does not preclude either party from seeking relief in a small claims court of
          competent jurisdiction for disputes within its jurisdictional limits.
        </P>
        <H3>25.4 Time Limitation</H3>
        <P>
          Any claim arising out of or relating to this Agreement must be brought within one (1)
          year after the cause of action arises, or such longer period as required by Applicable
          Law, or be forever barred.
        </P>
      </>
    ),
  },
  {
    id: "electronic",
    number: 26,
    title: "Electronic Communications",
    body: (
      <>
        <P>
          By using the Services, you consent to receive communications from the Company in
          electronic form, including via email, in-app notifications, and postings on the
          Website. You agree that all notices, disclosures, agreements, and other communications
          that the Company provides to you electronically satisfy any legal requirement that
          such communications be in writing, and you further agree that electronic signatures,
          click-to-accept mechanisms, and similar means shall have the same legal effect as
          handwritten signatures.
        </P>
      </>
    ),
  },
  {
    id: "changes-services",
    number: 27,
    title: "Changes to Services",
    body: (
      <>
        <P>
          The Company reserves the right, at any time and from time to time, to modify, suspend,
          replace, add, remove, or discontinue, temporarily or permanently, all or any portion
          of the Services (including features, functionality, integrations, and pricing) with or
          without notice. The Company shall not be liable to you or any Third Party for any
          modification, suspension, or discontinuation of the Services, except as expressly
          required by Applicable Law.
        </P>
      </>
    ),
  },
  {
    id: "changes-terms",
    number: 28,
    title: "Changes to Terms",
    body: (
      <>
        <P>
          The Company may revise this Agreement from time to time. Revisions will be effective as
          of the date indicated at the top of the Agreement, and the Company will provide notice
          of material changes through the Services or by other reasonable means. Your continued
          access to or use of the Services following the effective date of a revised Agreement
          constitutes your acceptance of the revised Agreement. If you do not agree to the
          revised Agreement, you must discontinue use of the Services.
        </P>
      </>
    ),
  },
  {
    id: "severability",
    number: 29,
    title: "Severability",
    body: (
      <>
        <P>
          If any provision of this Agreement is held to be invalid, illegal, or unenforceable by
          a court of competent jurisdiction, such provision shall be modified to the minimum
          extent necessary to render it valid, legal, and enforceable, or, if it cannot be so
          modified, shall be severed from this Agreement, and the remaining provisions shall
          continue in full force and effect.
        </P>
      </>
    ),
  },
  {
    id: "waiver",
    number: 30,
    title: "Waiver",
    body: (
      <>
        <P>
          The failure of the Company to enforce any right or provision of this Agreement shall
          not be deemed a waiver of such right or provision. Any waiver of any provision of this
          Agreement shall be effective only if in writing and signed by an authorized
          representative of the Company.
        </P>
      </>
    ),
  },
  {
    id: "assignment",
    number: 31,
    title: "Assignment",
    body: (
      <>
        <P>
          You may not assign, delegate, or otherwise transfer this Agreement or any of your
          rights or obligations hereunder, in whole or in part, without the prior written
          consent of the Company, and any purported assignment in violation of this Section shall
          be null and void. The Company may freely assign this Agreement, in whole or in part, to
          any Affiliate or in connection with any merger, acquisition, reorganization, or sale
          of all or substantially all of its assets. This Agreement shall be binding upon and
          inure to the benefit of the parties and their permitted successors and assigns.
        </P>
      </>
    ),
  },
  {
    id: "no-agency",
    number: 32,
    title: "No Agency",
    body: (
      <>
        <P>
          Nothing in this Agreement shall be construed to create any partnership, joint venture,
          agency, franchise, employment, or fiduciary relationship between the parties. Neither
          party has any authority to bind the other or to incur any obligation on the
          other&rsquo;s behalf.
        </P>
      </>
    ),
  },
  {
    id: "survival",
    number: 33,
    title: "Survival",
    body: (
      <>
        <P>
          Any provision of this Agreement that by its nature should survive termination shall
          survive termination, including, without limitation, provisions relating to definitions,
          ownership, payment obligations accrued prior to termination, confidentiality,
          disclaimers, limitations of liability, indemnification, governing law, and dispute
          resolution.
        </P>
      </>
    ),
  },
  {
    id: "entire-agreement",
    number: 34,
    title: "Entire Agreement",
    body: (
      <>
        <P>
          This Agreement, together with the Privacy Policy, any applicable order form, and any
          other documents expressly incorporated by reference, constitutes the entire agreement
          between the parties with respect to the subject matter hereof and supersedes all prior
          and contemporaneous understandings, communications, proposals, and representations,
          whether oral or written. In the event of a conflict between this Agreement and any
          negotiated written agreement executed between the Company and a Customer, the
          negotiated agreement shall control with respect to the subject matter it addresses.
        </P>
      </>
    ),
  },
  {
    id: "contact",
    number: 35,
    title: "Contact Information",
    body: (
      <>
        <P>
          If you have any questions, concerns, or notices regarding this Agreement or the
          Services, please contact the Company using the information below. Legal notices should
          be directed to the attention of the Legal Department.
        </P>
        <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-6 sm:p-8">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">Company</dt>
              <dd className="mt-1 text-base text-foreground">[Company Name]</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">
                Attention
              </dt>
              <dd className="mt-1 text-base text-foreground">Legal Department</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">
                Mailing Address
              </dt>
              <dd className="mt-1 text-base text-foreground">
                [Street Address]<br />
                [City, State/Region, Postal Code]<br />
                [Country]
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">Email</dt>
              <dd className="mt-1 text-base text-foreground">legal@[company].com</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">Phone</dt>
              <dd className="mt-1 text-base text-foreground">+1 (555) 000-0000</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">Website</dt>
              <dd className="mt-1 text-base text-foreground">www.[company].com</dd>
            </div>
          </dl>
        </div>
        <Callout variant="legal" title="Legal Notice">
          This Terms of Service document is provided as a general framework and does not
          constitute legal advice. Companies adopting this template should consult qualified
          legal counsel to tailor its provisions to their specific business, jurisdiction, and
          risk profile.
        </Callout>
      </>
    ),
  },
];

function TermsPage() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);
  const toc = useMemo(
    () => SECTIONS.map((s) => ({ id: s.id, number: s.number, title: s.title })),
    [],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId((visible[0].target as HTMLElement).id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0.01 },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <header className="relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary/50 to-background print:bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:px-8">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-forest">
            <Scale className="h-4 w-4" /> Legal · Agreement
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-forest-deep sm:text-6xl">
            Terms of Service
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            This Terms of Service agreement governs your access to and use of the Company&rsquo;s
            Platform, Software, Website, and Services. It defines the rights and obligations of
            both the Company and each User and is a legally binding contract.
          </p>
          <dl className="mt-8 grid gap-4 rounded-2xl border border-border bg-card/60 p-5 sm:grid-cols-3 sm:p-6">
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">
                Effective Date
              </dt>
              <dd className="mt-1 font-display text-lg text-forest-deep">January 1, 2026</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">
                Last Updated
              </dt>
              <dd className="mt-1 font-display text-lg text-forest-deep">January 1, 2026</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">Version</dt>
              <dd className="mt-1 font-display text-lg text-forest-deep">1.0</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-bold text-forest-deep hover:bg-secondary"
            >
              <Printer className="h-4 w-4" /> Print / Save as PDF
            </button>
            <a
              href="#toc"
              className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-cream hover:bg-forest-deep"
            >
              <Gavel className="h-4 w-4" /> Jump to Table of Contents
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8 lg:py-16">
        <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
          <aside
            id="toc"
            className="mb-10 lg:mb-0 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto print:hidden"
          >
            <nav aria-label="Table of contents">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-forest">
                Table of Contents
              </p>
              <ol className="space-y-1 border-l border-border pl-4 text-sm">
                {toc.map((s) => {
                  const active = activeId === s.id;
                  return (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className={`block rounded px-2 py-1.5 leading-snug transition ${
                          active
                            ? "bg-lime/20 font-bold text-forest-deep"
                            : "text-muted-foreground hover:text-forest-deep"
                        }`}
                      >
                        <span className="mr-2 tabular-nums text-forest/70">
                          {String(s.number).padStart(2, "0")}
                        </span>
                        {s.title}
                      </a>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </aside>

          <main className="min-w-0">
            <section className="hidden print:block">
              <h2 className="font-display text-2xl font-bold text-forest-deep">
                Table of Contents
              </h2>
              <ol className="mt-4 space-y-1">
                {toc.map((s) => (
                  <li key={s.id} className="text-sm">
                    <span className="mr-2 tabular-nums">{s.number}.</span>
                    {s.title}
                  </li>
                ))}
              </ol>
              <hr className="my-8 border-border" />
            </section>

            <article className="max-w-3xl">
              {SECTIONS.map((s) => (
                <section
                  key={s.id}
                  id={s.id}
                  className="scroll-mt-24 border-b border-border/60 pb-12 pt-8 first:pt-0 last:border-b-0 print:break-inside-avoid"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-forest">
                    Section {String(s.number).padStart(2, "0")}
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-bold leading-tight text-forest-deep sm:text-4xl">
                    {s.title}
                  </h2>
                  <div className="mt-2 text-base">{s.body}</div>
                </section>
              ))}

              <footer className="mt-16 rounded-2xl border border-border bg-secondary/40 p-6 text-sm text-muted-foreground sm:p-8">
                <p>
                  © {new Date().getFullYear()} [Company Name]. All rights reserved. By using the
                  Services, you acknowledge that you have read and agree to these Terms of
                  Service.
                </p>
              </footer>
            </article>
          </main>
        </div>
      </div>

      <SiteFooter />

      <style>{`
        @media print {
          nav, header button, footer, aside#toc { display: none !important; }
          main { max-width: 100% !important; }
          body { background: white !important; }
          h1, h2, h3 { color: #000 !important; }
          a { color: inherit !important; text-decoration: none !important; }
          section { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
