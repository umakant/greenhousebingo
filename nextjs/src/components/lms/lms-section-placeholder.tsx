export function LmsSectionPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 p-8 text-center">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
