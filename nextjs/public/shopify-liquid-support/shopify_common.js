/**
 * Minimal globals for legacy Shopify / ThemeForest themes on Paper Flight `/shop`.
 * Full Shopify admin JS is not available; this avoids hard failures when snippets expect `Shopify`.
 */
window.Shopify = window.Shopify || {};
window.Shopify.postLink = window.Shopify.postLink || function () {};
window.Shopify.setSelectorByValue = window.Shopify.setSelectorByValue || function () {};
window.Shopify.CountryProvinceSelector =
  window.Shopify.CountryProvinceSelector ||
  function () {
    this.countryEl = null;
    this.provinceEl = null;
  };
