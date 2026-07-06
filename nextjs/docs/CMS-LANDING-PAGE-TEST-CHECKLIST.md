# CMS – Landing Page Settings – Test Checklist

Use this checklist to test every tab in the CMS Landing Page Settings and verify that changes **reflect on the frontend landing page** (and related public pages). Log in as **superadmin** with `manage-landing-page` permission.

**Data flow:** CMS form at `/landing-page` loads/saves via `/api/cms/landing-page`. The **public landing page** at `/` (home) uses `getLandingPageSettingsFromDb()` and renders `<LandingPage settings={...} />`. After saving in CMS, open `/` (or use "View Landing Page" / "Open full page preview") to verify.

---

## Navigation & global actions

- [ ] **Sidebar:** CMS → **Landing Page** opens `/landing-page`.
- [ ] **Breadcrumbs:** Dashboard > CMS > Landing Page (first two are links).
- [ ] **Page title:** "Landing Page Settings".
- [ ] **View Landing Page:** Opens `/` in a new tab.
- [ ] **Save Changes:** Sends PATCH with company info, `configSections`, and `adminSettings`; shows "Saved." on success.

---

## Tab 1: Setup

### 1.1 General (Company Information)

- [ ] **Company Name:** Edit, save → on frontend `/`: hero title and header use this name (e.g. "Transform Your Business with **&lt;Company Name&gt;**").
- [ ] **Contact Email:** Edit, save → verify in footer/contact section if displayed.
- [ ] **Contact Phone:** Edit, save → verify format hint and value on frontend where contact info is shown.
- [ ] **Contact Address:** Edit, save → verify on frontend where address is shown.

**Frontend check:** Open `/` after save; hero heading and header logo/text should show the new company name; footer/contact should show updated email, phone, address if those sections exist.

### 1.2 Order (Section Order)

- [ ] **Section Order:** Drag to reorder (e.g. move Hero above Header); toggle "Enable" per section.
- [ ] Save → on `/`, section order and visibility match (sections appear in the new order; disabled sections are hidden).

**Frontend check:** Disable "Stats" or "Features", save, reload `/` → those sections disappear. Reorder sections, save, reload `/` → order matches.

### 1.3 Colors

- [ ] **Primary / Secondary / Accent:** Change hex or use presets (Green, Blue, Purple, Orange, Red).
- [ ] Save → on `/`, buttons, links, and accents use the new colors (e.g. hero CTA button, footer links).

**Frontend check:** Set Primary to Blue, save, open `/` → primary-colored elements (e.g. "Start Free Trial" button) use the new color.

---

## Tab 2: Layout

Layout sub-tabs configure **Header**, **Hero**, and **Footer** (section content and variants).

### 2.1 Header

- [ ] **Header variant** (e.g. header1 … header5), **Company name**, **Logo** (dark/light), **Nav links**, **CTA text/link**, **Mobile menu** options.
- [ ] Save → on `/`, header matches variant and content (logo, nav, CTA).

**Frontend check:** Change header variant and CTA text, save, reload `/` → header layout and button text update.

### 2.2 Hero

- [ ] **Hero variant** (hero1 … hero4), **Title**, **Subtitle**, **Highlight text**, **Primary/Secondary button text and links**, **Image**.
- [ ] Save → on `/`, hero section shows new title, subtitle, buttons, and image.

**Frontend check:** Edit "Hero Content" title and "Start Free Trial" button text, save, reload `/` → hero updates. **Live Preview** (right panel) should also update without saving (in-memory state).

### 2.3 Footer

- [ ] **Footer variant**, **Company name**, **Tagline**, **Links**, **Social links**, **Copyright**, **Logo**.
- [ ] Save → on `/`, footer shows new content and layout.

**Frontend check:** Change footer tagline or copyright, save, reload `/` → footer reflects changes.

---

## Tab 3: Content

Content sub-tabs: **Stats**, **Features**, **Modules**, **Benefits**, **Gallery**, **CTA**.

