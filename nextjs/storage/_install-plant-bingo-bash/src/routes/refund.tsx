import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import {
  AlertTriangle,
  Info,
  Shield,
  Scale,
  Printer,
  Gavel,
  Receipt,
  CreditCard,
  CalendarX,
  LifeBuoy,
  Clock,
  Ban,
} from "lucide-react";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Company" },
      {
        name: "description",
        content:
          "Enterprise-grade Refund Policy governing purchases, cancellations, credits, and chargebacks across the Company's Platform, Website, and Services.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: RefundPage,
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

function RefundTimeline() {
  const steps = [
    {
      icon: <CalendarX className="h-5 w-5" />,
      label: "8+ Days Before",
      status: "Refund Eligible",
      tone: "bg-lime/30 text-forest-deep border-lime/50",
      note: "Cancellations submitted more than seven (7) calendar days before the scheduled event are eligible for review.",
    },
    {
      icon: <Clock className="h-5 w-5" />,
      label: "Within 7 Days",
      status: "No Refunds",
      tone: "bg-tomato/15 text-tomato border-tomato/40",
      note: "Once the event falls inside the seven (7) day window, no refunds are issued for any reason.",
    },
    {
      icon: <Ban className="h-5 w-5" />,
      label: "After Event",
      status: "No Show — No Refund",
      tone: "bg-muted text-muted-foreground border-border",
      note: "No shows, late arrivals, and early departures forfeit the full value of the purchase.",
    },
  ];
  return (
    <div className="my-8 grid gap-4 sm:grid-cols-3 print:break-inside-avoid">
      {steps.map((s) => (
        <div
          key={s.label}
          className={`rounded-2xl border p-5 ${s.tone}`}
        >
          <div className="flex items-center gap-2">
            {s.icon}
            <p className="text-xs font-bold uppercase tracking-widest">{s.label}</p>
          </div>
          <p className="mt-3 font-display text-lg font-bold">{s.status}</p>
          <p className="mt-2 text-xs leading-relaxed opacity-90">{s.note}</p>
        </div>
      ))}
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
          This Refund Policy (the &ldquo;Policy&rdquo;) is issued by the Company and governs all
          refund requests, credits, cancellations, transfers, and chargebacks associated with
          purchases made through the Platform, the Website, or any Services offered by the
          Company. It has been prepared to provide Customers with a transparent, predictable, and
          equitable framework for understanding when refunds are available, how they are
          processed, and what obligations both the Customer and the Company assume when a
          transaction is completed.
        </P>
        <P>
          This Policy operates in conjunction with, and is expressly incorporated by reference
          into, the Company&rsquo;s Terms of Service and Privacy Policy. To the extent that any
          provision of this Policy conflicts with the Terms of Service on matters relating to
          refunds, credits, cancellations, chargebacks, or payment disputes, the provisions of
          this Policy shall control. All other terms, definitions, disclaimers, and limitations
          of liability set forth in the Terms of Service remain in full force and effect and
          apply equally to any transaction addressed by this Policy.
        </P>
        <P>
          By completing a purchase, submitting a registration, reserving inventory, checking out
          on the Website, or otherwise transacting with the Company through any channel, the
          Customer expressly acknowledges that the Customer has read, understood, and accepted
          the terms of this Policy in their entirety. Acceptance is a material condition of every
          transaction; the Company would not accept the Customer&rsquo;s payment or reserve any
          Services without such acceptance.
        </P>
        <P>
          This Policy applies to all Customers regardless of geographic location, method of
          purchase, or category of Service purchased, subject only to any non-waivable consumer
          protection rights conferred by the mandatory laws of the Customer&rsquo;s jurisdiction.
          Where such non-waivable rights exist, they shall apply in addition to, and not in
          derogation of, the terms of this Policy.
        </P>
        <P>
          The Company is committed to operating its refund program with fairness, consistency,
          and transparency. This Policy is intentionally detailed so that every Customer
          understands the rules that will be applied to their transaction before they complete a
          purchase. The Company encourages every Customer to review this Policy carefully and to
          contact customer support with any questions before placing an order.
        </P>
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
          The capitalized terms used throughout this Policy have the meanings set forth below.
          Terms defined in the Terms of Service and not redefined here retain the meaning given
          to them there.
        </P>
        <dl>
          <DefTerm term="Company">
            The legal entity operating the Platform, the Website, and the Services, together with
            its subsidiaries, affiliates, officers, directors, employees, agents, contractors,
            successors, and permitted assigns.
          </DefTerm>
          <DefTerm term="Customer">
            Any natural person or legal entity that purchases, reserves, registers for, or
            otherwise pays for Services, tickets, subscriptions, credits, or any other item made
            available through the Platform.
          </DefTerm>
          <DefTerm term="User">
            Any individual who accesses the Website, the Platform, or the Services, whether or
            not that individual has completed a purchase. A User may or may not be a Customer.
          </DefTerm>
          <DefTerm term="Platform">
            The Company&rsquo;s hosted software, applications, back-end systems, integrations,
            APIs, dashboards, and related infrastructure through which the Services are delivered
            and administered.
          </DefTerm>
          <DefTerm term="Services">
            All products, subscriptions, events, ticketing, registrations, credits, digital
            deliverables, and other offerings made available by the Company, whether provided
            online, in person, or through third-party venues.
          </DefTerm>
          <DefTerm term="Website">
            The public-facing web properties operated by the Company, including all subdomains,
            landing pages, checkout flows, and customer portals through which purchases may be
            initiated.
          </DefTerm>
          <DefTerm term="Event">
            Any scheduled experience, session, program, class, workshop, conference, activity, or
            gathering — virtual, hybrid, or in-person — for which the Company sells access,
            registrations, or tickets.
          </DefTerm>
          <DefTerm term="Ticket">
            A single unit of paid admission or access to an Event, whether delivered digitally
            (including via QR code, barcode, or email) or physically.
          </DefTerm>
          <DefTerm term="Registration">
            The confirmed enrollment of a Customer or attendee in an Event, program, waitlist, or
            reserved capacity slot on the Platform.
          </DefTerm>
          <DefTerm term="Purchase">
            Any completed transaction in which the Customer has authorized payment and the
            Company has issued an order confirmation, whether or not the underlying Service has
            yet been consumed.
          </DefTerm>
          <DefTerm term="Credit">
            A non-cash balance issued by the Company at its discretion, redeemable toward future
            purchases in accordance with the terms under which it was issued.
          </DefTerm>
          <DefTerm term="Refund">
            A return of funds, in whole or in part, to the original payment method used at
            checkout, subject to the eligibility criteria described in this Policy.
          </DefTerm>
          <DefTerm term="Chargeback">
            A payment dispute initiated by the Customer directly with the Customer&rsquo;s card
            issuer or bank, resulting in the reversal of a transaction pending investigation.
          </DefTerm>
          <DefTerm term="Processing Fee">
            The non-refundable surcharge applied to card transactions to offset third-party
            payment processor costs, as further described in Section 7.
          </DefTerm>
          <DefTerm term="Business Day">
            Any day other than a Saturday, Sunday, or nationally recognized public holiday in the
            jurisdiction of the Company&rsquo;s principal place of business.
          </DefTerm>
          <DefTerm term="Cancellation">
            The formal termination of a Purchase, Registration, or Ticket by the Customer or the
            Company, effected in accordance with this Policy.
          </DefTerm>
          <DefTerm term="No Show">
            The failure of a Customer or ticketed attendee to appear at, log into, or otherwise
            participate in an Event for which a Ticket or Registration was issued.
          </DefTerm>
          <DefTerm term="Force Majeure">
            Any event or circumstance beyond the reasonable control of the Company, as further
            described in Section 18.
          </DefTerm>
        </dl>
      </>
    ),
  },
  {
    id: "general-sales-policy",
    number: 3,
    title: "General Sales Policy",
    body: (
      <>
        <P>
          Every Purchase made through the Platform triggers the immediate allocation of
          operational, logistical, financial, and human resources. When a Customer completes
          checkout, the Company commits inventory, reserves capacity, and initiates a series of
          downstream obligations to venues, suppliers, staff, instructors, licensors, technology
          providers, and other third parties. These commitments are made in reliance on the
          Customer&rsquo;s Purchase and cannot be readily reversed once made.
        </P>
        <P>
          Ticket Purchases reserve seating or admission slots that are then unavailable to other
          Customers. Even where an Event is not sold out, each Ticket sold materially affects
          capacity planning, staffing ratios, catering counts, materials procurement, and venue
          configuration. The Company sets pricing and inventory availability in reliance on the
          binding nature of Purchases; late cancellations therefore impose costs that cannot be
          recovered by re-selling the released inventory.
        </P>
        <P>
          Purchases also reserve operational resources such as instructor time, live production
          crews, moderators, technical support personnel, streaming bandwidth, and administrative
          capacity. Many of these resources are contracted in fixed blocks and cannot be scaled
          down after a Customer has committed. For these reasons, Customers are strongly
          encouraged to review every element of a Purchase — including date, time, quantity,
          participants, add-ons, and any applicable eligibility requirements — carefully before
          proceeding to checkout.
        </P>
        <P>
          Once payment has been authorized and an order confirmation has been generated, the
          Purchase becomes a legally binding transaction between the Customer and the Company,
          enforceable in accordance with the Terms of Service, this Policy, and applicable law.
          Requests to modify or cancel a Purchase after that point are governed exclusively by
          the eligibility rules and procedures described in this Policy.
        </P>
        <Callout variant="info" title="Review before you buy">
          The Company recommends confirming attendee details, dates, and quantities before
          clicking &ldquo;Place Order.&rdquo; Because Purchases reserve real capacity and
          resources, cancellation eligibility is time-sensitive and cannot be extended as a
          courtesy.
        </Callout>
      </>
    ),
  },
  {
    id: "ticket-sales",
    number: 4,
    title: "Ticket Sales",
    body: (
      <>
        <P>
          All Tickets are sold exclusively through the Platform and the Website. The Company does
          not sell Tickets through door sales, cash transactions, or unaffiliated third parties
          unless expressly designated in writing. Any Ticket obtained through unauthorized
          channels is null and void and confers no right of admission or refund.
        </P>
        <P>
          Online Registration is the sole mechanism through which a Customer may guarantee
          inventory. Adding a Ticket to a cart, initiating checkout, or beginning a Registration
          does not, by itself, reserve inventory; a reservation is created only upon successful
          authorization of payment and issuance of an order confirmation. Until that moment,
          inventory remains available to other Customers on a first-come, first-served basis.
        </P>
        <P>
          The Company cannot and does not guarantee the availability of any Ticket, Event, or
          Registration without payment. Pricing, availability, and Event details displayed on
          the Website are subject to change at any time and are not binding until a Purchase is
          confirmed. The Company reserves the right to correct pricing errors, cancel obvious
          mispricings, and refund affected Customers in accordance with this Policy.
        </P>
        <P>
          Upon successful payment authorization, the Company will generate and deliver an order
          confirmation, together with any applicable digital assets, including QR codes,
          barcodes, calendar files, access links, or downloadable Tickets. These confirmations
          are transmitted automatically and are typically delivered within minutes of checkout.
          Customers are responsible for ensuring that the email address provided at checkout is
          accurate, monitored, and configured to accept messages from the Company.
        </P>
        <P>
          A Ticket is considered validly issued upon transmission of the confirmation email,
          regardless of whether the Customer has opened, downloaded, or otherwise interacted
          with the message. Failure to receive or retrieve a confirmation does not entitle the
          Customer to a Refund, but the Company will make reasonable efforts, through customer
          support, to re-issue lost or misdirected confirmations.
        </P>
      </>
    ),
  },
  {
    id: "refund-eligibility",
    number: 5,
    title: "Refund Eligibility",
    body: (
      <>
        <RefundTimeline />
        <P>
          Customers may request a Refund only if the Cancellation is submitted{" "}
          <strong>more than seven (7) calendar days</strong> before the scheduled start of the
          applicable Event, session, or Service delivery window. Refund requests submitted at any
          time within the seven (7) day window prior to the scheduled Event, or after the Event
          has occurred, are not eligible under this Policy, without exception except as
          expressly provided in Sections 8 (Event Cancellations), 15 (Exception Requests), or as
          required by mandatory applicable law.
        </P>
        <P>
          The seven (7) day eligibility period is measured in calendar days, inclusive of
          weekends and public holidays, and is calculated based on the local time and date of
          the Event as displayed on the Customer&rsquo;s order confirmation. A Cancellation is
          considered &ldquo;submitted&rdquo; on the date the Company receives a properly
          formatted request through the channels described in Section 10; requests submitted
          through unofficial channels, informal messages, or third parties are not deemed
          received until they have been routed to and acknowledged by the Company&rsquo;s
          customer support team.
        </P>
        <P>
          This eligibility window exists because the Company incurs a substantial and largely
          irreversible cost structure in the days leading up to any Event. During the final
          week before an Event, the Company finalizes orders with venues, caterers, printers,
          logistics providers, and staffing agencies; releases production runbooks and
          seating charts; procures perishable inventory; confirms guaranteed headcounts with
          third parties; and commits staff time that cannot be redeployed on short notice.
          Cancellations received inside this window generate costs that cannot be recovered by
          re-selling the released inventory, because there is insufficient time to market the
          released capacity to new Customers.
        </P>
        <P>
          The Company&rsquo;s ability to deliver high-quality Events at accessible price points
          depends on the reliability of confirmed Purchases. If cancellations were permitted on
          short notice, the Company would be required to either raise prices across the board to
          absorb the resulting losses or reduce the scope and quality of its Events. The seven
          (7) day window represents a balanced compromise between Customer flexibility and the
          Company&rsquo;s operational integrity.
        </P>
        <P>
          Refund requests that satisfy the eligibility criteria will be reviewed within a
          reasonable time, typically within five (5) Business Days of receipt. The Company
          reserves the right to request additional information reasonably necessary to verify
          the identity of the requesting Customer, the authenticity of the underlying Purchase,
          and the absence of fraud, chargeback abuse, or other disqualifying conduct.
        </P>
      </>
    ),
  },
  {
    id: "no-refunds-within-seven-days",
    number: 6,
    title: "No Refunds Within Seven (7) Days",
    body: (
      <>
        <Callout variant="warning" title="Strict Seven-Day Cutoff">
          Once a Purchase enters the final seven (7) calendar days before the scheduled Event,
          it becomes strictly non-refundable. This rule is applied uniformly and is not subject
          to modification on a case-by-case basis.
        </Callout>
        <P>
          No Refunds will be granted for Cancellations submitted within seven (7) calendar days
          of the scheduled Event, regardless of the reason for the Cancellation, and regardless
          of whether the Customer ultimately attends. The Customer expressly acknowledges and
          agrees that this restriction is a material term of the Purchase and is essential to the
          Company&rsquo;s ability to operate.
        </P>
        <P>
          Circumstances that do <strong>not</strong> qualify a Customer for a Refund within the
          seven (7) day window include, without limitation:
        </P>
        <ul className="mt-4 list-disc space-y-2 pl-6 leading-[1.85] text-foreground/85 marker:text-forest">
          <li>Change of plans, calendar conflicts, or scheduling changes on the part of the Customer or any attendee;</li>
          <li>Illness, injury, or medical condition of the Customer, any attendee, or any related party, whether or not documented;</li>
          <li>Adverse weather conditions of any kind, including but not limited to rain, snow, extreme temperatures, or storms that do not result in the Company cancelling the Event;</li>
          <li>Transportation issues, including flight delays or cancellations, missed connections, road closures, ride-share unavailability, and public transit disruptions;</li>
          <li>Scheduling conflicts with work, school, family obligations, religious observances, or other personal commitments;</li>
          <li>Personal, family, or professional emergencies of any nature;</li>
          <li>Failure to attend the Event for any reason not attributable to the Company;</li>
          <li>Arriving late to the Event, missing check-in, or failing to complete any prerequisite steps;</li>
          <li>Leaving the Event early, whether voluntarily or involuntarily;</li>
          <li>Choosing not to participate in some or all of the Event once on site;</li>
          <li>Dissatisfaction with the Event experience, content, venue, staff, other attendees, or any element that the Company has delivered substantially as described.</li>
        </ul>
        <P>
          This policy is necessary because the Company&rsquo;s operational expenses during the
          final week before an Event are fixed and non-recoverable. Venue rentals, staffing
          contracts, insurance premiums, licensing fees, equipment rentals, catering minimums,
          production costs, and marketing spend are all committed on the basis of confirmed
          Ticket sales. When a Customer cancels within the seven (7) day window, the Company
          continues to incur those costs but loses the corresponding revenue, and cannot resell
          the released inventory in time to make the Customer whole.
        </P>
        <P>
          The Company does not make individual exceptions to this policy on the basis of hardship
          narratives, third-party recommendations, or the perceived reasonableness of the
          Customer&rsquo;s circumstances. Applying the policy uniformly is essential to
          fairness across the Customer base, because any exception granted to one Customer
          effectively raises costs for every other Customer who paid in full and honored their
          commitment.
        </P>
      </>
    ),
  },
  {
    id: "processing-fees",
    number: 7,
    title: "Credit Card Processing Fees",
    body: (
      <>
        <P>
          A Credit Card Processing Fee equal to three and one-half percent (3.5%) of the
          transaction total is added to every Purchase completed using a credit card, debit card,
          or comparable card-based payment method. The Processing Fee is calculated on the
          Ticket price, applicable taxes, and any add-ons included in the order, and is
          displayed as a separate line item on the checkout screen before the Customer confirms
          payment.
        </P>
        <P>
          The Processing Fee is disclosed transparently at checkout, and no Purchase is completed
          until the Customer has been given the opportunity to review the full order total,
          including the Processing Fee, and to affirmatively authorize payment. By completing
          checkout, the Customer acknowledges that the Processing Fee has been clearly presented
          and expressly consents to its addition to the transaction.
        </P>
        <P>
          The Processing Fee exists solely to offset the transaction, interchange, network, and
          gateway fees charged to the Company by its third-party payment processors, card
          networks, and issuing banks. These third-party fees are assessed on the gross
          transaction amount and are payable by the Company regardless of whether the underlying
          Purchase is later refunded. The Processing Fee is not marketed as, and does not
          function as, a source of ticket revenue; it is a pass-through charge that reimburses
          the Company for costs it does not control and cannot avoid.
        </P>
        <P>
          <strong>Processing Fees are non-refundable in all circumstances.</strong> Even where a
          Refund is otherwise granted under this Policy — whether because a Customer cancelled
          within the eligibility window, the Company cancelled an Event, or an exception request
          was approved — the Processing Fee is retained. This is because payment processors and
          card networks do not return their portion of the fee to the Company when a transaction
          is reversed; the Company itself continues to bear that cost.
        </P>
        <P>
          By way of illustration, if a Customer purchases a Ticket priced at one hundred dollars
          (US$100.00) plus a Processing Fee of three dollars and fifty cents (US$3.50), and the
          Customer is later granted a Refund of the Ticket, the Company will return the one
          hundred dollars (US$100.00) to the original payment method, and the three dollars and
          fifty cents (US$3.50) Processing Fee will be retained to cover the Company&rsquo;s
          non-recoverable third-party costs.
        </P>
        <Callout variant="legal" title="Pass-Through Cost">
          The Processing Fee is not revenue to the Company. It reimburses the Company for
          third-party payment processing costs that are charged whether or not a transaction is
          later refunded.
        </Callout>
      </>
    ),
  },
  {
    id: "event-cancellations",
    number: 8,
    title: "Event Cancellations by the Company",
    body: (
      <>
        <P>
          In the event that the Company cancels an Event in its entirety, and the Event is not
          rescheduled to a mutually acceptable alternative date, the Company will, at its
          discretion and based on the totality of the circumstances, offer affected Customers
          one or more of the following remedies: (i) a Refund of the Ticket price paid, less any
          non-refundable Processing Fees; (ii) a Credit of equivalent value redeemable toward
          future Purchases; or (iii) a complimentary transfer of the Registration to a comparable
          Event of substantially similar scope and value.
        </P>
        <P>
          Where the Company elects to issue Refunds for a cancelled Event, such Refunds will be
          initiated within a commercially reasonable time following the announcement of the
          cancellation, generally within ten (10) to fifteen (15) Business Days, and will be
          returned to the original payment method used at checkout. Actual receipt of funds by
          the Customer depends on the Customer&rsquo;s bank or card issuer and is outside the
          Company&rsquo;s control.
        </P>
        <P>
          The Company retains sole discretion to determine which remedy or combination of
          remedies is appropriate for a given cancellation, taking into account factors such as
          the reason for the cancellation, the availability of substitute Events, the
          proportionality of costs already incurred, and any applicable insurance or force
          majeure provisions. No Customer is entitled to any specific remedy or to a cash Refund
          in preference to a Credit or transfer unless required by mandatory applicable law.
        </P>
        <P>
          Where an Event is cancelled or curtailed as a result of circumstances beyond the
          Company&rsquo;s reasonable control — including without limitation those described in
          Section 18 (Force Majeure) — the Company&rsquo;s obligations are further limited, and
          the Company may in its discretion offer Credits or transfers in lieu of cash Refunds,
          or, where cost recovery is not feasible, offer no Refund at all to the extent permitted
          by applicable law. This allocation of risk is a material term of every Purchase.
        </P>
      </>
    ),
  },
  {
    id: "event-rescheduling",
    number: 9,
    title: "Event Rescheduling",
    body: (
      <>
        <P>
          The Company reserves the right to reschedule any Event, in whole or in part, for
          operational, safety, logistical, licensing, weather-related, or other reasons the
          Company deems appropriate. Where an Event is rescheduled, all Tickets and Registrations
          issued for the original Event will automatically transfer to the new date and time,
          without any action required on the part of the Customer, and will remain valid for
          admission on the same terms as originally purchased.
        </P>
        <P>
          Customers who are unable to attend the rescheduled Event may request one of the
          following options, subject to review and approval by the Company: (i) transfer of the
          Registration to another Event of comparable value; (ii) issuance of a Credit valid for
          a defined redemption period toward future Purchases; or (iii) in appropriate
          circumstances, a Refund of the Ticket price paid, less any non-refundable Processing
          Fees and administrative costs.
        </P>
        <P>
          Requests to elect an alternative remedy following a rescheduling must be submitted
          within fourteen (14) calendar days after the Company&rsquo;s official notice of the
          new date. Requests received after that period will be handled in accordance with the
          standard eligibility rules in Section 5, measured against the newly scheduled Event
          date. The Company&rsquo;s determination of an appropriate remedy is final except where
          mandatory applicable law provides otherwise.
        </P>
        <P>
          The Company will make reasonable efforts to communicate any rescheduling decision as
          promptly as circumstances allow, using the email address associated with the
          Customer&rsquo;s account. Customers are responsible for maintaining current contact
          information and for monitoring the inbox associated with their Purchase.
        </P>
      </>
    ),
  },
  {
    id: "customer-cancellations",
    number: 10,
    title: "Customer Cancellations",
    body: (
      <>
        <P>
          Cancellation requests must be submitted in writing through one of the official channels
          designated by the Company, which include (i) the Customer&rsquo;s account dashboard on
          the Platform, where a self-service cancellation option is available for eligible
          Purchases; (ii) email to the customer support address published on the Website; and
          (iii) any dedicated cancellation form provided by the Company. Requests submitted
          through social media, direct message to individual staff members, or informal
          conversations are not considered valid Cancellations and will not be processed.
        </P>
        <P>
          Each Cancellation request must include, at a minimum, the Customer&rsquo;s full name,
          the email address used at checkout, the order or confirmation number, the Event name
          and date, and a clear statement of the requested action. The Company may, in its sole
          discretion, require additional information to verify the identity of the requesting
          party and to confirm that the request is authorized by the account holder.
        </P>
        <P>
          Eligibility for a Refund is determined by reference to the timestamp at which a
          properly formatted request is received by the Company, not the timestamp at which the
          Customer intended, drafted, or attempted to send the request. Customers are strongly
          encouraged to submit Cancellation requests as early as possible to avoid inadvertent
          exposure to the seven (7) day cutoff.
        </P>
        <P>
          Once a Cancellation request is received, the Company will acknowledge receipt within
          a reasonable time and will complete its eligibility review within five (5) Business
          Days, subject to volume, holidays, and any additional verification required. Upon
          completion of review, the Company will issue a written determination confirming
          whether the request has been approved, declined, or approved subject to conditions
          (such as issuance of a Credit in lieu of a cash Refund).
        </P>
        <P>
          Approved Cancellations are final. Once a Refund or Credit has been issued and
          confirmed, the underlying Purchase is void and cannot be reinstated. Customers who
          wish to attend a subsequent Event must complete a new Purchase at then-current pricing
          and availability.
        </P>
      </>
    ),
  },
  {
    id: "ticket-transfers",
    number: 11,
    title: "Transfer of Tickets",
    body: (
      <>
        <P>
          Where permitted for a specific Event, a Customer may transfer a Ticket to another
          individual, provided that the transfer is completed through the Platform&rsquo;s
          designated transfer tool or via a written request approved by the Company. Informal
          transfers — including forwarding of confirmation emails or sharing of QR codes — are
          not recognized and expose the original Customer to the risk that the intended
          recipient will be denied admission.
        </P>
        <P>
          The Company may require the transferee to accept the Terms of Service, this Policy,
          and any Event-specific rules as a condition of admission. Certain Events, such as
          those subject to identity verification, age restrictions, licensing requirements, or
          regulated capacity limits, may not permit transfers at all, or may permit transfers
          only with additional documentation.
        </P>
        <P>
          Transfer requests must be submitted no later than seventy-two (72) hours before the
          scheduled start of the Event, or such other deadline as the Company may publish for a
          specific Event. Requests received after the applicable deadline may be declined at the
          Company&rsquo;s sole discretion, regardless of the reason for the delay.
        </P>
        <P>
          A transferred Ticket remains subject to this Policy in its entirety. The transferee
          assumes all rights and obligations of the original Customer under the Purchase,
          including the non-refundability of the Ticket within the seven (7) day window. The
          Company will not entertain Refund requests from the original Customer with respect to
          a Ticket that has been transferred, nor from the transferee on the basis of the
          transfer.
        </P>
      </>
    ),
  },
  {
    id: "no-show",
    number: 12,
    title: "No Show Policy",
    body: (
      <>
        <Callout variant="warning" title="No Shows Forfeit the Full Purchase Price">
          Failure to attend an Event for which a Ticket or Registration has been issued does not
          entitle the Customer to any Refund, Credit, transfer, or complimentary future
          attendance, regardless of the reason for non-attendance.
        </Callout>
        <P>
          A No Show occurs whenever a ticketed Customer or attendee does not appear at, log into,
          check in for, or otherwise participate in the Event covered by their Purchase. No Show
          status is determined by the Company&rsquo;s internal attendance records, which include
          on-site scans, digital check-ins, streaming access logs, and instructor confirmations.
        </P>
        <P>
          The Company&rsquo;s costs of delivering an Event are substantially the same whether or
          not any particular Customer actually attends. The venue is rented, the staff is
          scheduled, the materials are procured, and the capacity is reserved on the basis of
          confirmed Ticket sales, not on the basis of walk-in attendance. A No Show therefore
          imposes the full cost of the Ticket on the Company without any offsetting revenue
          recovery, and is treated as a completed transaction for all purposes under this Policy.
        </P>
        <P>
          Repeated No Shows may result, in the Company&rsquo;s sole discretion, in the
          restriction, suspension, or termination of the Customer&rsquo;s account and future
          purchasing privileges, particularly where the pattern indicates abuse of complimentary
          registrations, reservation of scarce capacity in bad faith, or manipulation of
          waitlist or lottery mechanisms.
        </P>
      </>
    ),
  },
  {
    id: "refund-processing",
    number: 13,
    title: "Refund Processing",
    body: (
      <>
        <P>
          Approved Refunds are processed exclusively to the original payment method used at
          checkout. The Company does not issue Refunds by check, wire transfer, cash, cash
          equivalent, gift card, or to any payment method other than the one used for the
          original Purchase, except where required by mandatory applicable law or where the
          original payment method is no longer available and an alternative has been verified in
          writing.
        </P>
        <P>
          The Company will initiate approved Refunds within a commercially reasonable time,
          generally within five (5) to ten (10) Business Days following approval. Once initiated,
          the actual posting of the refunded amount to the Customer&rsquo;s account depends on
          the processing timelines of the Customer&rsquo;s bank, card issuer, or payment
          provider, and may take an additional five (5) to fifteen (15) Business Days to appear
          on a statement.
        </P>
        <P>
          The Company has no control over, and cannot guarantee, third-party processing
          timelines, banking holidays, cross-border settlement windows, currency conversion
          schedules, or the internal policies of any card network or issuing institution. Delays
          in the posting of an initiated Refund do not constitute a breach of this Policy so
          long as the Company has properly initiated the Refund on its side.
        </P>
        <P>
          Customers who do not see an initiated Refund on their statement after fifteen (15)
          Business Days should first contact the issuer of the original payment method. If the
          issuer confirms that no pending Refund has been received, the Customer should notify
          the Company&rsquo;s customer support team, which will provide the corresponding
          processor reference and, if necessary, assist with tracing the transaction.
        </P>
      </>
    ),
  },
  {
    id: "non-refundable",
    number: 14,
    title: "Non-Refundable Items",
    body: (
      <>
        <P>
          Certain categories of Purchase are non-refundable in all circumstances, regardless of
          the timing of the Cancellation. These items are identified as non-refundable at the
          point of sale, and the Customer expressly acknowledges and accepts their
          non-refundable status by completing the Purchase.
        </P>
        <P>Non-refundable categories include, without limitation:</P>
        <ul className="mt-4 list-disc space-y-2 pl-6 leading-[1.85] text-foreground/85 marker:text-forest">
          <li>Credit Card Processing Fees, as described in Section 7;</li>
          <li>Digital products, downloadable materials, e-books, templates, and files that have been delivered, accessed, or made available for download;</li>
          <li>Memberships, whether monthly, annual, lifetime, or usage-based, once a billing period has commenced;</li>
          <li>Subscriptions, once a renewal has been processed for the applicable billing cycle;</li>
          <li>Promotional items, giveaways, bundled add-ons, and items provided free of charge or at a nominal cost as part of a larger Purchase;</li>
          <li>Discounted Tickets sold under promotional, early-bird, flash sale, group, or partner discount programs, unless the applicable promotion expressly states otherwise;</li>
          <li>Gift cards, promotional codes, and Credits, whether purchased, earned, or issued as goodwill;</li>
          <li>Downloaded materials, recordings, replays, on-demand videos, and archived content, once access has been granted;</li>
          <li>Administrative fees, service fees, convenience fees, cancellation fees, rebooking fees, and expedited handling fees;</li>
          <li>Third-party charges, including venue-imposed fees, insurance premiums, licensing fees, and pass-through charges collected on behalf of external parties;</li>
          <li>Shipping and handling charges, where physical goods have been dispatched to the Customer or a designated recipient;</li>
          <li>Taxes, duties, levies, and other governmental charges, where applicable law does not require their refund.</li>
        </ul>
        <P>
          Where a Purchase includes both refundable and non-refundable components, only the
          refundable portion is eligible for return. The Company will calculate the eligible
          Refund amount by deducting all non-refundable elements from the transaction total and
          returning only the residual balance, less any applicable Processing Fees.
        </P>
      </>
    ),
  },
  {
    id: "exceptions",
    number: 15,
    title: "Exception Requests",
    body: (
      <>
        <P>
          Exceptions to this Policy are rare, granted sparingly, and reserved for narrowly
          defined circumstances in which strict application of the standard rules would produce
          a result that is inconsistent with the Company&rsquo;s good-faith obligation to its
          Customers. The Company&rsquo;s decision to grant or decline an exception is made in
          its sole discretion and does not create any precedent, entitlement, or expectation
          for future requests.
        </P>
        <P>Circumstances that may, but are not required to, warrant an exception include:</P>
        <ul className="mt-4 list-disc space-y-2 pl-6 leading-[1.85] text-foreground/85 marker:text-forest">
          <li>Duplicate charges arising from processor error or repeated checkout attempts that the Company can verify through its internal transaction logs;</li>
          <li>Documented system errors on the Platform that prevented the Customer from completing, modifying, or cancelling a Purchase within the applicable eligibility window;</li>
          <li>Billing mistakes attributable to the Company, such as charges for the wrong Event, wrong quantity, or wrong price where the Customer&rsquo;s intent is clearly documented at checkout;</li>
          <li>Cancellation of an Event by the Company or its designated organizer, subject to Section 8;</li>
          <li>Legal requirements imposed by a court, regulator, or mandatory consumer protection statute applicable to the transaction.</li>
        </ul>
        <P>
          Exception requests must be submitted through the same channels as Cancellation
          requests (see Section 10), must clearly identify the underlying circumstance, and
          should be accompanied by any supporting documentation available to the Customer. The
          Company will review each request individually and communicate its determination in
          writing.
        </P>
        <P>
          Approval of an exception in a particular case does not constitute a waiver of any
          provision of this Policy in that case or any other, and does not obligate the Company
          to grant a similar exception in the future. Except where mandatory applicable law
          provides otherwise, the Company&rsquo;s decision on any exception request is final.
        </P>
      </>
    ),
  },
  {
    id: "fraud",
    number: 16,
    title: "Fraud Prevention",
    body: (
      <>
        <P>
          The Company maintains a comprehensive fraud prevention program designed to protect the
          integrity of its refund system, safeguard the interests of honest Customers, and
          comply with the requirements of payment networks and applicable law. The Company
          reserves the right to investigate any Purchase, Cancellation, or Refund request that
          it reasonably suspects involves fraud, misrepresentation, or abuse.
        </P>
        <P>
          False, misleading, or intentionally inaccurate Refund requests — including but not
          limited to fabricated hardship narratives, altered documentation, misrepresentation of
          attendance status, and coordinated group cancellation schemes — are prohibited and
          may result in denial of the request, forfeiture of any refunded amount, and further
          action described below.
        </P>
        <P>
          The Company monitors patterns of Purchase, Cancellation, Refund, and chargeback
          activity across accounts, payment methods, IP addresses, and devices, and may use
          automated systems to identify unusual patterns indicative of abuse. Where such
          patterns are detected, the Company may (i) suspend or terminate the affected account,
          (ii) require identity verification, including government-issued identification, before
          processing further transactions, (iii) block future Purchases from associated payment
          methods or accounts, and (iv) refer the matter to law enforcement, card networks, or
          collection agencies as appropriate.
        </P>
        <P>
          The Company may also, at its sole discretion, decline to issue Refunds that it
          reasonably believes are being requested in bad faith or as part of an abuse pattern,
          even where the transaction otherwise satisfies the standard eligibility criteria.
          Nothing in this Section limits any other remedy available to the Company under this
          Policy, the Terms of Service, or applicable law.
        </P>
      </>
    ),
  },
  {
    id: "chargebacks",
    number: 17,
    title: "Chargeback Policy",
    body: (
      <>
        <Callout variant="warning" title="Contact the Company Before Disputing a Charge">
          Customers agree to contact the Company&rsquo;s customer support team and to allow a
          reasonable opportunity to investigate and resolve any billing concern before initiating
          a chargeback with their card issuer or bank.
        </Callout>
        <P>
          A Chargeback is a formal payment dispute filed by a Customer directly with the
          Customer&rsquo;s card issuer or bank, resulting in the reversal of a transaction
          pending investigation by the card network. Chargebacks impose significant costs on the
          Company, including per-dispute processing fees, administrative burden, elevated
          scrutiny from payment processors, and the risk of increased processing rates or
          termination of merchant services.
        </P>
        <P>
          By completing a Purchase, the Customer expressly agrees that, in the event of any
          billing concern, the Customer will first contact the Company&rsquo;s customer support
          team and afford the Company a reasonable opportunity — of no less than ten (10)
          Business Days — to investigate and resolve the concern before initiating any
          Chargeback. This obligation applies even where the Customer believes that a Refund is
          clearly due; the Company&rsquo;s internal resolution process is materially faster and
          more efficient than a network-level dispute for both parties.
        </P>
        <P>
          A Chargeback initiated in violation of this Section, or initiated in respect of a
          Purchase for which the Customer has already received the corresponding Service or
          which is expressly non-refundable under this Policy, is considered an improper
          Chargeback. Improper Chargebacks may result, at the Company&rsquo;s sole discretion,
          in one or more of the following consequences:
        </P>
        <ul className="mt-4 list-disc space-y-2 pl-6 leading-[1.85] text-foreground/85 marker:text-forest">
          <li>Immediate suspension or permanent termination of the Customer&rsquo;s account and all associated Registrations;</li>
          <li>Cancellation of any then-outstanding Tickets, Registrations, or Credits without further refund obligation;</li>
          <li>Permanent ban from future Purchases through the Platform, the Website, or any successor property operated by the Company;</li>
          <li>Referral to third-party collection agencies for recovery of the disputed amount, plus reasonable collection costs;</li>
          <li>Assessment of an administrative fee to reimburse the Company for chargeback processing costs, up to the maximum amount permitted by applicable law;</li>
          <li>Recovery of the Company&rsquo;s reasonable attorneys&rsquo; fees, court costs, and enforcement expenses in any resulting proceeding;</li>
          <li>Legal action for breach of contract, conversion, or fraud, where permitted under applicable law;</li>
          <li>Loss of future purchasing privileges across all Company-operated properties.</li>
        </ul>
        <P>
          The Company will actively contest improper Chargebacks and will submit all relevant
          documentation to the applicable card network in support of the disputed transaction.
        </P>
      </>
    ),
  },
  {
    id: "force-majeure",
    number: 18,
    title: "Force Majeure",
    body: (
      <>
        <P>
          The Company shall not be liable for any failure or delay in the performance of its
          obligations under this Policy, the Terms of Service, or any Purchase to the extent
          that such failure or delay results from a Force Majeure event. During the pendency of
          a Force Majeure event, the Company&rsquo;s refund and rescheduling obligations shall
          be limited as described in this Section.
        </P>
        <P>Force Majeure events include, without limitation:</P>
        <ul className="mt-4 list-disc space-y-2 pl-6 leading-[1.85] text-foreground/85 marker:text-forest">
          <li>Natural disasters, including earthquakes, hurricanes, tornadoes, floods, wildfires, and severe storms;</li>
          <li>Epidemics, pandemics, quarantines, and public health emergencies;</li>
          <li>Governmental orders, restrictions, curfews, sanctions, embargoes, or changes in law that prohibit or materially impair the delivery of an Event;</li>
          <li>Acts of war, insurrection, civil unrest, riots, and acts of terrorism;</li>
          <li>Failures of internet infrastructure, cloud service outages, distributed denial-of-service attacks, and other third-party technology disruptions;</li>
          <li>Power outages, utility failures, and telecommunications disruptions affecting the Company&rsquo;s ability to deliver the Services;</li>
          <li>Extreme weather events that render travel to or occupancy of a venue unsafe;</li>
          <li>Venue closures, evacuations, or loss of permits or licenses beyond the Company&rsquo;s reasonable control;</li>
          <li>Strikes, lockouts, labor disputes, and shortages of critical labor or materials;</li>
          <li>Any other circumstance beyond the reasonable control of the Company that materially impairs its ability to perform.</li>
        </ul>
        <P>
          Where an Event is cancelled, postponed, or materially modified as a result of a Force
          Majeure event, the Company may, in its sole discretion, (i) reschedule the Event to a
          later date; (ii) offer affected Customers a Credit toward future Purchases; (iii)
          offer a partial or full Refund of the Ticket price, less non-refundable Processing
          Fees and any costs already incurred in reliance on the original Event; or (iv) where
          cost recovery is not feasible and applicable law so permits, offer no Refund. The
          Company&rsquo;s choice of remedy under this Section is final except where mandatory
          applicable law provides otherwise.
        </P>
      </>
    ),
  },
  {
    id: "limitation-of-liability",
    number: 19,
    title: "Limitation of Liability",
    body: (
      <>
        <P>
          The Company&rsquo;s obligations under this Policy are strictly limited to the specific
          remedies expressly described herein: a Refund of eligible amounts to the original
          payment method, or, at the Company&rsquo;s election in the circumstances described
          above, issuance of a Credit or a transfer to a comparable Event. In no event shall the
          Company be liable for any incidental, consequential, indirect, special, punitive, or
          exemplary damages arising out of or in connection with a Purchase, Cancellation, or
          Refund request.
        </P>
        <P>Without limiting the generality of the foregoing, the Company shall not be liable for:</P>
        <ul className="mt-4 list-disc space-y-2 pl-6 leading-[1.85] text-foreground/85 marker:text-forest">
          <li>Travel expenses, including airfare, train tickets, rideshare fares, fuel, tolls, and parking;</li>
          <li>Hotel and lodging expenses, including non-refundable reservations, deposits, and change fees;</li>
          <li>Ground transportation, transit passes, and rental car charges;</li>
          <li>Missed work, lost wages, lost profits, foregone business opportunities, and expenses related to time away from employment;</li>
          <li>Third-party purchases made in reliance on the Event, including meals, entertainment, souvenirs, gifts, and services;</li>
          <li>Incidental damages, including inconvenience, disappointment, or emotional distress;</li>
          <li>Consequential damages of any nature, whether foreseeable or not, arising out of the Purchase or the Company&rsquo;s performance under this Policy;</li>
          <li>Any damages exceeding, in the aggregate, the total amount actually paid by the affected Customer for the specific Purchase giving rise to the claim.</li>
        </ul>
        <LegalCaps>
          To the maximum extent permitted by applicable law, the Company&rsquo;s aggregate
          liability arising out of or relating to this Refund Policy shall not exceed the total
          amount actually paid by the affected Customer for the specific Purchase giving rise to
          the claim, less any non-refundable Processing Fees.
        </LegalCaps>
        <P>
          The limitations set out in this Section apply regardless of the legal theory on which
          any claim is based, including contract, tort, negligence, strict liability, or
          otherwise, and apply even where the Company has been advised of the possibility of
          such damages. Where applicable law does not permit the exclusion or limitation of
          certain damages, the exclusions and limitations in this Section shall apply to the
          maximum extent permitted by that law.
        </P>
      </>
    ),
  },
  {
    id: "policy-changes",
    number: 20,
    title: "Policy Changes",
    body: (
      <>
        <P>
          The Company reserves the right to revise, amend, restate, or replace this Policy at
          any time and from time to time, in its sole discretion, in order to reflect changes in
          its Services, technology, business practices, payment processor requirements, or
          applicable law. When material changes are made, the Company will update the
          &ldquo;Last Updated&rdquo; date at the top of this Policy and, where the change is
          material, will provide reasonable additional notice through the Platform, the
          Website, or by email to registered Customers.
        </P>
        <P>
          Updated versions of this Policy become effective as of the date indicated in the
          revised document. Purchases completed on or after the effective date of a revision are
          governed by the revised Policy. Purchases completed prior to the effective date
          continue to be governed by the version of this Policy in force at the time of the
          Purchase, except where mandatory applicable law requires the retroactive application
          of a change.
        </P>
        <P>
          Continued use of the Platform, the Website, or the Services after the effective date
          of a revision constitutes the Customer&rsquo;s acceptance of the revised Policy.
          Customers who do not agree to a revision must discontinue use of the Services and
          refrain from initiating further Purchases; existing Purchases remain governed by the
          version of the Policy applicable at the time of the transaction.
        </P>
        <P>
          The Company will maintain an accessible archive of prior versions of this Policy for a
          reasonable period following each revision, so that Customers can identify the version
          applicable to any given Purchase. Requests for prior versions should be directed to
          the customer support team using the contact information in Section 21.
        </P>
      </>
    ),
  },
  {
    id: "contact",
    number: 21,
    title: "Contact Information",
    body: (
      <>
        <P>
          Questions, refund requests, exception requests, and other communications relating to
          this Policy should be directed to the Company using the contact details below.
          Customers are encouraged to include the order or confirmation number and the email
          address associated with the underlying Purchase to expedite handling.
        </P>
        <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-6 sm:p-8">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">
                Company Name
              </dt>
              <dd className="mt-1 text-base text-foreground">[Company Name]</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">
                Customer Support
              </dt>
              <dd className="mt-1 text-base text-foreground">support@[company].com</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">
                Billing Department
              </dt>
              <dd className="mt-1 text-base text-foreground">billing@[company].com</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">
                Phone
              </dt>
              <dd className="mt-1 text-base text-foreground">+1 (555) 000-0000</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">
                Mailing Address
              </dt>
              <dd className="mt-1 text-base text-foreground">
                [Street Address]
                <br />
                [City, State/Region, Postal Code]
                <br />
                [Country]
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">
                Website
              </dt>
              <dd className="mt-1 text-base text-foreground">www.[company].com</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-forest">
                Business Hours
              </dt>
              <dd className="mt-1 text-base text-foreground">
                Monday – Friday, 9:00 AM – 6:00 PM local time
              </dd>
            </div>
          </dl>
        </div>
        <Callout variant="legal" title="Legal Notice">
          This Refund Policy is provided as a general framework and does not constitute legal
          advice. Companies adopting this template should consult qualified legal counsel to
          tailor its provisions to their specific business, jurisdiction, payment processor
          requirements, and applicable consumer protection laws.
        </Callout>
      </>
    ),
  },
];

