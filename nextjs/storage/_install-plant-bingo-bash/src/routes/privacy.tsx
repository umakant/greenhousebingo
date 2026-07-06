import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AlertTriangle, Info, Shield, ScrollText, Printer } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Company" },
      {
        name: "description",
        content:
          "Enterprise-grade Privacy Policy describing how the Company collects, uses, discloses, and protects personal information across its Platform and Services.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: PrivacyPage,
});

type Section = {
  id: string;
  number: number;
  title: string;
  body: React.ReactNode;
};

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
      title: "text-forest-deep",
    },
    warning: {
      wrap: "border-tomato/40 bg-tomato/10",
      icon: <AlertTriangle className="h-5 w-5 text-tomato" />,
      title: "text-tomato",
    },
    legal: {
      wrap: "border-forest/30 bg-secondary/60",
      icon: <Shield className="h-5 w-5 text-forest" />,
      title: "text-forest-deep",
    },
  }[variant];

  return (
    <aside
      className={`my-8 rounded-2xl border-l-4 ${styles.wrap} p-5 sm:p-6 print:my-4 print:border print:bg-transparent`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{styles.icon}</div>
        <div className="min-w-0">
          <p className={`font-display text-base font-bold ${styles.title}`}>{title}</p>
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

const SECTIONS: Section[] = [
  {
    id: "introduction",
    number: 1,
    title: "Introduction",
    body: (
      <>
        <P>
          This Privacy Policy (the &ldquo;Policy&rdquo;) describes how [Company Name] (the
          &ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects,
          uses, discloses, retains, and safeguards Personal Information in connection with its
          websites, applications, application programming interfaces, mobile experiences,
          administrative portals, communications, marketing activities, and any related products or
          services (collectively, the &ldquo;Platform&rdquo; or the &ldquo;Services&rdquo;). We are
          committed to protecting the privacy of every individual who interacts with the Services,
          and this Policy is intended to explain, in a clear and transparent manner, the practices
          that govern the information we handle.
        </P>
        <P>
          The Company operates in a rapidly evolving technological and regulatory environment, and
          we recognize that our users, customers, prospects, business partners, and visitors
          entrust us with information that is often sensitive, confidential, or commercially
          significant. Accordingly, we have designed our data practices to comply with applicable
          data protection and privacy laws in the jurisdictions in which we operate and to reflect
          widely accepted principles of fair information practices, including lawfulness, fairness,
          transparency, purpose limitation, data minimization, accuracy, storage limitation,
          integrity, confidentiality, and accountability.
        </P>
        <P>
          This Policy applies to all Personal Information processed by the Company in any format,
          whether electronic, physical, structured, or unstructured, and regardless of whether the
          information is collected directly from the individual or obtained through authorized
          third parties, service providers, publicly available sources, or automated technologies.
          It applies to visitors of our marketing website, registered account holders, authorized
          users of customer accounts, prospective customers, event attendees, survey respondents,
          job applicants where applicable, and any other individuals whose information we process
          in the ordinary course of our business.
        </P>
        <P>
          By accessing or using the Services, submitting information through the Platform,
          registering for an account, subscribing to communications, purchasing a subscription, or
          otherwise interacting with the Company, you acknowledge that you have read, understood,
          and agree to the practices described in this Policy. If you do not agree with any part of
          this Policy, you should discontinue use of the Services and refrain from providing
          Personal Information to the Company. Where required by applicable law, we will obtain
          specific, informed, and unambiguous consent prior to engaging in certain processing
          activities, and this Policy should not be construed as a substitute for such consent when
          the law requires it.
        </P>
        <Callout variant="legal" title="Scope and Interpretation">
          This Policy should be read together with our Terms of Service, any product-specific
          terms, order forms, data processing addenda, and any supplemental notices that we may
          provide from time to time. In the event of a conflict between this Policy and a
          negotiated written agreement executed between the Company and a customer, the negotiated
          agreement will control with respect to the subject matter it addresses.
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
          For the purposes of this Policy, the following capitalized terms have the meanings
          assigned to them below. These definitions are intended to promote consistency and clarity
          and should be interpreted broadly, in a manner consistent with applicable law and the
          purposes of this Policy. Words denoting the singular include the plural and vice versa,
          and words denoting any gender include all genders.
        </P>
        <dl>
          <DefTerm term="2.1 Company">
            Refers to the entity providing the Services, together with its parents, subsidiaries,
            affiliates, successors, and assigns, acting in the capacity of a data controller,
            business, or equivalent role under Applicable Law.
          </DefTerm>
          <DefTerm term="2.2 Services">
            Any product, feature, subscription, application, tool, integration, application
            programming interface, dashboard, communication channel, event, or professional service
            made available by the Company, whether accessed through a web browser, mobile
            application, embedded interface, or third-party marketplace.
          </DefTerm>
          <DefTerm term="2.3 Platform">
            The technical infrastructure, software, and interfaces through which the Services are
            delivered, including hosted environments, back-end systems, storage layers, and
            administrative tooling.
          </DefTerm>
          <DefTerm term="2.4 User">
            Any natural person who accesses or uses the Services, including visitors of the
            marketing website, authorized users of a Customer account, invited collaborators, and
            individuals engaging with support or sales channels.
          </DefTerm>
          <DefTerm term="2.5 Customer">
            Any organization or individual that has entered into an agreement with the Company for
            access to the Services, including on a paid, trial, evaluation, or free-tier basis, and
            that is responsible for the accounts, workspaces, or environments provisioned under
            such agreement.
          </DefTerm>
          <DefTerm term="2.6 Personal Information">
            Any information that identifies, relates to, describes, is reasonably capable of being
            associated with, or could reasonably be linked, directly or indirectly, with a
            particular individual or household, including any information defined as &ldquo;personal
            data,&rdquo; &ldquo;personal information,&rdquo; or a similar term under Applicable
            Law.
          </DefTerm>
          <DefTerm term="2.7 Sensitive Information">
            A subset of Personal Information that, under Applicable Law, warrants heightened
            protection, which may include government-issued identifiers, financial account
            information, precise geolocation, biometric or genetic data, health information,
            information concerning race or ethnicity, religious or philosophical beliefs, sexual
            orientation, trade union membership, and information about children.
          </DefTerm>
          <DefTerm term="2.8 Processing">
            Any operation or set of operations performed on Personal Information, whether or not by
            automated means, including collection, recording, organization, structuring, storage,
            adaptation, alteration, retrieval, consultation, use, disclosure, dissemination,
            alignment, combination, restriction, erasure, or destruction.
          </DefTerm>
          <DefTerm term="2.9 Cookies">
            Small text files or similar technologies (including pixels, tags, software development
            kits, local storage, and session storage) placed on a Device that allow the Platform to
            recognize the Device and record information about the User&rsquo;s interaction with the
            Services.
          </DefTerm>
          <DefTerm term="2.10 Third Party">
            Any natural or legal person, agency, or body other than the individual to whom Personal
            Information relates, the Company, or the Company&rsquo;s directly authorized personnel.
          </DefTerm>
          <DefTerm term="2.11 Affiliate">
            Any entity that directly or indirectly controls, is controlled by, or is under common
            control with the Company, where &ldquo;control&rdquo; means the ownership of more than
            fifty percent (50%) of the voting equity interests or the power to direct the
            management or policies of such entity.
          </DefTerm>
          <DefTerm term="2.12 Device">
            Any computer, mobile phone, tablet, wearable, kiosk, server, or other hardware capable
            of connecting to the Services or storing information relating to the Services.
          </DefTerm>
          <DefTerm term="2.13 Account">
            The record established when a User registers to access the Services, including all
            associated credentials, settings, permissions, workspaces, environments, and content.
          </DefTerm>
          <DefTerm term="2.14 Content">
            Any data, files, text, images, video, audio, software, submissions, or other materials
            uploaded to, transmitted through, or otherwise made available by or through the
            Services.
          </DefTerm>
          <DefTerm term="2.15 Applicable Law">
            All statutes, regulations, rules, orders, decisions, decrees, treaties, directives,
            standards, and binding guidance issued by any competent governmental or regulatory
            authority that apply to the Company&rsquo;s processing of Personal Information.
          </DefTerm>
        </dl>
      </>
    ),
  },
  {
    id: "information-we-collect",
    number: 3,
    title: "Information We Collect",
    body: (
      <>
        <P>
          The Company collects several categories of information in order to operate, secure,
          improve, and commercialize the Services. The specific categories collected in any given
          case depend on the nature of the interaction, the features used, the configuration
          selected by the Customer, and the requirements of Applicable Law. The following
          subsections describe the categories of information that we may collect, together with
          representative examples of the types of data that fall within each category.
        </P>
        <H3>3.1 Personal Information</H3>
        <P>
          Personal Information includes any information that can be used to identify a natural
          person, either alone or in combination with other information reasonably available to
          the Company. Representative examples include full name, professional title, employer,
          username, profile photograph, digital signature, date of birth where required for
          verification, and any unique identifiers assigned by the Company or by the User&rsquo;s
          organization.
        </P>
        <H3>3.2 Business Information</H3>
        <P>
          Where a User interacts with the Services on behalf of an organization, we may collect
          information related to that organization, including legal entity name, registered
          address, tax identification numbers, industry, size, functional role of the User,
          departmental affiliations, and information regarding the User&rsquo;s authority to bind
          the organization to agreements with the Company.
        </P>
        <H3>3.3 Contact Information</H3>
        <P>
          Contact information includes email addresses, telephone numbers, physical addresses,
          messaging application handles, and other data elements that enable the Company to
          communicate with a User or Customer regarding the Services, transactional matters,
          support, security notifications, and, where permitted, marketing communications.
        </P>
        <H3>3.4 Device, Browser, and Network Information</H3>
        <P>
          When Users access the Services, the Platform automatically records technical information
          about the Devices, browsers, and networks used to establish the connection. This may
          include hardware model, operating system and version, browser type and version, unique
          device identifiers, language settings, time zone, screen resolution, installed fonts,
          referring URLs, exit pages, internet service provider, mobile carrier, connection type,
          and diagnostic identifiers used for troubleshooting.
        </P>
        <H3>3.5 IP Addresses and Location Data</H3>
        <P>
          The Platform automatically receives Internet Protocol (IP) addresses assigned to the
          Devices used to access the Services. From these addresses, and from other signals such as
          browser locale and, where explicitly authorized, precise location data provided by the
          Device, we may derive approximate geolocation for purposes including fraud prevention,
          regulatory compliance, localization, service performance measurement, and detection of
          anomalous access patterns.
        </P>
        <H3>3.6 Usage Data</H3>
        <P>
          Usage data comprises information about how Users interact with the Services, including
          pages viewed, features accessed, buttons clicked, workflows initiated and completed,
          searches performed, session duration, frequency and timing of access, error events,
          performance metrics, and other behavioral signals. This data is generated automatically
          in the ordinary course of operating the Platform and is essential to maintaining service
          quality, diagnosing issues, and improving the User experience.
        </P>
        <H3>3.7 Payment Information</H3>
        <P>
          When a User or Customer purchases a subscription, add-on, service, or other paid
          offering, information necessary to process the transaction is collected. Full payment
          card numbers, card verification values, and equivalent financial account credentials are
          not stored on the Company&rsquo;s systems in a readable form; instead, such information
          is transmitted directly to certified payment processors that operate independently as
          data controllers or processors for the payment transaction and that maintain compliance
          with the Payment Card Industry Data Security Standard (PCI DSS).
        </P>
        <H3>3.8 Authentication Data</H3>
        <P>
          To secure Accounts, we collect authentication data including hashed passwords,
          multi-factor authentication credentials, single sign-on tokens, session identifiers,
          recovery codes, and audit information regarding login attempts. Passwords are never
          stored in plaintext, and secrets are managed using industry-recognized cryptographic
          techniques.
        </P>
        <H3>3.9 Uploaded Files and User Content</H3>
        <P>
          The Services may allow Users to upload documents, images, spreadsheets, media, code,
          datasets, and other files. The Company processes such Content solely as necessary to
          provide the Services in accordance with the applicable customer agreement and this
          Policy. The Company does not claim ownership of Customer Content.
        </P>
        <H3>3.10 Communications, Support Requests, and Survey Responses</H3>
        <P>
          When Users contact the Company through email, chat, ticketing systems, community forums,
          telephone, video conference, or physical mail, we collect the content of such
          communications, associated metadata, and any attachments provided. We may also collect
          responses to voluntary surveys, feedback forms, product research sessions, and
          testimonial requests.
        </P>
        <H3>3.11 Marketing Preferences and Technical Diagnostics</H3>
        <P>
          We collect information about your marketing preferences, subscription status, engagement
          with communications, and event registrations. In addition, we collect technical
          diagnostics such as crash reports, stack traces, latency measurements, and performance
          telemetry for the purpose of maintaining the reliability and integrity of the Services.
        </P>
      </>
    ),
  },
  {
    id: "how-information-is-collected",
    number: 4,
    title: "How Information Is Collected",
    body: (
      <>
        <P>
          The Company collects information through a variety of channels, each of which is
          designed to be transparent, proportionate to the purpose of collection, and consistent
          with the reasonable expectations of the individuals concerned. Information may be
          provided directly by Users, generated automatically by the Platform, or obtained through
          authorized Third Parties acting on behalf of, or in cooperation with, the Company.
        </P>
        <H3>4.1 Registration and Account Creation</H3>
        <P>
          When you create an Account, we collect the information you provide during registration,
          which may include your name, business email, organization, role, password, and any
          information required to verify your identity or authority to represent an organization.
        </P>
        <H3>4.2 Purchases and Order Processing</H3>
        <P>
          When you purchase a subscription or add-on, we collect billing details, transaction
          identifiers, purchase history, tax residency information, and any information reasonably
          required to complete the transaction, deliver the Services, issue invoices, and comply
          with tax and accounting obligations.
        </P>
        <H3>4.3 Contact Forms and Direct Communications</H3>
        <P>
          We collect information you voluntarily submit through contact forms, sales inquiry
          forms, demonstration requests, partnership inquiries, and similar mechanisms, as well as
          any information you share when corresponding with our teams.
        </P>
        <H3>4.4 Cookies, Browser Storage, and Similar Technologies</H3>
        <P>
          As described in Section 8, we and our authorized service providers use Cookies, local
          storage, session storage, and comparable technologies to collect information about how
          you interact with the Services.
        </P>
        <H3>4.5 Analytics and Product Telemetry</H3>
        <P>
          We use analytics tools, both first-party and third-party, to measure how the Services are
          used, understand aggregate behavior, evaluate product performance, and identify
          opportunities for improvement.
        </P>
        <H3>4.6 APIs, Mobile Applications, and Integrations</H3>
        <P>
          Where you integrate the Services with third-party systems or use our APIs, we collect
          information about the calls made, the identity of the calling systems, the data
          transmitted, and error events, in accordance with your configuration and the applicable
          integration documentation.
        </P>
        <H3>4.7 Customer Support and Third-Party Sources</H3>
        <P>
          We collect information provided during support interactions, as well as information
          received from Third Parties such as resellers, referral partners, data enrichment
          providers, credit reference agencies where lawful, public registries, and sanctions
          screening providers.
        </P>
        <H3>4.8 Automatically Collected Information</H3>
        <P>
          Certain information is collected automatically when you interact with the Services, such
          as server logs, security event logs, and performance telemetry. This information is
          collected in the ordinary course of operating a modern, secure, and reliable software
          platform.
        </P>
      </>
    ),
  },
  {
    id: "legal-basis",
    number: 5,
    title: "Legal Basis for Processing",
    body: (
      <>
        <P>
          Where required by Applicable Law, including the European Union General Data Protection
          Regulation and the United Kingdom General Data Protection Regulation, the Company relies
          on one or more of the following legal bases to process Personal Information. The
          applicable legal basis depends on the specific processing activity and the context in
          which it occurs.
        </P>
        <H3>5.1 Consent</H3>
        <P>
          We rely on consent where you have expressly agreed to a particular processing activity,
          such as receiving certain marketing communications, participating in optional research
          programs, or permitting the use of non-essential Cookies. Where consent is the legal
          basis, you may withdraw such consent at any time, without affecting the lawfulness of
          processing carried out prior to withdrawal.
        </P>
        <H3>5.2 Performance of a Contract</H3>
        <P>
          We process Personal Information as necessary to enter into or perform a contract with
          you or the organization you represent, including provisioning Accounts, delivering the
          Services, providing support, processing payments, and fulfilling other contractual
          commitments.
        </P>
        <H3>5.3 Legitimate Interests</H3>
        <P>
          We process Personal Information where necessary for our legitimate interests or those of
          a Third Party, provided that such interests are not overridden by your fundamental
          rights and freedoms. Legitimate interests may include securing the Platform, preventing
          fraud, improving the Services, conducting business analytics, and communicating with
          existing customers about matters relevant to their use of the Services.
        </P>
        <H3>5.4 Compliance with Legal Obligations</H3>
        <P>
          We process Personal Information as necessary to comply with legal obligations to which
          the Company is subject, including tax, accounting, anti-money-laundering, sanctions,
          consumer protection, and information-request obligations.
        </P>
        <H3>5.5 Vital Interests and Public Interest</H3>
        <P>
          In rare circumstances, we may process Personal Information to protect the vital interests
          of a natural person, or to perform a task carried out in the public interest, where such
          processing is expressly authorized by Applicable Law.
        </P>
      </>
    ),
  },
  {
    id: "how-we-use",
    number: 6,
    title: "How We Use Information",
    body: (
      <>
        <P>
          The Company uses Personal Information for a limited number of clearly defined purposes
          that are consistent with the reasonable expectations of Users and the requirements of
          Applicable Law. Personal Information is not used for purposes that are materially
          different from those disclosed at the time of collection without providing notice and,
          where required, obtaining consent.
        </P>
        <H3>6.1 Account Management and Customer Support</H3>
        <P>
          We use Personal Information to establish, administer, and secure Accounts; to
          authenticate Users; to respond to inquiries; to resolve technical issues; and to provide
          the Services in accordance with the applicable agreement.
        </P>
        <H3>6.2 Billing, Fraud Prevention, and Security</H3>
        <P>
          We use Personal Information to process transactions, issue invoices, manage collections,
          detect and prevent fraudulent activity, investigate suspected security incidents, and
          protect the rights, property, and safety of the Company, our Users, and the public.
        </P>
        <H3>6.3 Product Improvement, Analytics, and Personalization</H3>
        <P>
          We use Personal Information to understand how Users interact with the Services, to
          identify opportunities for improvement, to develop new features, to personalize the User
          experience within the limits permitted by Applicable Law, and to measure the
          effectiveness of communications and initiatives.
        </P>
        <H3>6.4 Communications and Marketing</H3>
        <P>
          We use Personal Information to send transactional communications, service announcements,
          security notifications, policy updates, event invitations, and, where permitted, marketing
          communications relevant to your business interests. You may opt out of marketing
          communications at any time.
        </P>
        <H3>6.5 Compliance, Internal Administration, and Platform Performance</H3>
        <P>
          We use Personal Information to comply with legal and regulatory obligations, respond to
          lawful requests, enforce our agreements, protect the integrity of the Platform, plan
          capacity, monitor performance, and administer our internal operations, including
          governance, risk, and audit functions.
        </P>
        <H3>6.6 Artificial Intelligence and Model Improvement</H3>
        <P>
          Where applicable and expressly permitted by the applicable customer agreement or by the
          User&rsquo;s consent, we may use certain information to develop, evaluate, and improve
          machine learning and artificial intelligence functionality, subject to appropriate
          safeguards described in Section 21.
        </P>
      </>
    ),
  },
  {
    id: "payments",
    number: 7,
    title: "Payment Processing",
    body: (
      <>
        <P>
          Payments for the Services are processed by qualified third-party payment providers that
          maintain compliance with the Payment Card Industry Data Security Standard (PCI DSS) and
          equivalent frameworks. The Company does not receive or store full payment card numbers
          or card verification values in a readable form; instead, the Company receives tokens,
          transaction identifiers, and limited metadata (such as the last four digits of a card
          number and its expiration date) necessary to manage subscriptions, recognize returning
          customers, and support customer service.
        </P>
        <P>
          For recurring subscriptions, payment information is retained by the payment provider for
          the duration of the subscription and any subsequent renewal cycles, and additional
          information (such as invoices, tax records, and transaction logs) is retained by the
          Company for the periods required by tax, accounting, audit, and consumer protection
          laws. The Company applies commercially reasonable measures to ensure that pricing, tax
          treatment, refunds, and chargebacks are handled in a transparent and lawful manner.
        </P>
        <Callout variant="info" title="Chargebacks and Refunds">
          Where a chargeback, refund, or billing dispute occurs, we may process additional
          information necessary to investigate the matter, communicate with the relevant payment
          network or issuing bank, and comply with our contractual and regulatory obligations.
        </Callout>
      </>
    ),
  },
  {
    id: "cookies",
    number: 8,
    title: "Cookies and Tracking Technologies",
    body: (
      <>
        <P>
          The Company uses Cookies and similar technologies to operate, secure, personalize, and
          measure the performance of the Services. The following subsections describe the primary
          categories of Cookies used.
        </P>
        <H3>8.1 Essential Cookies</H3>
        <P>
          Essential Cookies are strictly necessary for the operation of the Services, including
          authenticating Users, maintaining sessions, remembering security-related preferences,
          and enabling core functionality. These Cookies cannot be disabled without materially
          impairing the availability of the Services.
        </P>
        <H3>8.2 Functional Cookies</H3>
        <P>
          Functional Cookies remember choices you make, such as language, region, and interface
          preferences, to provide a more consistent and personalized experience.
        </P>
        <H3>8.3 Performance and Analytics Cookies</H3>
        <P>
          Performance and analytics Cookies allow us and our analytics providers to understand how
          the Services are used in aggregate, identify usability issues, and improve product
          quality.
        </P>
        <H3>8.4 Advertising Cookies, Pixels, and SDKs</H3>
        <P>
          Where used, advertising Cookies, tracking pixels, web beacons, and software development
          kits allow us and our advertising partners to measure the effectiveness of campaigns,
          limit the number of times a User sees an advertisement, and, where permitted, deliver
          more relevant advertising.
        </P>
        <H3>8.5 Local and Session Storage</H3>
        <P>
          The Platform may use local storage and session storage to persist user interface state,
          cache configuration values, and reduce the need for repeated network requests.
        </P>
        <H3>8.6 Managing Cookies</H3>
        <P>
          Most modern browsers allow you to view, manage, delete, and block Cookies through their
          settings. Where required by Applicable Law, we provide a Cookie preference mechanism
          that allows you to accept or reject non-essential Cookies. Disabling certain Cookies may
          affect the functionality of the Services.
        </P>
      </>
    ),
  },
  {
    id: "analytics",
    number: 9,
    title: "Analytics",
    body: (
      <>
        <P>
          The Company relies on analytics providers to help us measure and understand usage of the
          Services, evaluate the effectiveness of features, monitor platform health, and inform
          our product and business decisions. Analytics providers may collect information such as
          pages viewed, session duration, referring URL, approximate location, device
          characteristics, and events triggered within the Services.
        </P>
        <P>
          Where practical, we configure analytics providers to process data on an aggregated or
          pseudonymized basis and enter into contractual arrangements that limit their use of
          Personal Information to the purposes we authorize. Aggregated statistics may be shared
          publicly or with business partners; such statistics do not identify any individual.
        </P>
      </>
    ),
  },
  {
    id: "marketing",
    number: 10,
    title: "Marketing Communications",
    body: (
      <>
        <P>
          Subject to Applicable Law and your communication preferences, the Company may send
          newsletters, product announcements, event invitations, educational content, and other
          promotional communications by email, SMS, in-app notification, or other channels. We
          also send transactional and administrative communications regarding your Account,
          subscriptions, security, and legal notices; you cannot opt out of such communications
          while you maintain an active Account.
        </P>
        <P>
          You may opt out of marketing communications at any time by using the unsubscribe
          mechanism included in the relevant communication, by updating your communication
          preferences within the Services, or by contacting us using the details provided in
          Section 29. We honor opt-out requests promptly and in accordance with Applicable Law.
        </P>
      </>
    ),
  },
  {
    id: "third-parties",
    number: 11,
    title: "Third-Party Services",
    body: (
      <>
        <P>
          The Company relies on qualified Third Parties to help deliver, secure, and improve the
          Services. Categories of Third Parties include cloud infrastructure providers, payment
          processors, email and SMS delivery providers, authentication and identity providers,
          customer relationship management systems, customer support platforms, analytics
          providers, mapping and geolocation providers, monitoring and observability providers,
          fraud prevention services, and providers of application programming interfaces used to
          deliver specific features.
        </P>
        <P>
          Third Parties are engaged only where they can demonstrate appropriate technical and
          organizational measures to protect Personal Information. Where required, we enter into
          data processing agreements, standard contractual clauses, or equivalent instruments to
          govern the processing of Personal Information by such Third Parties.
        </P>
      </>
    ),
  },
  {
    id: "sharing",
    number: 12,
    title: "Sharing and Disclosure",
    body: (
      <>
        <P>
          The Company does not sell Personal Information in the traditional commercial sense of
          the word. We share Personal Information only in the circumstances described below and
          only to the extent necessary for the applicable purpose.
        </P>
        <H3>12.1 Service Providers, Vendors, and Contractors</H3>
        <P>
          We share Personal Information with service providers, vendors, and contractors that
          perform services on our behalf, including hosting, storage, analytics, payment
          processing, communications, support, security, and professional services. Such parties
          are contractually obligated to process Personal Information only in accordance with our
          instructions and Applicable Law.
        </P>
        <H3>12.2 Affiliates</H3>
        <P>
          We may share Personal Information with our Affiliates for purposes consistent with this
          Policy, including centralized administration, security operations, and customer
          management.
        </P>
        <H3>12.3 Corporate Transactions</H3>
        <P>
          In the event of a merger, acquisition, financing, reorganization, bankruptcy,
          receivership, sale of assets, or transition of services to another provider, Personal
          Information may be transferred to a successor entity, subject to appropriate
          confidentiality and continuity commitments.
        </P>
        <H3>12.4 Legal, Regulatory, and Government Requests</H3>
        <P>
          We may disclose Personal Information in response to lawful requests from public
          authorities, including to meet national security, law enforcement, or judicial
          requirements, and to comply with subpoenas, court orders, and other legal process. We
          evaluate such requests carefully and, where legally permissible, notify the affected
          Customer.
        </P>
        <H3>12.5 Fraud Prevention, Security, and Emergency Situations</H3>
        <P>
          We may disclose Personal Information to detect, investigate, or prevent fraud, security
          incidents, or other unlawful activity; to enforce our agreements; to protect the rights,
          property, or safety of the Company, our Users, or the public; and to address emergency
          situations involving a risk of harm.
        </P>
      </>
    ),
  },
  {
    id: "international-transfers",
    number: 13,
    title: "International Data Transfers",
    body: (
      <>
        <P>
          The Company operates globally, and Personal Information may be transferred to, stored
          in, and processed in countries other than the country in which it was collected. These
          countries may have data protection laws that differ from those of your country. Where
          required by Applicable Law, we implement appropriate safeguards for such transfers,
          including standard contractual clauses approved by competent authorities, binding
          corporate rules, adequacy decisions, or other lawful transfer mechanisms.
        </P>
        <P>
          The Company evaluates the laws and practices of the destination country and, where
          necessary, implements supplementary technical, organizational, and contractual measures
          to ensure a level of protection essentially equivalent to that of the country of origin.
        </P>
      </>
    ),
  },
  {
    id: "security",
    number: 14,
    title: "Data Security",
    body: (
      <>
        <P>
          The Company maintains a comprehensive information security program designed to protect
          the confidentiality, integrity, and availability of Personal Information. The program
          includes administrative, technical, and physical safeguards proportionate to the nature
          and sensitivity of the data processed.
        </P>
        <P>
          Administrative safeguards include information security policies, security awareness
          training, background checks where permitted, role-based access controls, segregation of
          duties, and vendor risk management. Technical safeguards include encryption of data in
          transit using Transport Layer Security (TLS), encryption of data at rest using
          industry-standard algorithms, key management, network segmentation, firewalls, intrusion
          detection, endpoint protection, secure development practices, code review, dependency
          management, vulnerability scanning, penetration testing, multi-factor authentication,
          centralized logging, and continuous monitoring. Physical safeguards, whether maintained
          directly or through cloud infrastructure providers, include controlled facility access,
          environmental controls, and secure media handling.
        </P>
        <P>
          The Company maintains a business continuity and disaster recovery program that includes
          regular backups, tested recovery procedures, and defined recovery objectives.
          Notwithstanding these measures, no method of transmission over the Internet and no
          method of electronic storage is completely secure, and the Company cannot guarantee
          absolute security.
        </P>
        <Callout variant="warning" title="No Absolute Security">
          While we invest significantly in the security of the Platform, no online service can
          guarantee complete security. You are responsible for maintaining the confidentiality of
          your credentials and for promptly notifying us of any suspected unauthorized access to
          your Account.
        </Callout>
      </>
    ),
  },
  {
    id: "retention",
    number: 15,
    title: "Data Retention",
    body: (
      <>
        <P>
          The Company retains Personal Information for as long as necessary to fulfill the
          purposes for which it was collected, to comply with legal and regulatory obligations, to
          resolve disputes, to enforce agreements, and to protect legitimate business interests.
          Retention periods vary by category of data, applicable legal requirements, and the
          context of collection.
        </P>
        <P>
          Account information is generally retained for the duration of the Account and for a
          reasonable period thereafter. Financial records are retained for the periods required
          under applicable tax, accounting, and audit laws. Support and communication records are
          retained for the periods necessary to provide ongoing support, investigate recurring
          issues, and manage the customer relationship. Security logs are retained for periods
          consistent with information security best practices and applicable regulatory
          requirements.
        </P>
        <P>
          Upon expiration of the applicable retention period, or upon a valid request to delete
          Personal Information where required by Applicable Law, we securely delete, destroy, or
          irreversibly anonymize the relevant information, unless further retention is required by
          law or is necessary for the establishment, exercise, or defense of legal claims.
        </P>
      </>
    ),
  },
  {
    id: "user-rights",
    number: 16,
    title: "User Rights",
    body: (
      <>
        <P>
          Depending on your jurisdiction and the applicable legal basis for processing, you may
          have certain rights in respect of your Personal Information. The Company respects these
          rights and provides mechanisms to exercise them, subject to reasonable verification and
          the limitations set forth by Applicable Law.
        </P>
        <H3>16.1 Right of Access</H3>
        <P>
          You have the right to obtain confirmation as to whether we process Personal Information
          about you and, where that is the case, access to that information and certain related
          details.
        </P>
        <H3>16.2 Right to Correction</H3>
        <P>
          You have the right to request the correction of inaccurate or incomplete Personal
          Information.
        </P>
        <H3>16.3 Right to Deletion</H3>
        <P>
          You have the right, under certain conditions, to request the deletion of Personal
          Information that we hold about you.
        </P>
        <H3>16.4 Right to Portability</H3>
        <P>
          Where processing is based on consent or the performance of a contract and is carried out
          by automated means, you may have the right to receive certain Personal Information in a
          structured, commonly used, and machine-readable format.
        </P>
        <H3>16.5 Right to Restrict Processing and Right to Object</H3>
        <P>
          You have the right, under certain conditions, to request that we restrict the processing
          of your Personal Information or to object to processing that is based on our legitimate
          interests.
        </P>
        <H3>16.6 Right to Withdraw Consent and Right to Appeal</H3>
        <P>
          Where processing is based on consent, you may withdraw such consent at any time. Where
          we decline to take action in response to a rights request, you may have the right to
          appeal our decision or to lodge a complaint with a competent supervisory authority.
        </P>
        <H3>16.7 Verification and Response Timelines</H3>
        <P>
          To protect the confidentiality of Personal Information, we will take reasonable steps to
          verify your identity before responding to a rights request. We will respond to requests
          within the timelines required by Applicable Law, which are generally between thirty (30)
          and forty-five (45) days, subject to extension in complex cases.
        </P>
      </>
    ),
  },
  {
    id: "ccpa",
    number: 17,
    title: "California Privacy Rights (CCPA/CPRA)",
    body: (
      <>
        <P>
          If you are a California resident, the California Consumer Privacy Act, as amended by the
          California Privacy Rights Act (collectively, the &ldquo;CCPA&rdquo;), provides you with
          specific rights regarding your Personal Information. These rights include the right to
          know the categories and specific pieces of Personal Information collected, the right to
          delete Personal Information subject to certain exceptions, the right to correct
          inaccurate Personal Information, the right to opt out of the sale or sharing of Personal
          Information, the right to limit the use of sensitive Personal Information, and the right
          to non-discrimination for exercising these rights.
        </P>
        <P>
          The Company does not sell Personal Information as that term is commonly understood. To
          the extent any processing activity falls within the CCPA definitions of &ldquo;sale&rdquo;
          or &ldquo;sharing,&rdquo; we provide the required disclosures and opt-out mechanisms.
        </P>
      </>
    ),
  },
  {
    id: "gdpr",
    number: 18,
    title: "European Privacy Rights (GDPR)",
    body: (
      <>
        <P>
          If you are located in the European Economic Area, the United Kingdom, or Switzerland, you
          benefit from the rights and protections provided by the General Data Protection
          Regulation and equivalent local legislation. In addition to the rights described in
          Section 16, you have the right to lodge a complaint with a competent supervisory
          authority in your country of residence, place of work, or place of the alleged
          infringement.
        </P>
        <P>
          Where the Company acts as a data controller, we determine the purposes and means of the
          processing of your Personal Information. Where the Company acts as a data processor on
          behalf of a Customer, we process Personal Information in accordance with the
          Customer&rsquo;s documented instructions and the applicable data processing agreement.
        </P>
      </>
    ),
  },
  {
    id: "other-laws",
    number: 19,
    title: "Other International Privacy Laws",
    body: (
      <>
        <P>
          The Company respects privacy laws in the jurisdictions in which it operates or offers
          the Services, including, without limitation, applicable laws in Canada, Brazil, the
          United Kingdom, Australia, Japan, and other jurisdictions. Where such laws provide
          additional rights or impose additional obligations, we will implement processes to
          comply with them and, where appropriate, publish supplemental notices to describe
          jurisdiction-specific practices.
        </P>
      </>
    ),
  },
  {
    id: "children",
    number: 20,
    title: "Children's Privacy",
    body: (
      <>
        <P>
          The Services are not directed to children under the age required by Applicable Law
          (generally, sixteen (16) years of age or the equivalent age in the relevant
          jurisdiction), and we do not knowingly collect Personal Information from such children.
          If we become aware that Personal Information of a child has been collected without the
          appropriate parental consent, we will take reasonable steps to delete such information
          as promptly as reasonably practicable.
        </P>
      </>
    ),
  },
  {
    id: "ai",
    number: 21,
    title: "Artificial Intelligence & Automated Decision Making",
    body: (
      <>
        <P>
          The Company may use artificial intelligence and machine learning technologies to
          improve the Services, provide functionality such as recommendations, summaries,
          translations, classification, or search, and enhance operational efficiency. Where the
          Company uses such technologies, we implement safeguards designed to protect Personal
          Information, including limiting the categories of data used, applying appropriate
          contractual restrictions, and evaluating outputs for accuracy and fairness.
        </P>
        <P>
          The Company does not make solely automated decisions that produce legal or similarly
          significant effects concerning you without appropriate human oversight, except where
          expressly authorized by Applicable Law. Where such decisions occur, you may request
          human review, express your point of view, and contest the decision, subject to the
          conditions set forth by Applicable Law.
        </P>
      </>
    ),
  },
  {
    id: "ugc",
    number: 22,
    title: "User Generated Content",
    body: (
      <>
        <P>
          The Services may allow you to create, upload, or share Content. You retain ownership of
          your Content, subject to the license you grant to the Company for the purpose of
          operating and providing the Services as set forth in the applicable customer agreement.
          You are responsible for the Content you submit, including ensuring that you have the
          necessary rights and consents to share such Content and that it complies with Applicable
          Law and our acceptable use policies.
        </P>
        <P>
          The Company may, but is not obligated to, monitor, review, or remove Content that
          violates the applicable terms, is unlawful, or is otherwise objectionable.
        </P>
      </>
    ),
  },
  {
    id: "account-security",
    number: 23,
    title: "Account Security Responsibilities",
    body: (
      <>
        <P>
          You are responsible for maintaining the security of your Account and the credentials
          used to access the Services, including passwords, tokens, and multi-factor
          authentication devices. You should not share your credentials with any other individual,
          and you should promptly notify the Company of any suspected unauthorized access to your
          Account, loss of credentials, or other security incident affecting your Account.
        </P>
      </>
    ),
  },
  {
    id: "business-transfers",
    number: 24,
    title: "Business Transfers",
    body: (
      <>
        <P>
          In the event of a merger, acquisition, financing, restructuring, sale of all or
          substantially all of our assets, bankruptcy, receivership, or similar transaction,
          Personal Information may be transferred to the successor or acquiring entity. Any such
          transfer will be conducted in a manner consistent with this Policy and Applicable Law,
          and, where required, we will provide notice of any material changes to the handling of
          Personal Information.
        </P>
      </>
    ),
  },
  {
    id: "breach",
    number: 25,
    title: "Data Breach Notification",
    body: (
      <>
        <P>
          In the event of a Personal Information breach that is reasonably likely to result in a
          risk to the rights and freedoms of affected individuals, we will investigate the
          incident, take appropriate remedial measures, and notify competent supervisory
          authorities and affected individuals as required by Applicable Law. Notifications will
          include, where available, the nature of the incident, the categories and approximate
          number of affected individuals, the likely consequences, and the measures taken or
          proposed to address the incident and mitigate its effects.
        </P>
      </>
    ),
  },
  {
    id: "dnt",
    number: 26,
    title: "Do Not Track Signals",
    body: (
      <>
        <P>
          Some browsers offer a &ldquo;Do Not Track&rdquo; setting that signals to websites that
          the User does not wish to be tracked. There is currently no widely accepted industry
          standard for how to respond to such signals, and the Services may not respond to them.
          We nonetheless honor other opt-out mechanisms, including Cookie preference tools and
          marketing opt-outs, as described in this Policy.
        </P>
      </>
    ),
  },
  {
    id: "accessibility",
    number: 27,
    title: "Accessibility",
    body: (
      <>
        <P>
          The Company is committed to providing a Platform that is accessible to the broadest
          possible audience, including individuals with disabilities. We work to align the
          Services with recognized accessibility standards and welcome feedback on how we can
          improve. If you require this Policy in an alternative format or need assistance to
          access any part of the Services, please contact us using the details in Section 29.
        </P>
      </>
    ),
  },
  {
    id: "changes",
    number: 28,
    title: "Changes to this Privacy Policy",
    body: (
      <>
        <P>
          We may update this Policy from time to time to reflect changes in our practices, the
          Services, Applicable Law, or industry standards. When we make material changes, we will
          update the &ldquo;Last Updated&rdquo; date at the top of this Policy and, where
          appropriate, provide additional notice through the Services or by other reasonable
          means. Your continued use of the Services following the effective date of any updated
          Policy constitutes your acceptance of the updated terms.
        </P>
        <P>
          We encourage you to review this Policy periodically to remain informed about our
          information practices and the choices available to you.
        </P>
      </>
    ),
  },
  {
    id: "contact",
    number: 29,
    title: "Contact Information",
    body: (
      <>
        <P>
          If you have any questions, concerns, or requests regarding this Policy or the
          Company&rsquo;s processing of Personal Information, please contact us using the
          information below. We will make reasonable efforts to respond promptly and, where
          required, within the timelines set forth by Applicable Law.
        </P>
        <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-6 sm:p-8">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">Company</dt>
              <dd className="mt-1 text-base text-foreground">[Company Name]</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">
                Privacy Officer
              </dt>
              <dd className="mt-1 text-base text-foreground">[Name of Privacy Officer]</dd>
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
              <dd className="mt-1 text-base text-foreground">privacy@[company].com</dd>
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
          This Privacy Policy is provided as a general framework and does not constitute legal
          advice. Companies adopting this template should consult qualified legal counsel to
          confirm that its provisions accurately describe their actual data practices and comply
          with all laws applicable to their operations.
        </Callout>
      </>
    ),
  },
];

function PrivacyPage() {
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

      {/* Header */}
      <header className="relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary/50 to-background print:bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:px-8">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-forest">
            <ScrollText className="h-4 w-4" /> Legal · Policy
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-forest-deep sm:text-6xl">
            Privacy Policy
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            This Privacy Policy explains how the Company collects, uses, discloses, retains, and
            safeguards Personal Information across its Platform and Services. It is designed to
            comply with applicable global privacy laws and to reflect widely accepted principles
            of fair information practices.
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
              Jump to Table of Contents
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8 lg:py-16">
        <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
          {/* Sticky TOC */}
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

          {/* Content */}
          <main className="min-w-0">
            {/* Print-only TOC */}
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
                  © {new Date().getFullYear()} [Company Name]. All rights reserved. This document
                  was last updated on the date shown at the top of this page.
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
