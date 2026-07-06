export function CompanySectionError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mx-4 mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}
