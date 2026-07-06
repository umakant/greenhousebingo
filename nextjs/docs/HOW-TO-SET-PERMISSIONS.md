# How to Set Permissions

Permissions control what menu items and features a user can see and use. They are stored in the database and linked to **roles**; users get permissions through their assigned role(s).

---

## 1. Using the RBAC seed script (Next.js, quick setup)

The demo seed creates roles and permissions and assigns them to roles. **Company** and **company_admin** users need accounting permissions to see the Accounting menu.

**Run the seed (from the `nextjs` folder):**

```bash
cd nextjs
node scripts/seed-rbac-demo.js
```

This script:

- Creates roles: `superadmin`, `company`, `staff`, `client`, `vendor`
- Creates permissions (including accounting: `manage-account`, `manage-customers`, etc.)
- Assigns permissions to roles (e.g. accounting permissions to **company**)
- Creates demo users and assigns roles

**Demo logins (password `1234`):**

- `company@example.com` → company role (includes accounting permissions after seed)
- `superadmin@example.com` → superadmin (all permissions)

After seeding, log in as **company@example.com**; the Accounting menu will appear when you are on `/account` or any `/account/*` page (if the role has at least one accounting permission).

---

## 2. Adding permissions to the seed (for new features)

To give a role a new permission via the seed:

1. Open **`nextjs/scripts/seed-rbac-demo.js`**.
2. Add the permission **name** (e.g. `manage-customers`) to the array for the right role:
   - **Company role:** `companyPermissions`
   - **Staff:** `staffPermissions`
   - **Client:** `clientPermissions`
   - **Vendor:** `vendorPermissions`
3. Re-run the seed:
   ```bash
   node scripts/seed-rbac-demo.js
   ```
   The script uses `createMany` with `skipDuplicates: true`, so existing rows are not duplicated.

The permission must exist in the `permissions` table. The seed builds the list from all role arrays, so any name you add to a role array will be created if missing.

---

## 3. Setting permissions in the database (any stack)

If you don’t re-run the seed, you can change permissions directly in the DB.

**Tables:**

- **`permissions`** – id, name, guard_name, add_on, module, label  
  Example: `name = 'manage-customers'`, `guard_name = 'web'`.
- **`roles`** – id, name, guard_name, …  
  Example: `name = 'company'`, `guard_name = 'web'`.
- **`role_has_permissions`** – role_id, permission_id  
  Links a role to a permission.

**Give a role a permission:**

1. Get the role id (e.g. company: often `2`) and the permission id from `permissions` (e.g. for `manage-customers`).
2. Insert a row into `role_has_permissions`:
   ```sql
   INSERT INTO role_has_permissions (role_id, permission_id)
   VALUES (2, <permission_id>)
   ON CONFLICT DO NOTHING;
   ```
   (Adjust for your DB syntax if needed.)

**Assign a role to a user:**

- **`model_has_roles`** – model_id (user id), role_id  
  One row per user–role pair.

After changing the database, the user must log in again (or you must refresh the session) so the app can reload permissions (e.g. from cookies or session).

---

## 4. Using Laravel (if your app uses Laravel)

If you use the Laravel side of the project:

1. **Seed Account (and other) permissions**
   - Run the Account package seeder so all accounting permissions exist and are assigned to the company role:
   ```bash
   php artisan db:seed --class="Workdo\Account\Database\Seeders\PermissionTableSeeder"
   ```
   (Or your app’s equivalent seeder that calls it.)

2. **Roles / Users UI**
   - Use the Laravel admin UI for **Roles** (and optionally **Users**) to attach or detach permissions to/from roles. That will update `role_has_permissions` (and possibly `model_has_roles` for user–role assignment).

3. **Same database as Next.js**
   - If Next.js and Laravel share the same database, any permissions and role–permission links you create or change in Laravel (seed or UI) are visible to Next.js. Users need to log in again in the Next.js app so their permissions are refreshed.

---

## 5. Accounting menu permissions (reference)

The Accounting left menu is shown when the user is on `/account` or `/account/*` **and** has at least one of these permissions:

| Permission | Menu / feature |
|------------|-----------------|
| `manage-account` | Full Accounting (all children) |
| `manage-account-dashboard` | Account Dashboard |
| `manage-customers` | Customers |
| `manage-vendors` | Vendors |
| `manage-bank-accounts` | Bank Accounts |
| `manage-bank-transactions` | Bank Transactions |
| `manage-bank-transfers` | Bank Transfers |
| `manage-chart-of-accounts` | Chart Of Accounts |
| `manage-vendor-payments` | Vendor Payments |
| `manage-customer-payments` | Customer Payments |
| `manage-revenues` | Revenue |
| `manage-expenses` | Expense |
| `manage-debit-notes` | Debit Notes |
| `manage-credit-notes` | Credit Notes |
| `manage-account-reports` | Reports |
| `manage-account-types` | System Setup |

Give the **company** (or **company_admin**) role at least one of these so that the Accounting menu appears on the account dashboard. The seed script is the fastest way to do that in Next.js.
