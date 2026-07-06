"use client";

import { AccountGenericList, type ColDef, type FieldDef } from "./account-generic-list";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "check", label: "Check" },
  { value: "credit_card", label: "Credit Card" },
  { value: "online", label: "Online Payment" },
  { value: "other", label: "Other" },
];

const STATUSES_FULL = [
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
];

const NOTE_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const REVENUE_COLUMNS: ColDef[] = [
  { key: "reference_number", label: "Reference" },
  { key: "customer", label: "Customer", nestedKey: "company_name" },
  { key: "date", label: "Date", format: "date" },
  { key: "amount", label: "Amount", format: "money" },
  { key: "category", label: "Category" },
  { key: "payment_method", label: "Payment Method" },
  { key: "status", label: "Status", format: "badge" },
];

const REVENUE_FIELDS: FieldDef[] = [
  { type: "date", key: "date", label: "Date", required: true },
  { type: "currency", key: "amount", label: "Amount", required: true },
  { type: "remoteSelect", key: "customer_id", label: "Customer", apiUrl: "/api/account/customers", labelKey: "company_name" },
  { type: "text", key: "category", label: "Category", placeholder: "e.g. Sales, Services..." },
  { type: "text", key: "description", label: "Description" },
  { type: "remoteSelect", key: "bank_account_id", label: "Bank Account", apiUrl: "/api/account/bank-accounts", labelKey: "account_name" },
  { type: "select", key: "payment_method", label: "Payment Method", options: PAYMENT_METHODS },
  { type: "select", key: "status", label: "Status", options: STATUSES_FULL },
  { type: "textarea", key: "notes", label: "Notes" },
];

const EXPENSE_COLUMNS: ColDef[] = [
  { key: "reference_number", label: "Reference" },
  { key: "vendor", label: "Vendor", nestedKey: "name" },
  { key: "date", label: "Date", format: "date" },
  { key: "amount", label: "Amount", format: "money" },
  { key: "category", label: "Category" },
  { key: "payment_method", label: "Payment Method" },
  { key: "status", label: "Status", format: "badge" },
];

const EXPENSE_FIELDS: FieldDef[] = [
  { type: "date", key: "date", label: "Date", required: true },
  { type: "currency", key: "amount", label: "Amount", required: true },
  { type: "remoteSelect", key: "vendor_id", label: "Vendor", apiUrl: "/api/account/vendors", labelKey: "name" },
  { type: "text", key: "category", label: "Category", placeholder: "e.g. Rent, Utilities..." },
  { type: "text", key: "description", label: "Description" },
  { type: "remoteSelect", key: "bank_account_id", label: "Bank Account", apiUrl: "/api/account/bank-accounts", labelKey: "account_name" },
  { type: "select", key: "payment_method", label: "Payment Method", options: PAYMENT_METHODS },
  { type: "select", key: "status", label: "Status", options: STATUSES_FULL },
  { type: "textarea", key: "notes", label: "Notes" },
];

const VENDOR_PAYMENT_COLUMNS: ColDef[] = [
  { key: "reference_number", label: "Reference" },
  { key: "vendor", label: "Vendor", nestedKey: "name" },
  { key: "payment_date", label: "Payment Date", format: "date" },
  { key: "amount", label: "Amount", format: "money" },
  { key: "payment_method", label: "Method" },
  { key: "reference", label: "Ref" },
  { key: "status", label: "Status", format: "badge" },
];

const VENDOR_PAYMENT_FIELDS: FieldDef[] = [
  { type: "remoteSelect", key: "vendor_id", label: "Vendor", required: true, apiUrl: "/api/account/vendors", labelKey: "name" },
  { type: "date", key: "payment_date", label: "Payment Date", required: true },
  { type: "currency", key: "amount", label: "Amount", required: true },
  { type: "select", key: "payment_method", label: "Payment Method", options: PAYMENT_METHODS },
  { type: "remoteSelect", key: "bank_account_id", label: "Bank Account", apiUrl: "/api/account/bank-accounts", labelKey: "account_name" },
  { type: "text", key: "reference", label: "Reference" },
  { type: "select", key: "status", label: "Status", options: STATUSES_FULL },
  { type: "textarea", key: "notes", label: "Notes" },
];

const CUSTOMER_PAYMENT_COLUMNS: ColDef[] = [
  { key: "reference_number", label: "Reference" },
  { key: "customer", label: "Customer", nestedKey: "company_name" },
  { key: "payment_date", label: "Payment Date", format: "date" },
  { key: "amount", label: "Amount", format: "money" },
  { key: "payment_method", label: "Method" },
  { key: "reference", label: "Ref" },
  { key: "status", label: "Status", format: "badge" },
];

