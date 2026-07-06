"use client";

import * as React from "react";
import Link from "next/link";

import { useAppSettings } from "@/contexts/app-settings-context";
import { useTranslation } from "@/contexts/translation-context";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatDate as fmtDateLib } from "@/lib/format-date";

export type CompanyContactRow = {
  id: string;
  customer_code: string;
  company_name: string;
  contact_person_name: string;
  contact_person_email: string;
  contact_person_mobile: string | null;
  tax_number: string | null;
  created_at: string;
};

type Props = {
  companyId: string;
};

export default function CompanyContactsSection({ companyId }: Props) {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);

  const [rows, setRows] = React.useState<CompanyContactRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/contacts`, { cache: "no-store" });
      const json = (await res.json()) as { contacts?: CompanyContactRow[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to load contacts");
      setRows(Array.isArray(json.contacts) ? json.contacts : []);
    } catch (e: unknown) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, [companyId]);

  return (
    <div className="rounded-xl border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <div className="font-medium">{t("Contacts")}</div>
          <p className="mt-1 text-xs text-muted-foreground">{t("Company contacts tab description")}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-3 text-left font-medium">{t("Customer #")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Company")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Contact person")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Email")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Mobile")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Tax number")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Added")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  {t("Loading...")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  {t("No contacts yet")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-accent/20">
                  <td className="px-4 py-3 font-mono text-xs">{r.customer_code}</td>
                  <td className="px-4 py-3 font-medium">{r.company_name}</td>
                  <td className="px-4 py-3">{r.contact_person_name}</td>
                  <td className="px-4 py-3">
                    {r.contact_person_email ? (
                      <a
                        className="text-primary hover:underline"
                        href={`mailto:${encodeURIComponent(r.contact_person_email)}`}
                      >
                        {r.contact_person_email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">{formatPhoneDisplay(r.contact_person_mobile ?? "", "—")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.tax_number?.trim() || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        {t("Contacts link hint")}{" "}
        <Link href="/account/customers" className="text-primary hover:underline">
          {t("Customers")}
        </Link>
      </div>
    </div>
  );
}