### 3.1 Stats

- [ ] **Enable section**, **Variant**, **Title**, **Subtitle**, **Stats items** (value, label, icon).
- [ ] Save → on `/`, Stats block visibility, layout, and numbers/labels match.

### 3.2 Features

- [ ] **Variant**, **Title**, **Subtitle**, **Feature items** (title, description, icon).
- [ ] Save → on `/`, Features section content and layout match.

### 3.3 Modules

- [ ] **Variant**, **Title**, **Subtitle**, **Module cards** (title, description, icon, link).
- [ ] Save → on `/`, Modules section updates.

### 3.4 Benefits

- [ ] **Variant**, **Title**, **Subtitle**, **Benefit items**.
- [ ] Save → on `/`, Benefits section updates.

### 3.5 Gallery

- [ ] **Variant**, **Title**, **Subtitle**, **Gallery images** (add/remove/upload).
- [ ] Save → on `/`, Gallery section shows correct images and layout.

### 3.6 CTA

- [ ] **Variant**, **Main title**, **Subtitle**, **Primary/Secondary button text and links**, **Image** (if variant uses it).
- [ ] Save → on `/`, CTA section (e.g. final conversion block) updates.

**Frontend check (Content):** Change one section (e.g. Stats title or one stat value), save, reload `/` → that section reflects the change.

---

## Tab 4: Social

- [ ] **Stats** (social proof / stats content) and **Gallery** (social/gallery content) sub-tabs.
- [ ] Same as Content tab for Stats and Gallery; ensure Social tab edits save and appear on `/`.

---

## Tab 5: Engagement

- [ ] **Call to Action** section (variant, title, subtitle, buttons, image).
- [ ] Same as Content → CTA; save and verify on `/`.

---

## Tab 6: Page

### 6.1 Addon (Add-Ons page settings)

- [ ] **Page Title**, **Card Variant**, **Page Subtitle**, **Empty State Message**, **Items Per Page**, **Default Price Type**, **Show Search**, **Show Price Filter**, **Show Sort Options**.
- [ ] Save → settings stored in `config.sections.addons`. Frontend `/addons` currently shows a placeholder; when that page is built, it should read these settings.

### 6.2 Pricing (Pricing page settings)

- [ ] **Page Title**, **Page Subtitle**, **Default Subscription Type**, **Default Price Type**, **Empty State Message**, **Show Pre Package / Usage Subscription**, **Show Monthly/Yearly Toggle**.
- [ ] Save → settings stored in `config.sections.pricing`. Frontend `/pricing` currently shows a placeholder; when built, it should read these settings.

---

## Live Preview (right panel)

- [ ] **Live Preview** shows Hero with **current form state** (company name, hero title, colors) without saving.
- [ ] **Mobile View** toggle switches preview width (narrow vs wider).
- [ ] **Open full page preview** opens `/` in a new tab (shows last **saved** data after reload).

---

## Frontend landing page – quick verification

After any CMS change:

1. Click **Save Changes** in CMS.
2. Open **View Landing Page** (or go to `http://localhost:5000/`).
3. Confirm:
   - **Company name** in hero/header/footer = Setup → General → Company Name.
   - **Section order** = Setup → Order (and disabled sections are hidden).
   - **Colors** (buttons, accents) = Setup → Colors.
   - **Header / Hero / Footer** content and variant = Layout tab.
   - **Stats, Features, Modules, Benefits, Gallery, CTA** = Content (and Social/Engagement) tab.

---

## API (optional)

- [ ] **GET /api/cms/landing-page** (as superadmin): returns `landingPageSetting` (company fields + `configSections`) and `adminSettings`.
- [ ] **PATCH /api/cms/landing-page** (as superadmin): with `companyName`, `contactEmail`, `contactPhone`, `contactAddress`, `configSections`, `adminSettings` → 200 and DB updated; next GET or `/` load shows new data.
