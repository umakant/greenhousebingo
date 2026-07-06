const { buildPartnershipEmail } = require("./partnership-email-layout");

const COMMON_VARS = {
  "App Name": "app_name",
  "Company Name": "company_name",
  "App Url": "app_url",
  "Recipient Name": "recipient_name",
  "Brand Name": "brand_name",
  "Partner Name": "partner_name",
  "Support Email": "support_email",
  "Logo Html": "logo_html",
  "Action Button": "action_button",
  "Current Ownership": "current_ownership",
  "Minimum Ownership": "minimum_ownership",
  "Available Ownership": "available_ownership",
  "Old Ownership": "old_ownership",
  "New Ownership": "new_ownership",
  "Proposed Ownership": "proposed_ownership",
  "Change Type": "change_type",
  "Reason": "reason",
  "Conflict Message": "conflict_message",
  "Invited By": "invited_by",
  "Invited On": "invited_on",
  "Approved On": "approved_on",
  "Rejected On": "rejected_on",
  "From Partners": "from_partners",
  "Request Id": "request_id",
};

const CTA = `<p style="margin:0;text-align:center;">{action_button}</p>`;

const TEMPLATES = [
  {
    name: "Partnership Invitation",
    moduleName: "Partnerships",
    subject: "You're invited to become a brand partner — {brand_name}",
    variables: JSON.stringify(COMMON_VARS),
    langContent: {
      en: buildPartnershipEmail({
        theme: "blue",
        title: "Partnership Invitation",
        introHtml: `<p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">You have been invited to join <strong>{brand_name}</strong> as a brand partner. Review the details below and sign the partnership agreement.</p>`,
        rows: [
          { label: "Brand", value: "{brand_name}" },
          { label: "Ownership share", value: "{current_ownership}" },
          { label: "Minimum ownership", value: "{minimum_ownership}" },
          { label: "Invited by", value: "{invited_by}" },
          { label: "Invited on", value: "{invited_on}" },
        ],
        ctaHtml: CTA,
      }),
    },
  },
  {
    name: "Ownership Change Request",
    moduleName: "Partnerships",
    subject: "Ownership change request — {brand_name}",
    variables: JSON.stringify(COMMON_VARS),
    langContent: {
      en: buildPartnershipEmail({
        theme: "orange",
        title: "Ownership Change Request",
        introHtml: `<p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">An ownership change has been requested for <strong>{brand_name}</strong>.</p>`,
        rows: [
          { label: "Change type", value: "{change_type}" },
          { label: "Partner", value: "{partner_name}" },
          { label: "Current ownership", value: "{old_ownership}" },
          { label: "Proposed ownership", value: "{proposed_ownership}" },
          { label: "Minimum ownership", value: "{minimum_ownership}" },
        ],
        ctaHtml: CTA,
      }),
    },
  },
  {
    name: "Ownership Approval Required",
    moduleName: "Partnerships",
    subject: "Your approval is required — {brand_name}",
    variables: JSON.stringify(COMMON_VARS),
    langContent: {
      en: buildPartnershipEmail({
        theme: "yellow",
        title: "Ownership Approval Required",
        introHtml: `<p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">Your approval is required for a partnership agreement in <strong>{brand_name}</strong>.</p>`,
        rows: [
          { label: "Partner receiving", value: "{partner_name}" },
          { label: "Ownership share", value: "{current_ownership}" },
          { label: "Minimum ownership", value: "{minimum_ownership}" },
          { label: "Available ownership", value: "{available_ownership}" },
        ],
        ctaHtml: CTA,
      }),
    },
  },
  {
    name: "Ownership Approved",
    moduleName: "Partnerships",
    subject: "Ownership approved — {brand_name}",
    variables: JSON.stringify(COMMON_VARS),
    langContent: {
      en: buildPartnershipEmail({
        theme: "green",
        title: "Ownership Approved",
        introHtml: `<p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">The ownership change for <strong>{brand_name}</strong> has been approved.</p>`,
        rows: [
          { label: "Partner", value: "{partner_name}" },
          { label: "New ownership", value: "{new_ownership}" },
          { label: "Minimum ownership", value: "{minimum_ownership}" },
          { label: "Approved on", value: "{approved_on}" },
        ],
        ctaHtml: CTA,
      }),
    },
  },
  {
    name: "Ownership Rejected",
    moduleName: "Partnerships",
    subject: "Ownership request rejected — {brand_name}",
    variables: JSON.stringify(COMMON_VARS),
    langContent: {
      en: buildPartnershipEmail({
        theme: "red",
        title: "Ownership Rejected",
        introHtml: `<p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">The ownership request for <strong>{brand_name}</strong> has been rejected.</p>`,
        rows: [
          { label: "Partner", value: "{partner_name}" },
          { label: "Requested ownership", value: "{proposed_ownership}" },
          { label: "Reason", value: "{reason}" },
          { label: "Rejected on", value: "{rejected_on}" },
        ],
        ctaHtml: CTA,
      }),
    },
  },
  {
    name: "Ownership Transfer Request",
    moduleName: "Partnerships",
    subject: "Ownership transfer request — {brand_name}",
    variables: JSON.stringify(COMMON_VARS),
    langContent: {
      en: buildPartnershipEmail({
        theme: "purple",
        title: "Ownership Transfer Request",
        introHtml: `<p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">A request has been submitted to transfer ownership to you in <strong>{brand_name}</strong>.</p>`,
        rows: [
          { label: "Ownership share", value: "{current_ownership}" },
          { label: "Minimum ownership", value: "{minimum_ownership}" },
          { label: "From partners", value: "{from_partners}" },
          { label: "Status", value: "Pending approval" },
        ],
        ctaHtml: CTA,
      }),
    },
  },
  {
    name: "Ownership Transfer Approved",
    moduleName: "Partnerships",
    subject: "Ownership transfer approved — {brand_name}",
    variables: JSON.stringify(COMMON_VARS),
    langContent: {
      en: buildPartnershipEmail({
        theme: "green",
        title: "Ownership Transfer Approved",
        introHtml: `<p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">Your ownership transfer in <strong>{brand_name}</strong> has been approved.</p>`,
        rows: [
          { label: "Partner", value: "{partner_name}" },
          { label: "Ownership share", value: "{new_ownership}" },
          { label: "Minimum ownership", value: "{minimum_ownership}" },
          { label: "Approved on", value: "{approved_on}" },
        ],
        ctaHtml: CTA,
      }),
    },
  },
  {
    name: "Ownership Conflict Notification",
    moduleName: "Partnerships",
    subject: "Ownership conflict — {brand_name}",
    variables: JSON.stringify(COMMON_VARS),
    langContent: {
      en: buildPartnershipEmail({
        theme: "red",
        title: "Ownership Conflict",
        introHtml: `<p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">An ownership request for <strong>{brand_name}</strong> could not be completed because it exceeds the 100% ownership limit.</p>`,
        rows: [
          { label: "Partner", value: "{partner_name}" },
          { label: "Requested ownership", value: "{proposed_ownership}" },
          { label: "Minimum ownership", value: "{minimum_ownership}" },
          { label: "Conflict", value: "{conflict_message}" },
        ],
        ctaHtml: CTA,
      }),
    },
  },
  {
    name: "Partner Removed",
    moduleName: "Partnerships",
    subject: "Partnership ended — {brand_name}",
    variables: JSON.stringify(COMMON_VARS),
    langContent: {
      en: buildPartnershipEmail({
        theme: "red",
        title: "Partner Removed",
        introHtml: `<p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">Your partnership with <strong>{brand_name}</strong> has ended and your ownership has been cleared.</p>`,
        rows: [
          { label: "Partner", value: "{partner_name}" },
          { label: "Brand", value: "{brand_name}" },
          { label: "Reason", value: "{reason}" },
        ],
        ctaHtml: CTA,
      }),
    },
  },
  {
    name: "New Brand Created",
    moduleName: "Partnerships",
    subject: "New brand created — {brand_name}",
    variables: JSON.stringify(COMMON_VARS),
    langContent: {
      en: buildPartnershipEmail({
        theme: "blue",
        title: "New Brand Created",
        introHtml: `<p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">A new brand <strong>{brand_name}</strong> has been created in the partnership program.</p>`,
        rows: [
          { label: "Brand", value: "{brand_name}" },
          { label: "Primary holder", value: "{partner_name}" },
          { label: "Initial ownership", value: "{current_ownership}" },
          { label: "Minimum ownership", value: "{minimum_ownership}" },
        ],
        ctaHtml: CTA,
      }),
    },
  },
];

module.exports = { TEMPLATES, COMMON_VARS };
