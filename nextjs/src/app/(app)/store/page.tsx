import { redirect } from "next/navigation";

/** Customer storefront lives at `/shop` (domain → website). `/store` was the generic app catch-all placeholder. */
export default function StoreAliasRedirect() {
  redirect("/shop");
}
