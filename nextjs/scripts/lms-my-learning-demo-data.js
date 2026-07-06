/** Demo curriculum for First Aid Responders "My Learning" hub (matches UI mockup counts). */

const SEED_KEY = "far-lms-my-learning-hub";
const SLUG_PREFIX = "far-learning-";

/** Unsplash cover images (first-aid / medical / training themed). */
const COVERS = [
  "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=640&q=80",
  "https://images.unsplash.com/photo-1581595219315-0b6e4b07bbcc?w=640&q=80",
  "https://images.unsplash.com/photo-1559757148-7470f9f0f6c5?w=640&q=80",
  "https://images.unsplash.com/photo-1579684270322-aaef7fd5f494?w=640&q=80",
  "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=640&q=80",
  "https://images.unsplash.com/photo-1519494020892-80fcd12267ae?w=640&q=80",
  "https://images.unsplash.com/photo-1538108149393-fbbd81890307?w=640&q=80",
  "https://images.unsplash.com/photo-1584515933487-7798242912f7?w=640&q=80",
];

function cover(i) {
  return COVERS[i % COVERS.length];
}

const ENROLLED_COURSES = [
  {
    slug: `${SLUG_PREFIX}basic-first-aid`,
    title: "Basic First Aid Training",
    description: "Essential first aid skills for field responders — assessment, bleeding control, and scene safety.",
    progress: "in_progress",
    progressPercent: 60,
    dueInDays: 13,
    coverImageUrl: cover(0),
  },
  {
    slug: `${SLUG_PREFIX}cpr-certification`,
    title: "CPR Certification",
    description: "Adult, child, and infant CPR techniques with AED integration for emergency response teams.",
    progress: "in_progress",
    progressPercent: 45,
    dueInDays: 18,
    coverImageUrl: cover(1),
  },
  {
    slug: `${SLUG_PREFIX}aed-operation`,
    title: "AED Operation & Maintenance",
    description: "Deploy and maintain automated external defibrillators during cardiac emergencies.",
    progress: "in_progress",
    progressPercent: 72,
    dueInDays: 21,
    coverImageUrl: cover(2),
  },
  {
    slug: `${SLUG_PREFIX}bloodborne-pathogens`,
    title: "Bloodborne Pathogens",
    description: "OSHA-aligned exposure control, PPE, and post-exposure protocols for specimen handlers.",
    progress: "completed",
    progressPercent: 100,
    coverImageUrl: cover(3),
  },
  {
    slug: `${SLUG_PREFIX}incident-documentation`,
    title: "Incident Documentation",
    description: "Write clear, compliant incident reports and chain-of-custody notes for field operations.",
    progress: "completed",
    progressPercent: 100,
    coverImageUrl: cover(4),
  },
  {
    slug: `${SLUG_PREFIX}patient-assessment`,
    title: "Patient Assessment Basics",
    description: "Primary and secondary surveys for pre-hospital and event medical staff.",
    progress: "completed",
    progressPercent: 100,
    coverImageUrl: cover(5),
  },
  {
    slug: `${SLUG_PREFIX}field-hygiene`,
    title: "Field Hygiene & Sanitation",
    description: "Infection prevention for mobile labs, tents, and pop-up collection sites.",
    progress: "completed",
    progressPercent: 100,
    coverImageUrl: cover(6),
  },
  {
    slug: `${SLUG_PREFIX}emergency-communication`,
    title: "Emergency Communication",
    description: "Radio protocols, handoffs, and escalation paths during multi-agency activations.",
    progress: "completed",
    progressPercent: 100,
    coverImageUrl: cover(7),
  },
  {
    slug: `${SLUG_PREFIX}triage-fundamentals`,
    title: "Triage Fundamentals",
    description: "Sort, treat, and transport priorities for mass gathering medical support.",
    progress: "completed",
    progressPercent: 100,
    coverImageUrl: cover(0),
  },
  {
    slug: `${SLUG_PREFIX}heat-illness-prevention`,
    title: "Heat Illness Prevention",
    description: "Recognize and manage heat exhaustion and heat stroke at outdoor events.",
    progress: "completed",
    progressPercent: 100,
    coverImageUrl: cover(1),
  },
  {
    slug: `${SLUG_PREFIX}overdose-response`,
    title: "Overdose Response & Naloxone",
    description: "Opioid emergency recognition, naloxone administration, and aftercare.",
    progress: "overdue",
    progressPercent: 35,
    overdueDaysAgo: 11,
    coverImageUrl: cover(2),
  },
  {
    slug: `${SLUG_PREFIX}specimen-handling`,
    title: "Specimen Handling 101",
    description: "Labeling, storage, and transport requirements for field collection teams.",
    progress: "not_started",
    coverImageUrl: cover(3),
  },
  {
    slug: `${SLUG_PREFIX}privacy-hipaa-field`,
    title: "HIPAA in the Field",
    description: "Protect PHI during mobile testing, screenings, and on-site registrations.",
    progress: "not_started",
    coverImageUrl: cover(4),
  },
  {
    slug: `${SLUG_PREFIX}ppe-selection`,
    title: "PPE Selection & Donning",
    description: "Choose and don appropriate PPE for lab, clinical, and event environments.",
    progress: "not_started",
    coverImageUrl: cover(5),
  },
  {
    slug: `${SLUG_PREFIX}de-escalation`,
    title: "De-escalation Techniques",
    description: "Verbal and situational strategies for tense patient or crowd interactions.",
    progress: "not_started",
    coverImageUrl: cover(6),
  },
  {
    slug: `${SLUG_PREFIX}vehicle-safety`,
    title: "Mobile Unit Vehicle Safety",
    description: "Pre-trip inspections, secure loading, and roadside safety for response vans.",
    progress: "not_started",
    coverImageUrl: cover(7),
  },
  {
    slug: `${SLUG_PREFIX}allergic-reactions`,
    title: "Allergic Reactions & Anaphylaxis",
    description: "Identify severe allergic reactions and coordinate epinephrine auto-injector use.",
    progress: "not_started",
    coverImageUrl: cover(0),
  },
  {
    slug: `${SLUG_PREFIX}child-safety-events`,
    title: "Pediatric Safety at Events",
    description: "Age-specific considerations for youth sports and festival medical tents.",
    progress: "not_started",
    coverImageUrl: cover(1),
  },
  {
    slug: `${SLUG_PREFIX}fatigue-management`,
    title: "Shift Fatigue Management",
    description: "Sleep hygiene and rotation planning for long activations and overnight coverage.",
    progress: "not_started",
    coverImageUrl: cover(2),
  },
  {
    slug: `${SLUG_PREFIX}customer-service-medical`,
    title: "Customer Service for Med Teams",
    description: "Professional communication with clients, athletes, and venue staff under pressure.",
    progress: "not_started",
    coverImageUrl: cover(3),
  },
];

