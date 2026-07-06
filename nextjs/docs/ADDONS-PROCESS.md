# Add-ons: Laravel and Next.js

Only **11 add-ons** are supported, matching the Laravel Add-ons Manager UI:

| Module (DB key)     | Display name                   | Package (Laravel)   |
|--------------------|--------------------------------|--------------------|
| Taskly             | Project                        | taskly              |
| Account            | Accounting                     | account             |
| Hrm                | HRM                            | hrm                 |
| Lead               | CRM                            | lead                |
| Pos                | POS                            | pos                 |
| RecurringInvoiceBill | Recurring Invoice/Purchase   | recurring-invoice-bill |
| Recruitment        | Recruitment                    | recruitment         |
| Appointment        | Appointment                    | appointment         |
| Stripe             | Stripe                         | stripe              |
| Paypal             | Paypal                         | paypal              |
| BusinessModules    | Business Modules               | (no package; for_admin) |

The `add_ons` table uses `module` as the unique key. Plan `modules` arrays store these same values (e.g. `"Account"`, `"Lead"`).

---

## Laravel: How add-ons are added

1. **Enable a module (UI)**  
   In Add-ons Manager, enabling a module that is not yet in `add_ons`:
   - Runs migrations for `packages/workdo/{name}/`
   - Runs `package:seed {name}`
   - Reads `packages/workdo/{name}/module.json`
   - Creates an `AddOn` with: `module` = `data['name']`, `name` = `data['alias']`, `monthly_price`, `yearly_price`, `package_name`, `for_admin`, `priority`  
   (See `App\Http\Controllers\ModuleController::enable()`.)

2. **PackageSeeder**  
   Loops over `packages/workdo/*/module.json` and creates an `AddOn` for each package if one does not exist. This can create add-ons for packages that are not in the 11 (e.g. ProductService, LandingPage/CMS).

3. **Keeping only the 11**  
   Run:
   ```bash
   php artisan db:seed --class=AddonsOnlySeeder
   ```
   This deletes any `add_ons` row whose `module` is not in the allowed list and ensures `BusinessModules` exists.

---

## Next.js: How add-ons are synced

1. **Canonical list (recommended)**  
   Run:
   ```bash
   cd nextjs && node scripts/seed-add-ons-manager.js
   ```
   - Defines the 11 add-ons (same `module` and display names as above).
   - **Deletes** any `add_ons` row whose `module` is not in this list.
   - Creates or updates the 11 rows. Use this to reset add-ons to the official list and remove extras.

2. **From Laravel packages (optional)**  
   Run:
   ```bash
   cd nextjs && node scripts/seed-add-ons-from-packages.js
   ```
   - Reads `packages/workdo/*/module.json` (from the repo root).
   - **Only upserts** add-ons whose `module` is in the allowed list (Taskly, Account, Hrm, Lead, Pos, RecurringInvoiceBill, Recruitment, Appointment, Stripe, Paypal).  
   - Skips ProductService, LandingPage, etc., so it does not re-add removed add-ons.

---

## Summary

- **Single source of truth:** The 11 add-ons above.  
- **Laravel:** Use Add-ons Manager to enable/disable; run `AddonsOnlySeeder` to remove any add-on not in the 11.  
- **Next.js:** Run `seed-add-ons-manager.js` to enforce the 11 and remove others; optionally run `seed-add-ons-from-packages.js` to sync from package `module.json` for those 10 with packages.