const CUSTOMER_PAYMENT_FIELDS: FieldDef[] = [
  { type: "remoteSelect", key: "customer_id", label: "Customer", required: true, apiUrl: "/api/account/customers", labelKey: "company_name" },
  { type: "date", key: "payment_date", label: "Payment Date", required: true },
  { type: "currency", key: "amount", label: "Amount", required: true },
  { type: "select", key: "payment_method", label: "Payment Method", options: PAYMENT_METHODS },
  { type: "remoteSelect", key: "bank_account_id", label: "Bank Account", apiUrl: "/api/account/bank-accounts", labelKey: "account_name" },
  { type: "text", key: "reference", label: "Reference" },
  { type: "select", key: "status", label: "Status", options: STATUSES_FULL },
  { type: "textarea", key: "notes", label: "Notes" },
];

const DEBIT_NOTE_COLUMNS: ColDef[] = [
  { key: "reference_number", label: "Reference" },
  { key: "vendor", label: "Vendor", nestedKey: "name" },
  { key: "date", label: "Date", format: "date" },
  { key: "amount", label: "Amount", format: "money" },
  { key: "reason", label: "Reason" },
  { key: "status", label: "Status", format: "badge" },
];

const DEBIT_NOTE_FIELDS: FieldDef[] = [
  { type: "date", key: "date", label: "Date", required: true },
  { type: "currency", key: "amount", label: "Amount", required: true },
  { type: "remoteSelect", key: "vendor_id", label: "Vendor", apiUrl: "/api/account/vendors", labelKey: "name" },
  { type: "textarea", key: "reason", label: "Reason" },
  { type: "select", key: "status", label: "Status", options: NOTE_STATUSES },
  { type: "textarea", key: "notes", label: "Notes" },
];

const CREDIT_NOTE_COLUMNS: ColDef[] = [
  { key: "reference_number", label: "Reference" },
  { key: "customer", label: "Customer", nestedKey: "company_name" },
  { key: "date", label: "Date", format: "date" },
  { key: "amount", label: "Amount", format: "money" },
  { key: "reason", label: "Reason" },
  { key: "status", label: "Status", format: "badge" },
];

const CREDIT_NOTE_FIELDS: FieldDef[] = [
  { type: "date", key: "date", label: "Date", required: true },
  { type: "currency", key: "amount", label: "Amount", required: true },
  { type: "remoteSelect", key: "customer_id", label: "Customer", apiUrl: "/api/account/customers", labelKey: "company_name" },
  { type: "textarea", key: "reason", label: "Reason" },
  { type: "select", key: "status", label: "Status", options: NOTE_STATUSES },
  { type: "textarea", key: "notes", label: "Notes" },
];

type SectionConfig = {
  apiUrl: string;
  title: string;
  createLabel: string;
  columns: ColDef[];
  fields: FieldDef[];
  statusFilter?: boolean;
  managePerm: string;
};

const SECTION_CONFIG: Record<string, SectionConfig> = {
  revenues: {
    apiUrl: "/api/account/revenues",
    title: "Revenue",
    createLabel: "Add Revenue",
    columns: REVENUE_COLUMNS,
    fields: REVENUE_FIELDS,
    statusFilter: true,
    managePerm: "manage-revenues",
  },
  expenses: {
    apiUrl: "/api/account/expenses",
    title: "Expense",
    createLabel: "Add Expense",
    columns: EXPENSE_COLUMNS,
    fields: EXPENSE_FIELDS,
    statusFilter: true,
    managePerm: "manage-expenses",
  },
  "vendor-payments": {
    apiUrl: "/api/account/vendor-payments",
    title: "Vendor Payment",
    createLabel: "Add Payment",
    columns: VENDOR_PAYMENT_COLUMNS,
    fields: VENDOR_PAYMENT_FIELDS,
    statusFilter: true,
    managePerm: "manage-vendor-payments",
  },
  "customer-payments": {
    apiUrl: "/api/account/customer-payments",
    title: "Customer Payment",
    createLabel: "Add Payment",
    columns: CUSTOMER_PAYMENT_COLUMNS,
    fields: CUSTOMER_PAYMENT_FIELDS,
    statusFilter: true,
    managePerm: "manage-customer-payments",
  },
  "debit-notes": {
    apiUrl: "/api/account/debit-notes",
    title: "Debit Note",
    createLabel: "Add Debit Note",
    columns: DEBIT_NOTE_COLUMNS,
    fields: DEBIT_NOTE_FIELDS,
    statusFilter: true,
    managePerm: "manage-debit-notes",
  },
  "credit-notes": {
    apiUrl: "/api/account/credit-notes",
    title: "Credit Note",
    createLabel: "Add Credit Note",
    columns: CREDIT_NOTE_COLUMNS,
    fields: CREDIT_NOTE_FIELDS,
    statusFilter: true,
    managePerm: "manage-credit-notes",
  },
};

export function AccountSectionAdmin({ section, permissions }: { section: string; permissions: string[] }) {
  const config = SECTION_CONFIG[section];
  if (!config) return null;

  return (
    <AccountGenericList
      apiUrl={config.apiUrl}
      title={config.title}
      createLabel={config.createLabel}
      columns={config.columns}
      fields={config.fields}
      permissions={permissions}
      managePerm={config.managePerm}
      statusFilter={config.statusFilter}
    />
  );
}
