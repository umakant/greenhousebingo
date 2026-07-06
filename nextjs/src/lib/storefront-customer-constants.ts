/**
 * HttpOnly session cookie for B2C storefront accounts (`StorefrontCustomer` + `StorefrontCustomerSession`).
 * Independent from staff/admin `pf_*` cookies — never infer customer identity from `pf_email`.
 */
export const STOREFRONT_CUSTOMER_SESSION_COOKIE = "sfc_session";

export const STOREFRONT_CUSTOMER_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 14;

export const STOREFRONT_RESET_TOKEN_MAX_AGE_MS = 60 * 60 * 1000;
