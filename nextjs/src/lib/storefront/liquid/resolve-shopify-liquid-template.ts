import "server-only";

import fs from "fs/promises";
import path from "path";

async function themeFileExists(themeRoot: string, rel: string): Promise<boolean> {
  const abs = path.join(themeRoot, ...rel.split("/"));
  if (!abs.startsWith(path.resolve(themeRoot))) return false;
  try {
    const st = await fs.stat(abs);
    return st.isFile();
  } catch {
    return false;
  }
}

/**
 * Maps `/shop/...` segments to a theme `templates/*.liquid` path when the file exists on disk.
 * Mirrors common Shopify storefront URL patterns (classic ThemeForest themes).
 */
export async function resolveShopifyLiquidInnerTemplate(themeRoot: string, segments: string[]): Promise<string | null> {
  const s = segments.map((x) => x.toLowerCase());
  const pick = async (rel: string): Promise<string | null> => ((await themeFileExists(themeRoot, rel)) ? rel : null);

  if (s.length === 0) {
    return pick("templates/index.liquid");
  }

  if (s[0] === "cart" && s.length === 1) {
    return pick("templates/cart.liquid");
  }

  if (s[0] === "search" && s.length === 1) {
    return (await pick("templates/search.liquid")) ?? pick("templates/search.haloroar.liquid");
  }

  if (s[0] === "collections" && s.length === 1) {
    return pick("templates/list-collections.liquid");
  }

  if (s[0] === "collections" && s[1]) {
    if (s[1] === "all") {
      const alt = await pick("templates/collection.all.liquid");
      if (alt) return alt;
    }
    return pick("templates/collection.liquid");
  }

  if (s[0] === "products" && s[1]) {
    return pick("templates/product.liquid");
  }

  if (s[0] === "pages" && s[1]) {
    const handle = s[1]!;
    const specialized = await pick(`templates/page.${handle}.liquid`);
    if (specialized) return specialized;
    return pick("templates/page.liquid");
  }

  if (s[0] === "blogs" && s[1] && s[2]) {
    return pick("templates/article.liquid");
  }

  if (s[0] === "blogs" && s[1]) {
    return pick("templates/blog.liquid");
  }

  if (s[0] === "account") {
    if (s[1] === "login" && s.length === 2) return pick("templates/customers/login.liquid");
    if (s[1] === "register" && s.length === 2) return pick("templates/customers/register.liquid");
    if (s[1] === "addresses" && s.length === 2) return pick("templates/customers/addresses.liquid");
    if (s[1] === "activate" && s.length === 2) return pick("templates/customers/activate_account.liquid");
    if (s[1] === "reset" && s.length === 2) return pick("templates/customers/reset_password.liquid");
    if (s[1] === "orders" && s[2]) return pick("templates/customers/order.liquid");
    if (s.length === 1) return pick("templates/customers/account.liquid");
  }

  return null;
}
