import { featureColumns } from "./featuresData";

export function FeaturesMegaMenu({ onClose }: { onClose?: () => void }) {
  return (
    <div className="border-t-2 border-cta bg-background shadow-2xl">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1fr_1fr_1.1fr]">
          {featureColumns.map((col) => (
            <div key={col.heading}>
              <h3 className="mb-6 text-lg font-bold text-foreground">{col.heading}</h3>
              <ul className="space-y-5">
                {col.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.title}>
                      <a
                        href="#"
                        onClick={onClose}
                        className="group flex gap-3 rounded-lg -mx-2 px-2 py-1.5 transition-colors hover:bg-muted"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-ink group-hover:border-cta group-hover:text-cta">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                          <span className="block text-xs text-muted-foreground">{item.description}</span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div className="rounded-2xl bg-muted/60 p-6 lg:-my-2">
            <h3 className="mb-5 text-lg font-bold text-foreground">New Features</h3>
            <div className="space-y-4">
              <FeatureCard tag="Pipelines" title="Pipelines" subtitle="Track deals & forecast revenue visually." />
              <FeatureCard tag="Inventory" title="Inventory Management" subtitle="Track materials across trucks & warehouses." />
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-5 text-center">
          <a href="#" onClick={onClose} className="text-sm font-semibold text-foreground underline underline-offset-4 hover:text-cta">
            See All Features
          </a>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ tag, title, subtitle }: { tag: string; title: string; subtitle: string }) {
  return (
    <a href="#" className="block rounded-xl border border-border bg-background p-4 transition-shadow hover:shadow-md">
      <span className="inline-block rounded-md bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-foreground">
        {tag}
      </span>
      <p className="mt-3 text-sm font-bold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </a>
  );
}
