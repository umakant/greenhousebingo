/** Mirrors src/lib/lms-events/event-detail-content.ts defaults for Node seed scripts. */

const DEFAULT_BINGO_ROUNDS = [
  { roundNumber: 1, name: "Traditional Bingo", pattern: "Any line — horizontal, vertical, or diagonal", difficulty: "Easy", prize: "Pothos" },
  { roundNumber: 2, name: "Four Corners", pattern: "Mark all four corner squares", difficulty: "Easy", prize: "Succulent" },
  { roundNumber: 3, name: "Blackout", pattern: "Cover the entire card", difficulty: "Hard", prize: "Monstera" },
  { roundNumber: 4, name: "Letter X", pattern: "Both diagonals form an X", difficulty: "Medium", prize: "Snake Plant" },
  { roundNumber: 5, name: "Picture Frame", pattern: "Complete the outer border", difficulty: "Medium", prize: "Peace Lily" },
  { roundNumber: 6, name: "Postage Stamp", pattern: "2x2 block in any corner", difficulty: "Easy", prize: "Succulent" },
  { roundNumber: 7, name: "Double Bingo", pattern: "Two winning lines", difficulty: "Medium", prize: "Rubber Plant" },
  { roundNumber: 8, name: "Lucky Leaf Pattern", pattern: "Leaf-shaped pattern on card", difficulty: "Hard", prize: "Fern" },
  { roundNumber: 9, name: "Crazy Garden Pattern", pattern: "Surprise pattern revealed live", difficulty: "Hard", prize: "Orchid" },
  { roundNumber: 10, name: "Wild Card Finale", pattern: "Winner picks any plant on the floor", difficulty: "Epic", prize: "Your Choice" },
];

const DEFAULT_EVENT_FAQS = [
  {
    question: "How do I get in?",
    answer:
      "After purchase you'll receive an email with a unique QR code for each ticket. Show the QR code at the door and we'll scan you in.",
  },
  {
    question: "How many plants do I take home?",
    answer: "One plant per ticket purchased. Buy 2 tickets, take home 2 plants.",
  },
  {
    question: "Can I buy tickets at the door?",
    answer: "No. Tickets are online only so we can guarantee a plant for every guest.",
  },
  {
    question: "What about extra Bingo cards?",
    answer:
      "Your ticket includes bingo cards. You can add more for a small fee — during purchase or at the door if any are left.",
  },
  {
    question: "Is there a fee?",
    answer: "A 3.5% card processing fee is added at checkout. Everything else you see is the final price.",
  },
  {
    question: "What if I can't make it?",
    answer:
      "Tickets are transferable — forward your QR email to a friend. We do not offer refunds under 48 hours before the event.",
  },
];

const DEFAULT_WHATS_INCLUDED = [
  "10 Bingo cards",
  "Complimentary adult beverages",
  "10 rounds of Plant Bingo",
  "One guaranteed take-home plant",
  "Light refreshments",
  "Sponsor discount card",
];

const DEFAULT_CHECKIN_STEPS = [
  "Buy online — we'll generate a QR code for each ticket.",
  "Check your email — your QR codes arrive instantly.",
  "Scan at the door — our host scans your QR code and hands you your cards.",
  "Pick up plants at the end — one plant per ticket purchased.",
];

const DEFAULT_HERO_TAGLINE = "Everyone Leaves With a Plant. 🌿 Guaranteed.";

const HOST_IMAGE_BY_KEY = {
  hostTaylor: "/company-themes/plant-bingo-bash/assets/host-taylor-DTGrxiU8.jpg",
  hostSam: "/company-themes/plant-bingo-bash/assets/host-sam-BSw4B9_h.jpg",
  hostRiley: "/company-themes/plant-bingo-bash/assets/host-riley-DEAyhJ1e.jpg",
  hostMorgan: "/company-themes/plant-bingo-bash/assets/host-morgan-CrmfAVlO.jpg",
  hostJamie: "/company-themes/plant-bingo-bash/assets/host-jamie-D8PQTlcn.jpg",
  hostAlex: "/company-themes/plant-bingo-bash/assets/host-alex-DKjVDF5Q.jpg",
};

function defaultAgePolicyText(ageRule) {
  switch (ageRule) {
    case "21+":
      return "21+ only. Valid ID required at the door.";
    case "Family":
      return "All ages welcome. Under 21 must be accompanied by an adult.";
    case "All ages":
      return "All ages welcome. Family-friendly event.";
    default:
      return "All ages welcome. Under 21 must be accompanied by an adult.";
  }
}

function defaultDescriptionTitle(venueName) {
  const venue = String(venueName ?? "").trim();
  return venue ? `You're Invited to Plant Bingo at ${venue}!` : "You're Invited to Plant Bingo!";
}

function regionTagFromState(stateAbbr) {
  return String(stateAbbr ?? "").trim().toUpperCase();
}

function buildDetailContent(ev) {
  const host = ev.hostName
    ? {
        name: ev.hostName,
        bio: ev.hostBio || "",
        imageUrl: ev.hostImageUrl || undefined,
      }
    : undefined;

  const sponsor = ev.sponsorName
    ? {
        name: ev.sponsorName,
        address: ev.sponsorAddress || "",
        phone: ev.sponsorPhone || "",
        perk: ev.sponsorPerk || "",
      }
    : undefined;

  return {
    regionTag: regionTagFromState(ev.venueState),
    heroTagline: ev.heroTagline || DEFAULT_HERO_TAGLINE,
    descriptionTitle: ev.descriptionTitle || defaultDescriptionTitle(ev.venueName),
    bingoEnd: ev.bingoEnd || undefined,
    venuePhone: ev.venuePhone || undefined,
    agePolicyText: ev.agePolicyText || defaultAgePolicyText(ev.ageRule),
    cardFeePercent: ev.cardFeePercent ?? 3.5,
    soldOut: ev.soldOut ?? false,
    host,
    sponsor,
    whatsIncluded: ev.whatsIncluded || [...DEFAULT_WHATS_INCLUDED],
    checkInSteps: ev.checkInSteps || [...DEFAULT_CHECKIN_STEPS],
    bingoRounds: ev.bingoRounds || [...DEFAULT_BINGO_ROUNDS],
    faqs: ev.faqs || [...DEFAULT_EVENT_FAQS],
  };
}

module.exports = {
  DEFAULT_BINGO_ROUNDS,
  DEFAULT_EVENT_FAQS,
  DEFAULT_WHATS_INCLUDED,
  DEFAULT_CHECKIN_STEPS,
  DEFAULT_HERO_TAGLINE,
  HOST_IMAGE_BY_KEY,
  buildDetailContent,
  defaultDescriptionTitle,
};
