"use client";

import { appAlert } from "@/lib/app-confirm";

import * as React from "react";
import { FileText, MoreVertical, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export type LicenseSlotFile = {
  fileName: string;
  dataUrl: string;
  mime: string;
};

/** Per-card uploads keyed by card `key`. */
export type LicenseDocumentsValue = Record<string, { front?: LicenseSlotFile; back?: LicenseSlotFile }>;

export type LicenseCardConfig = {
  key: string;
  title: string;
  subtitle: string;
  /** Shown as small footer line inside the card */
  footer?: string;
};

export const DEFAULT_LICENSE_DOCUMENT_CARDS: LicenseCardConfig[] = [
  {
    key: "fl_dl",
    title: "Florida — Driver's License",
    subtitle: "Number and expiry come from Personal Info. Upload scans here.",
    footer: "Driver's license",
  },
  {
    key: "ssn",
    title: "Social Security Card",
    subtitle: "SSN on file is from Personal Info. Upload card images here.",
    footer: "Social Security card",
  },
  {
    key: "fl_armed",
    title: "Florida — Armed",
    subtitle: "To change license type, number, or expiration dates, use Onboarding Packet → State Licenses.",
    footer: "Armed security license",
  },
  {
    key: "fl_unarmed",
    title: "Florida — Unarmed",
    subtitle: "To change license type, number, or expiration dates, use Onboarding Packet → State Licenses.",
    footer: "Unarmed security license",
  },
];

export function parseLicenseDocumentCards(options: unknown): LicenseCardConfig[] {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    return DEFAULT_LICENSE_DOCUMENT_CARDS;
  }
  const cards = (options as { cards?: unknown }).cards;
  if (!Array.isArray(cards) || cards.length === 0) return DEFAULT_LICENSE_DOCUMENT_CARDS;
  const out: LicenseCardConfig[] = [];
  for (const c of cards) {
    if (!c || typeof c !== "object") continue;
    const o = c as Record<string, unknown>;
    const key = String(o.key ?? "").trim();
    const title = String(o.title ?? "").trim();
    if (!key || !title) continue;
    out.push({
      key,
      title,
      subtitle: String(o.subtitle ?? ""),
      footer: o.footer != null ? String(o.footer) : undefined,
    });
  }
  return out.length > 0 ? out : DEFAULT_LICENSE_DOCUMENT_CARDS;
}

function readFileAsDataUrl(file: File): Promise<LicenseSlotFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      resolve({ fileName: file.name, dataUrl, mime: file.type || "application/octet-stream" });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface LicenseDocumentsFieldProps {
  fieldId: string;
  label: string;
  options: unknown;
  value: LicenseDocumentsValue | undefined;
  onChange: (v: LicenseDocumentsValue) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function LicenseDocumentsField({
  label,
  options,
  value,
  onChange,
  error,
  disabled,
  required,
}: LicenseDocumentsFieldProps) {
  const cards = React.useMemo(() => parseLicenseDocumentCards(options), [options]);
  const state = value ?? {};

  async function setSlot(
    cardKey: string,
    side: "front" | "back",
    file: File | null,
  ) {
    const next = { ...state };
    const cur = { ...(next[cardKey] ?? {}) };
    if (!file) {
      delete cur[side];
    } else {
      if (file.size > MAX_BYTES) {
        await appAlert("File must be 5MB or smaller (JPG, PNG, or PDF).", { type: "error" });
        return;
      }
      const slot = await readFileAsDataUrl(file);
      cur[side] = slot;
    }
    if (!cur.front && !cur.back) {
      delete next[cardKey];
    } else {
      next[cardKey] = cur;
    }
    onChange(next);
  }

  return (
    <div className="space-y-3 col-span-full">
      <p className="text-sm font-medium text-slate-900">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => {
          const slot = state[card.key] ?? {};
          return (
            <div
              key={card.key}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3"
            >
              <div>
                <h4 className="font-semibold text-slate-900 text-sm leading-snug">{card.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{card.subtitle}</p>
              </div>

              <div className="flex items-start gap-2">
                <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                  <UploadSlot
                    label="Front"
                    file={slot.front}
                    disabled={disabled}
                    onFile={(f) => void setSlot(card.key, "front", f)}
                    onClear={() => void setSlot(card.key, "front", null)}
                  />
                  <UploadSlot
                    label="Back"
                    file={slot.back}
                    disabled={disabled}
                    onFile={(f) => void setSlot(card.key, "back", f)}
                    onClear={() => void setSlot(card.key, "back", null)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-slate-500">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        void setSlot(card.key, "front", null);
                        void setSlot(card.key, "back", null);
                      }}
                    >
                      Clear front & back
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {card.footer && (
                <p className="text-[11px] text-muted-foreground pt-1 border-t border-slate-100">
                  {card.footer}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-[11px] text-muted-foreground">JPG, PNG, or PDF — max 5MB per file.</p>
    </div>
  );
}

function UploadSlot({
  label,
  file,
  disabled,
  onFile,
  onClear,
}: {
  label: string;
  file?: LicenseSlotFile;
  disabled?: boolean;
  onFile: (f: File | null) => void;
  onClear: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="min-w-0 flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <div
        className={cn(
          "relative rounded-md border border-dashed min-h-[120px] flex flex-col items-center justify-center overflow-hidden",
          file ? "border-slate-200 bg-slate-50/50" : "border-blue-300/80 bg-blue-50/30 hover:bg-blue-50/60",
        )}
      >
        {file ? (
          <>
            {file.mime.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={file.dataUrl} alt="" className="max-h-[112px] w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-1 p-3 text-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <span className="text-xs text-slate-700 break-all px-2">{file.fileName}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClear}
              className="absolute top-1 right-1 rounded-full bg-white/90 p-1 shadow border border-slate-200 hover:bg-white"
              aria-label="Remove file"
            >
              <X className="h-3.5 w-3.5 text-slate-600" />
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 w-full h-full py-4 px-2 text-center"
          >
            <Upload className="h-7 w-7 text-blue-600" />
            <span className="text-xs text-blue-700 font-medium">Upload {label.toLowerCase()}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">JPG, PNG, or PDF — max 5MB</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            e.target.value = "";
            onFile(f);
          }}
        />
      </div>
    </div>
  );
}

/** True if every card has both front and back (strict). */
export function isLicenseDocumentsComplete(
  value: unknown,
  options: unknown,
): boolean {
  const cards = parseLicenseDocumentCards(options);
  if (!value || typeof value !== "object") return false;
  const o = value as LicenseDocumentsValue;
  return cards.every((c) => {
    const s = o[c.key];
    return !!(s?.front && s?.back);
  });
}

/** True if at least one file uploaded anywhere (lenient). */
export function hasAnyLicenseUpload(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const o = value as LicenseDocumentsValue;
  return Object.values(o).some((s) => s?.front || s?.back);
}
