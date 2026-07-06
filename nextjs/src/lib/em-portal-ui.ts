/** Client-safe helpers for expense portal (customer / employee / vendor) vs company admin UI. */

export {
  canManageAllOrganizationExpenses,
  isEmPortalSubmitterRole,
  isEmPortalSubmitterType,
} from "@/lib/em-access";