const RECOMMENDED_COURSES = [
  {
    slug: `${SLUG_PREFIX}cpr-recertification`,
    title: "CPR Recertification Refresher",
    description: "Annual skills check and updated guidelines for certified responders.",
    coverImageUrl: cover(4),
    durationMinutes: 105,
  },
  {
    slug: `${SLUG_PREFIX}event-medical-lead`,
    title: "Event Medical Team Lead",
    description: "Leadership, staffing, and supply planning for large venue medical operations.",
    coverImageUrl: cover(5),
    durationMinutes: 150,
  },
  {
    slug: `${SLUG_PREFIX}lab-compliance-basics`,
    title: "Lab Compliance Basics",
    description: "Introductory CLIA and quality control concepts for mobile lab staff.",
    coverImageUrl: cover(6),
    durationMinutes: 90,
  },
  {
    slug: `${SLUG_PREFIX}background-checks-reseller`,
    title: "Background Screening Reseller",
    description: "Add compliant background checks as a revenue stream for your lab business.",
    coverImageUrl: cover(7),
    durationMinutes: 120,
  },
];

const ALL_COURSES = [...ENROLLED_COURSES, ...RECOMMENDED_COURSES];

module.exports = {
  SEED_KEY,
  SLUG_PREFIX,
  ENROLLED_COURSES,
  RECOMMENDED_COURSES,
  ALL_COURSES,
};