function RefundPage() {
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
            <Receipt className="h-4 w-4" /> Legal · Refunds
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-forest-deep sm:text-6xl">
            Refund Policy
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            This Refund Policy governs all purchases, cancellations, credits, transfers, and
            chargebacks associated with the Company&rsquo;s Platform, Website, and Services. It
            sets out, in detail, when refunds are available, how they are processed, and the
            responsibilities of both the Customer and the Company.
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
          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            {[
              { icon: <Receipt className="h-4 w-4" />, label: "Purchases" },
              { icon: <CreditCard className="h-4 w-4" />, label: "Payments" },
              { icon: <CalendarX className="h-4 w-4" />, label: "Cancellations" },
              { icon: <LifeBuoy className="h-4 w-4" />, label: "Support" },
            ].map((chip) => (
              <div
                key={chip.label}
                className="flex items-center gap-2 rounded-xl border border-border bg-white/60 px-4 py-3 text-sm font-semibold text-forest-deep"
              >
                <span className="text-forest">{chip.icon}</span>
                {chip.label}
              </div>
            ))}
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
                  © {new Date().getFullYear()} [Company Name]. All rights reserved. By completing
                  a Purchase, you acknowledge that you have read, understood, and agreed to this
                  Refund Policy.
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

// Silence unused import warning while keeping H3 available for future subsections.
void H3;
