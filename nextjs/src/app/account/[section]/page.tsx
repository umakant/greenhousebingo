import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { AccountDashboard } from "@/components/account-dashboard";
import { AccountSectionAdmin } from "@/components/account/account-section-admin";
import AccountBankTransactionsAdmin from "@/components/account/account-bank-transactions-admin";
import AccountBankTransfersAdmin from "@/components/account/account-bank-transfers-admin";
import AccountBankAccountsAdmin from "@/components/account/account-bank-accounts-admin";
import AccountChartOfAccountsAdmin from "@/components/account/account-chart-of-accounts-admin";
import AccountReportsAdmin from "@/components/account/account-reports-admin";
import AccountSetupAdmin from "@/components/account/account-setup-admin";
import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import { t } from "@/lib/admin-t";


const SECTION_TITLES: Record<string, string> = {
  finance: t("Finance"),
  customers: t("Customers"),
  vendors: t("Vendors"),
  "bank-accounts": t("Bank Accounts"),
  "bank-transactions": t("Bank Transactions"),
  "bank-transfers": t("Bank Transfers"),
  "chart-of-accounts": t("Chart Of Accounts"),
  "vendor-payments": t("Vendor Payments"),
  "customer-payments": t("Customer Payments"),
  revenues: t("Revenue"),
  expenses: t("Expense"),
  "debit-notes": t("Debit Notes"),
  "credit-notes": t("Credit Notes"),
  reports: t("Reports"),
  setup: t("System Setup"),
};

const PAGE_TITLES: Record<string, string> = {
  finance: t("Finance"),
  revenues: t("Manage Revenue"),
  expenses: t("Manage Expenses"),
  "vendor-payments": t("Manage Vendor Payments"),
  "customer-payments": t("Manage Customer Payments"),
  "debit-notes": t("Manage Debit Notes"),
  "credit-notes": t("Manage Credit Notes"),
  "bank-accounts": t("Bank Accounts"),
  "bank-transactions": t("Bank Transactions"),
  "bank-transfers": t("Bank Transfers"),
  "chart-of-accounts": t("Chart Of Accounts"),
  reports: t("Accounting Reports"),
  setup: t("System Setup"),
};

export default async function AccountSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const { section } = await params;
  const navTitle = SECTION_TITLES[section] ?? section.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const pageTitle = PAGE_TITLES[section] ?? `Manage ${navTitle}`;

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  function renderContent() {
    switch (section) {
      case "finance":
        return <AccountDashboard />;
      case "bank-accounts":
        return <AccountBankAccountsAdmin permissions={permissions} />;
      case "bank-transactions":
        return <AccountBankTransactionsAdmin permissions={permissions} />;
      case "bank-transfers":
        return <AccountBankTransfersAdmin permissions={permissions} />;
      case "chart-of-accounts":
        return <AccountChartOfAccountsAdmin permissions={permissions} />;
      case "reports":
        return <AccountReportsAdmin permissions={permissions} />;
      case "setup":
        return <AccountSetupAdmin permissions={permissions} />;
      case "revenues":
      case "expenses":
      case "vendor-payments":
      case "customer-payments":
      case "debit-notes":
      case "credit-notes":
        return <AccountSectionAdmin section={section} permissions={permissions} />;
      default:
        return (
          <div className="rounded-lg border bg-card p-6 text-muted-foreground">
            {navTitle} — {t("This section is not yet configured.")}
          </div>
        );
    }
  }

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: section === "finance" ? t("Accounting") : t("Account Dashboard"), url: "/account" },
        { label: navTitle },
      ]}
      pageTitle={pageTitle}
    >
      {renderContent()}
    </AuthenticatedLayout>
  );
}
