import "server-only";

import fs from "fs";
import fsp from "fs/promises";
import path from "path";

import type { FS } from "liquidjs";

import { preprocessShopifyThemeLiquid } from "./shopify-liquid-preprocess";

/**
 * LiquidJS filesystem that preprocesses `.liquid` reads so included snippets
 * (e.g. `header-top.liquid`) get the same Shopify-compat stripping as top-level templates.
 */
export function createPreprocessedShopifyThemeFs(): FS {
  return {
    exists: (filepath) =>
      fsp
        .access(filepath)
        .then(() => true)
        .catch(() => false),
    existsSync: (filepath) => fs.existsSync(filepath),
    readFile: async (filepath) => preprocessShopifyThemeLiquid(await fsp.readFile(filepath, "utf8")),
    readFileSync: (filepath) => preprocessShopifyThemeLiquid(fs.readFileSync(filepath, "utf8")),
    resolve: (dir, file, ext) => {
      const joined = path.resolve(dir, file);
      /** Shopify allows `{% include 'api.jquery.custom' %}` → `api.jquery.custom.liquid` (path.extname is `.custom`, not `.liquid`). */
      return joined.endsWith(ext) ? joined : `${joined}${ext}`;
    },
    contains: async (root, file) => {
      const rootRp = await fsp.realpath(root).catch(() => root);
      const fileRp = await fsp.realpath(file).catch(() => file);
      const sep = path.sep;
      return fileRp.startsWith(rootRp + sep) || fileRp === rootRp;
    },
    containsSync: (root, file) => {
      let rootRp = root;
      let fileRp = file;
      try {
        rootRp = fs.realpathSync(root);
      } catch {
        /* keep */
      }
      try {
        fileRp = fs.realpathSync(file);
      } catch {
        /* keep */
      }
      const sep = path.sep;
      return fileRp.startsWith(rootRp + sep) || fileRp === rootRp;
    },
    sep: path.sep,
    dirname: (file) => path.dirname(file),
  };
}
