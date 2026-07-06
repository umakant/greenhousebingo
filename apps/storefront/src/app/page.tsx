import { env } from "@/env";
import { Button } from "@repo/ui";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {env.NEXT_PUBLIC_APP_NAME}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tenant-scoped public storefront (App Router).
        </p>
      </header>
      <section className="flex flex-wrap gap-3">
        <Button type="button">Shop</Button>
        <Button type="button" variant="outline">
          Categories
        </Button>
      </section>
    </main>
  );
}
