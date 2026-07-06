"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  Pencil,
  Eye,
  Trash2,
  Check,
  CreditCard,
  Play,
  ClipboardList,
  CheckCircle2,
  UserRound,
  History,
  KeyRound,
  CornerDownLeft,
  Download,
  MessageSquare,
  DollarSign,
  XCircle,
  ArrowRightLeft,
  ThumbsUp,
  ThumbsDown,
  Ban,
  RotateCcw,
  Send,
  FileText,
  Star,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatActionMenuLabel } from "@/lib/format-action-label";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ItemBase = {
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
};

export type TableActionItem =
  | (ItemBase & { href: string; onSelect?: never })
  | (ItemBase & { onSelect: () => void; href?: never });

function isLinkItem(it: TableActionItem): it is ItemBase & { href: string } {
  return typeof (it as any).href === "string";
}

const ICON_CLS = "h-4 w-4";

const LABEL_ICON_MAP: Record<string, React.ReactNode> = {
  "Edit":              <Pencil className={ICON_CLS} />,
  "Edit Salary":       <DollarSign className={ICON_CLS} />,
  "View":              <Eye className={ICON_CLS} />,
  "View Responses":    <MessageSquare className={ICON_CLS} />,
  "Delete":            <Trash2 className={ICON_CLS} />,
  "Remove":            <Trash2 className={ICON_CLS} />,
  "Approve":           <ThumbsUp className={ICON_CLS} />,
  "Approved":          <Check className={ICON_CLS} />,
  "Reject":            <ThumbsDown className={ICON_CLS} />,
  "Cancel":            <XCircle className={ICON_CLS} />,
  "Mark as Paid":      <CreditCard className={ICON_CLS} />,
  "Process Payroll":   <Play className={ICON_CLS} />,
  "Mark Attendance":   <ClipboardList className={ICON_CLS} />,
  "Complete":          <CheckCircle2 className={ICON_CLS} />,
  "Impersonate":       <UserRound className={ICON_CLS} />,
  "Login history":     <History className={ICON_CLS} />,
  "Change password":   <KeyRound className={ICON_CLS} />,
  "Returned":          <CornerDownLeft className={ICON_CLS} />,
  "Download Receipt":  <Download className={ICON_CLS} />,
  "Convert To":        <ArrowRightLeft className={ICON_CLS} />,
  "Send":              <Send className={ICON_CLS} />,
  "Details":           <FileText className={ICON_CLS} />,
  "Scheduled Maintenance": <Clock className={ICON_CLS} />,
  "Active Assignments":    <Star className={ICON_CLS} />,
  "Active Borrow/Rent":    <RotateCcw className={ICON_CLS} />,
  "Ban":               <Ban className={ICON_CLS} />,
  "Deactivate":        <Ban className={ICON_CLS} />,
  "Activate":          <CheckCircle2 className={ICON_CLS} />,
};

function resolveIcon(it: TableActionItem): React.ReactNode {
  if (it.icon !== undefined) return it.icon;
  return LABEL_ICON_MAP[it.label] ?? null;
}

export function TableActionButton({
  label,
  primaryIcon,
  onPrimaryClick,
  primaryHref,
  disabled,
  items,
  className,
}: {
  label: string;
  /** Icon shown before the primary label (e.g. Eye for “View”). */
  primaryIcon?: React.ReactNode;
  onPrimaryClick?: () => void;
  primaryHref?: string;
  disabled?: boolean;
  items: TableActionItem[];
  /** Applied to the split-button wrapper (e.g. `ml-auto`, `w-full max-w-[220px]`) */
  className?: string;
}) {
  /** Preserve caller order; per-item styling when `destructive` is set. */
  const primaryBtnClass =
    "rounded-none h-8 px-3 text-xs font-medium border-0 shadow-none bg-background hover:bg-muted/60 text-foreground";
  const triggerBtnClass =
    "rounded-none h-8 px-2.5 text-xs border-0 border-l border-border shadow-none bg-background hover:bg-muted/60 text-muted-foreground";

  return (
    <DropdownMenu>
      <div
        className={cn(
          "inline-flex rounded-md overflow-hidden border border-border bg-background shadow-sm",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
          className,
        )}
      >
        {primaryHref ? (
          <Button asChild variant="ghost" size="sm" className={primaryBtnClass} disabled={disabled}>
            <Link
              href={primaryHref}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="inline-flex items-center"
            >
              {primaryIcon ? <span className="mr-1.5 inline-flex shrink-0 opacity-90">{primaryIcon}</span> : null}
              {label}
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={primaryBtnClass}
            onClick={(e) => {
              e.stopPropagation();
              onPrimaryClick?.();
            }}
            disabled={disabled}
          >
            {primaryIcon ? <span className="mr-1.5 inline-flex shrink-0 opacity-90">{primaryIcon}</span> : null}
            {label}
          </Button>
        )}

        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={triggerBtnClass}
            aria-label="Open menu"
            onClick={(e) => e.stopPropagation()}
            disabled={items.length === 0}
          >
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-[220px]">
          {items.map((it, idx) => {
            const icon = resolveIcon(it);
            const menuLabel = formatActionMenuLabel(it.label);
            const destructiveCls = it.destructive ? "text-destructive focus:text-destructive" : "";
            return isLinkItem(it) ? (
              <DropdownMenuItem key={`${it.label}-${idx}`} asChild disabled={it.disabled} className={destructiveCls}>
                <Link href={it.href} onClick={(e) => e.stopPropagation()}>
                  {icon ? <span className="mr-2 inline-flex shrink-0">{icon}</span> : null}
                  {menuLabel}
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                key={`${it.label}-${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  it.onSelect();
                }}
                disabled={it.disabled}
                className={destructiveCls}
              >
                {icon ? <span className="mr-2 inline-flex shrink-0">{icon}</span> : null}
                {menuLabel}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </div>
    </DropdownMenu>
  );
}
