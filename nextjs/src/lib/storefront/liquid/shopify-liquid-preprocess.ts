/**
 * Shopify-only Liquid constructs that LiquidJS does not implement.
 * We strip block wrappers but keep inner markup so classic ThemeForest themes still parse.
 */

function stripBalancedBlock(
  liquid: string,
  openRe: RegExp,
  closeRe: RegExp,
): string {
  let s = liquid;
  for (;;) {
    openRe.lastIndex = 0;
    const m = openRe.exec(s);
    if (!m) break;
    const start = m.index;
    const openEnd = m.index + m[0].length;
    const tail = s.slice(openEnd);
    const closeM = tail.match(closeRe);
    if (!closeM || closeM.index === undefined) break;
    const inner = tail.slice(0, closeM.index);
    const afterClose = closeM.index + closeM[0].length;
    s = s.slice(0, start) + inner + tail.slice(afterClose);
  }
  return s;
}

/** Removes `{% paginate … %} … {% endpaginate %}` pairs, preserving the inner template. */
export function stripShopifyPaginateBlocks(liquid: string): string {
  return stripBalancedBlock(
    liquid,
    /\{%-?\s*paginate[\s\S]*?-?%\}/gi,
    /\{%-?\s*endpaginate\s*-?%\}/i,
  );
}

/** Removes `{% form … %} … {% endform %}` pairs (Shopify server forms — not supported off-platform). */
export function stripShopifyFormBlocks(liquid: string): string {
  return stripBalancedBlock(
    liquid,
    /\{%-?\s*form[\s\S]*?-?%\}/gi,
    /\{%-?\s*endform\s*-?%\}/i,
  );
}

/** Preprocess theme Liquid before LiquidJS parse (top-level templates and `{% include %}` files). */
export function preprocessShopifyThemeLiquid(liquid: string): string {
  return stripShopifyFormBlocks(stripShopifyPaginateBlocks(liquid));
}
