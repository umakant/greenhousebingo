"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const REPORT_LINKS = [
  { href: "/reports/sales", label: "Sales" },
  { href: "/reports/purchases", label: "Purchases" },
  { href: "/reports/expenses", label: "Expenses" },
  { href: "/reports/inventory", label: "Inventory" },
  { href: "/reports/tax", label: "Tax" },
  { href: "/reports/customers", label: "Customers" },
  { href: "/reports/vendors", label: "Vendors" },
  { href: "/reports/profit-loss", label: "Profit & Loss" },
  { href: "/reports/financial", label: "Financial" },
];

export function PosReportLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b pb-3">
        {REPORT_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              pathname === link.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
