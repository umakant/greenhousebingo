# Edit Company Form – Test Checklist

Use this to manually test the Edit Company form. Log in as **superadmin**.

## Navigation

- [ ] Go to **Companies** (`/companies`).
- [ ] Click **Edit** on a company row (or open `/companies/[id]/edit`).
- [ ] Page title: **Edit company**; breadcrumbs: **Companies > Edit**.

## Load

- [ ] Form shows **Loading...** then populates.
- [ ] **Company details**: Module, Generate ID button, Company ID, Status, Company Name *, Company Email *, Mobile No, Language are filled from the company.
- [ ] **Company settings**: Company Website, Company Phone, Address (Street, City, State, Zip), Default Currency, GST/VAT Number, Logo light (path/url) with Upload are filled from settings.

## Company details

- [ ] **Module** dropdown shows current business module; changing it does not auto-fill Company ID (user can click **Generate ID**).
- [ ] **Generate ID** button: with a module selected, click **Generate ID** → Company ID updates.
- [ ] **Company ID** is editable.
- [ ] **Status**: Active / Inactive.
- [ ] **Company Name** and **Company Email** required; validation on save if empty.
- [ ] **Mobile No** and **Language** editable.

## Company settings

- [ ] **Company Website**: edit and blur → `https://` is added if missing.
- [ ] **Company Phone**: accepts (000) 000-0000 style input.
- [ ] **Address**: Street (with autocomplete if API key set), City, State, Zip Code.
- [ ] **Default Currency** and **GST/VAT Number** editable.
- [ ] **Logo light**: text input for URL; **Upload** opens file picker, uploads to Cloudinary, then sets URL in the field.

## Save

- [ ] Click **Save changes** → PATCH `/api/companies/[id]` with JSON body (status, name, email, mobile_no, company_id, language, settings).
- [ ] On success: redirect to `/companies/[id]` (or callback if `redirectOnSuccess` false).
- [ ] On error: message shown in red at top of form.
- [ ] **Cancel** → navigates back to company detail or companies list.

## API

- [ ] **GET /api/companies/[id]** (superadmin): returns `company`, `company_settings`, `businessModule`, `stats`.
- [ ] **PATCH /api/companies/[id]** (superadmin): accepts `status`, `name`, `email`, `mobile_no`, `company_id`, `language`, `settings` (object). Persists user fields and each `settings` key as company setting.
