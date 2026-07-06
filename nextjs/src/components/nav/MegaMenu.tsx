import type { LucideIcon } from "lucide-react";

export type MegaMenuItem = {
  icon: LucideIcon;
  title: string;
  description?: string;
};

export type MegaMenuColumn = {
  heading: string;
  items: MegaMenuItem[];
};

type Props = {
  columns: MegaMenuColumn[];
  footerLabel: string;
  onClose?: () => void;
};

export function MegaMenu({ columns, footerLabel, onClose }: Props) {
  return (
    <div className="border-t-2 border-cta bg-background shadow-2xl">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 lg:divide-x lg:divide-border">
          {columns.map((col, idx) => (
            <div key={col.heading} className={idx > 0 ? "lg:pl-8" : ""}>
              <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                {col.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.title}>
                      <a
                        href="#"
                        onClick={onClose}
                        className="group flex items-center gap-3 rounded-md -mx-2 px-2 py-2 transition-colors hover:bg-muted"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-ink group-hover:border-cta group-hover:text-cta">
                          <Icon className="h-4 w-4" strokeWidth={2} />
                        </span>
                        <span className="text-sm font-medium text-foreground">{item.title}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-border pt-5 text-center">
          <a
            href="#"
            onClick={onClose}
            className="text-sm font-semibold text-foreground underline underline-offset-4 hover:text-cta"
          >
            {footerLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
