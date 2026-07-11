"use client";

import * as React from "react";
import { Eye, FileText, History } from "lucide-react";

import { FormattedDate } from "@/components/formatted-date";
import { AddressAutocomplete, type AddressComponents } from "@/components/ui/address-autocomplete";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { formatPhoneDisplay, unformatPhone } from "@/lib/phone";

/** App-wide date/time formatting using tenant settings (dateFormat, timeFormat). */
export function useComplianceFormat() {
  const { settings } = useAppSettings();
  const fmtDate = React.useCallback(
    (value: string | Date | number | null | undefined, fallback = "—") =>
      formatDate(value, settings, fallback),
    [settings],
  );
  const fmtDateTime = React.useCallback(
    (value: string | Date | number | null | undefined, fallback = "—") =>
      formatDateTime(value, settings, fallback),
    [settings],
  );
  return { settings, fmtDate, fmtDateTime };
}

export function ComplianceDate({
  value,
  withTime = false,
  fallback = "—",
}: {
  value: string | Date | number | null | undefined;
  withTime?: boolean;
  fallback?: string;
}) {
  return <FormattedDate value={value} withTime={withTime} fallback={fallback} />;
}

export function ComplianceDateField({
  id,
  label,
  value,
  onChange,
  required,
  className,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <DatePickerInput
        id={id}
        className="mt-1 w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}

export function ComplianceAddressField({
  id,
  label,
  value,
  onChange,
  onPlaceSelect,
  className,
  placeholder,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (address: AddressComponents) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <AddressAutocomplete
        id={id}
        className="mt-1"
        value={value}
        onChange={onChange}
        onPlaceSelect={onPlaceSelect}
        placeholder={placeholder}
      />
    </div>
  );
}

export function CompliancePhoneField({
  id,
  label,
  value,
  onChange,
  className,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (displayValue: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <PhoneInput
        id={id}
        className="mt-1"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

export function complianceFormatPhoneDisplay(value: string | null | undefined, fallback = "—") {
  return formatPhoneDisplay(value ?? "", fallback);
}

export function complianceUnformatPhone(value: string) {
  return unformatPhone(value);
}

/** Relative timestamps for activity feeds and monitor last-run labels. */
export function complianceRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ComplianceRowActions({
  label = "View",
  onView,
  items = [],
  primaryIcon,
}: {
  label?: string;
  onView: () => void;
  items?: TableActionItem[];
  primaryIcon?: React.ReactNode;
}) {
  return (
    <TableActionButton
      label={label}
      primaryIcon={primaryIcon ?? <Eye className="h-4 w-4" />}
      onPrimaryClick={onView}
      items={items}
      className="ml-auto"
    />
  );
}

export function ComplianceHistoryButton({ onClick, label = "History" }: { onClick: () => void; label?: string }) {
  return (
    <TableActionButton
      label={label}
      primaryIcon={<History className="h-4 w-4" />}
      onPrimaryClick={onClick}
      items={[]}
      className="ml-auto"
    />
  );
}

export function complianceDetailsMenuItem(onSelect: () => void): TableActionItem {
  return { label: "Details", icon: <FileText className="h-4 w-4" />, onSelect };
}
