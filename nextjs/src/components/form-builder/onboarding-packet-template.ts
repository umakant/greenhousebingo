import type { FormFieldDef } from "@/components/form-builder/form-field-types";

function row(
  id: string,
  label: string,
  type: string,
  extra: Partial<Pick<FormFieldDef, "placeholder" | "required" | "options">> = {},
): Omit<FormFieldDef, "order"> {
  return {
    id,
    label,
    type,
    required: extra.required ?? false,
    placeholder: extra.placeholder ?? "",
    options: extra.options !== undefined ? extra.options : [],
  };
}

/** Layout hint stored in options (non-select fields). */
const G2 = { gridCols: 2 as const };
const G3 = { gridCols: 3 as const };
const G4 = { gridCols: 4 as const };

/**
 * Pre-built “Onboarding Packet” form aligned with common HR onboarding UI:
 * accordion sections, maroon group labels, multi-column rows, sidebar-friendly progress.
 */
export function getOnboardingPacketTemplate(): {
  name: string;
  default_layout: string;
  fields: FormFieldDef[];
} {
  const raw: Omit<FormFieldDef, "order">[] = [
    row("onb_sec_personal", "Personal Info", "section"),
    row("onb_h_contact", "Contact", "heading"),
    row("onb_prefix", "Prefix", "select", {
      placeholder: "Select...",
      options: ["Select...", "Mr.", "Ms.", "Mrs.", "Miss", "Mx.", "Dr.", "Prof."],
    }),
    row("onb_first", "First name", "text", { required: true, options: G4 }),
    row("onb_middle", "Middle name", "text", { options: G4 }),
    row("onb_last", "Last name", "text", { required: true, options: G4 }),
    row("onb_suffix", "Suffix", "select", { options: ["Select", "Jr.", "Sr.", "II", "III", "IV"] }),
    row("onb_phone", "Phone", "tel", { required: true, placeholder: "(000) 000-0000", options: G4 }),
    row("onb_email", "Email", "email", { required: true, options: G4 }),
    row("onb_dob", "Date of birth", "date", { required: true, options: G4 }),
    row("onb_h_addr", "Address", "heading"),
    row("onb_addr1", "Address", "text", { required: true }),
    row("onb_addr2", "Address 2", "text", { placeholder: "Apt, suite, unit (optional)" }),
    row("onb_city", "City", "text", { required: true }),
    row("onb_state", "State", "text", { required: true }),
    row("onb_zip", "Zip code", "text", { required: true }),

    row("onb_sec_id", "Identification & passport", "section"),
    row("onb_h_id", "Identification", "heading"),
    row("onb_ssn", "SSN", "text", { placeholder: "000-00-0000", options: G4 }),
    row("onb_dl_state", "DL state", "text", { options: G4 }),
    row("onb_dl_num", "DL number", "text", { options: G4 }),
    row("onb_dl_exp", "DL expiration date", "date", { options: G4 }),
    row("onb_h_phys", "Physical description", "heading"),
    row("onb_ht_ft", "Height (ft)", "number", { options: G4 }),
    row("onb_ht_in", "Height (in)", "number", { options: G4 }),
    row("onb_weight", "Weight", "number", { options: G4 }),
    row("onb_eye", "Eye color", "text", { options: G4 }),
    row("onb_hair", "Hair color", "text", { options: G4 }),
    row("onb_h_pass", "Passport", "heading"),
    row("onb_has_pass", "Do you have a passport?", "select", { options: ["Yes", "No"] }),
    row("onb_birth_place", "Place of birth", "text"),
    row("onb_pass_issue", "Passport issue date", "date"),
    row("onb_pass_exp", "Passport expiration date", "date"),

    row("onb_sec_emergency", "Emergency contact", "section"),
    row("onb_h_ec", "Emergency contact", "heading"),
    row("onb_ec_first", "First name", "text", { options: G4 }),
    row("onb_ec_last", "Last name", "text", { options: G4 }),
    row("onb_ec_phone", "Phone", "tel", { options: G4 }),
    row("onb_ec_rel", "Relationship to you", "select", {
      options: ["Spouse", "Parent", "Sibling", "Friend", "Other"],
    }),

    row("onb_sec_military", "Military / work background", "section"),
    row(
      "onb_mil_desc",
      "Military, Law Enforcement, and Corrections are optional. Add details only where they apply. Use + Add repeaters in a future update for multiple entries per category.",
      "description",
    ),
    row("onb_h_mil", "Military", "heading"),
    row("onb_mil_branch", "Branch / notes", "textarea", { placeholder: "Optional" }),
    row("onb_h_le", "Law enforcement", "heading"),
    row("onb_le_notes", "Agency / notes", "textarea", { placeholder: "Optional" }),
    row("onb_h_corr", "Corrections", "heading"),
    row("onb_corr_notes", "Facility / notes", "textarea", { placeholder: "Optional" }),

    row("onb_sec_avail", "Work availability", "section"),
    row("onb_h_in", "In-state", "heading"),
    row("onb_in_state", "State", "text", { placeholder: "Florida", options: G3 }),
    row("onb_in_pos", "Position", "text", { placeholder: "Full Time", options: G3 }),
    row("onb_in_shift", "Shifts", "text", { placeholder: "Any shift", options: G3 }),
    row("onb_h_out", "Out-of-state", "heading"),
    row("onb_out_state", "State", "text", { placeholder: "Washington", options: G3 }),
    row("onb_out_pos", "Position", "text", { placeholder: "Full Time", options: G3 }),
    row("onb_out_shift", "Shifts", "text", { placeholder: "Any shift", options: G3 }),

    row("onb_sec_licenses", "State licenses", "section"),
    row(
      "onb_lic_hint",
      "Add each license on its own row. For multiple licenses, duplicate fields in the form editor or use the text area for a list.",
      "description",
    ),
    row("onb_lic_type", "License type", "text", { placeholder: "Armed / Unarmed", options: G4 }),
    row("onb_lic_state", "State", "text", { options: G4 }),
    row("onb_lic_num", "License number", "text", { options: G4 }),
    row("onb_lic_issued", "Issued date", "date", { options: G4 }),
    row("onb_lic_exp", "Expiration date", "date", { options: G4 }),

    row("onb_sec_travel", "Hotel / flight info", "section"),
    row("onb_h_air", "Airport", "heading"),
    row("onb_air_state", "Airport state", "text", { options: G3 }),
    row("onb_air_city", "Airport city", "text", { options: G3 }),
    row("onb_air_code", "Airport code", "text", { options: G3 }),
    row("onb_h_seat", "Seat preference", "heading"),
    row("onb_seat", "Seat preference", "text", { placeholder: "Window / Aisle" }),

    row("onb_sec_clothing", "Clothing", "section"),
    row("onb_h_shirt", "Shirt", "heading"),
    row("onb_shirt", "Shirt size", "text"),
    row("onb_h_pants", "Pants", "heading"),
    row("onb_waist", "Pants waist", "text", { options: G2 }),
    row("onb_inseam", "Pants length", "text", { options: G2 }),
    row("onb_h_shoe", "Shoes", "heading"),
    row("onb_shoe_type", "Shoe type", "text", { placeholder: "Men / Women", options: G2 }),
    row("onb_shoe_size", "Shoe size", "text", { options: G2 }),

    row("onb_sec_more", "Additional info", "section"),
    row("onb_h_add", "Additional info", "heading"),
    row("onb_food", "Food allergies", "textarea", { placeholder: "e.g. pork products", options: G2 }),
    row("onb_medical", "Medical issues", "textarea", { placeholder: "N/A", options: G2 }),

    row("onb_sec_certs", "Licenses & certifications", "section"),
    row(
      "onb_certs_note",
      "This list mirrors your profile Licenses tab (driver license, SSN card, state credentials, and professional certifications). State security license numbers and dates are edited under Onboarding Packet → State Licenses; uploads can be done here or there. Driver license, Social Security card, state credentials, and professional certifications: upload front and back (or PDF) where your HR workflow supports file uploads.",
      "description",
    ),
    row("onb_certs_docs", "Licenses & certifications", "license_documents", { required: true, options: {} }),

    row("onb_sec_i9", "USCIS Form I-9", "section"),
    row(
      "onb_i9_note",
      "Complete and sign Section 1 of the Employment Eligibility Verification form below. Use Sign & Submit Section 1 when finished; then submit the full onboarding packet.",
      "description",
    ),
    row("onb_i9_section1", "Form I-9 — Section 1 (employee)", "uscis_i9_section1", { required: true, options: {} }),

    row("onb_sec_bg", "Background check", "section"),
    row(
      "onb_bg_note",
      "Review and sign the Background Check Consent & Confirmation Agreement. Your HR team completes the employer section first; you sign as the employee below (or decline).",
      "description",
    ),
    row("onb_bg_consent", "Background check consent", "background_check_consent", { required: true, options: {} }),

    row("onb_sec_drug", "Pre-employment drug testing", "section"),
    row(
      "onb_drug_note",
      "Sign the consent form and schedule your required drug screening appointment.",
      "description",
    ),
    row("onb_drug_consent", "Pre-employment drug testing", "drug_testing_consent", { required: true, options: {} }),

    row("onb_sec_nda", "Non-disclosure agreement", "section"),
    row(
      "onb_nda_note",
      "Read and digitally sign your confidentiality agreement below.",
      "description",
    ),
    row("onb_nda_consent", "Non-Disclosure Agreement", "nda_consent", { required: true, options: {} }),
  ];

  const fields: FormFieldDef[] = raw.map((f, i) => ({ ...f, order: i }));
  return {
    name: "Onboarding Packet",
    default_layout: "onboarding",
    fields,
  };
}
