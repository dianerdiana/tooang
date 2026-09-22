# Tooang Frontend Design System and UX Specification

**Status:** Primary frontend design authority  
**Applies to:** Public/customer web experience, place operations dashboard, and platform administration  
**Baseline:** Tooang SRS v1.3 and the implemented `/api/v1` contracts  
**Last reviewed:** 2026-09-22

## 1. Document purpose and authority

This document is the primary UI/UX and visual-design reference for Tooang. Frontend routes, feature components, shared primitives, empty/error states, and future AI-assisted implementation must follow it. It complements, but does not replace, the product, API, security, and architecture documents.

When requirements conflict, use this order of authority:

1. Backend SRS v1.3 and implemented API/domain rules for behavior, scope, and authorization.
2. This document for interaction, layout, content hierarchy, and visual consistency.
3. `src/styles.css` and shared React components for the currently implemented token and component API.
4. `templates/` only as a visual reference. It is not a product or implementation contract.

Do not invent endpoints, fields, permissions, roles, order transitions, or product features to satisfy a visual concept. Backend responses remain authoritative for availability, totals, open/closed state, permissions, transitions, and conflicts.

### Extracted, recommended, and assumed decisions

This document uses these labels:

- **Extracted:** observed in the repository and worth retaining.
- **Recommended:** a deliberate improvement or consolidation that future implementation should adopt.
- **Assumption:** not established by product requirements and requiring validation.
- **Approval required:** a material product or brand decision that stakeholders must make.

## 2. Product and user-experience principles

1. **Food and action first.** Customers should understand the place, item, price, availability, and next action without decoding the interface.
2. **Mobile ordering must feel native to the viewport.** Public pages begin at 320–390 px, use reachable controls and persistent action summaries where valuable, then progressively enhance.
3. **Operational speed beats decoration.** CASHIER and OWNER workflows prioritize status, elapsed time, order contents, and valid next actions.
4. **Scope is always visible.** Dashboard users must know which place they are operating on. Global administration and place-scoped work must never look interchangeable.
5. **The interface explains constraints.** Closed places, unavailable items, expired orders, conflicts, and permission denials receive explicit, actionable messages.
6. **Backend authority is visible in the UX.** Optimistic presentation may improve responsiveness, but confirmed server state wins and stale-state conflicts refresh safely.
7. **Progressive disclosure.** Keep the common path concise; move optional notes, details, and advanced filters behind clear controls.
8. **Inclusive by default.** WCAG 2.2 AA, keyboard use, reduced motion, readable Indonesian currency, and non-color status cues are release requirements.
9. **No false capability.** Do not show controls for unsupported payments, delivery, reservations, loyalty, inventory, promotions, or scheduled orders.

## 3. Analysis of the existing template

### 3.1 Repository sources inspected

- Mobile HTML reference pages: `templates/index.html`, `find.html`, `find-results.html`, `details.html`, `cart.html`, `customer-information.html`, and `success.html`.
- Prototype assets: food photography and SVG/PNG navigation, category, quantity, rating, contact, and success icons.
- Prototype styles and scripts: `templates/input.css`, generated `output.css`, and `templates/assets/js/`.
- Current React frontend: `src/styles.css`, theme provider/config, auth and permission types, routes, layout primitives, and reusable UI components.
- Product/technical references: frontend and backend architecture, PRD, SRS v1.3, application rules, Prisma schema, API specifications, and frontend task plan.

### 3.2 Useful extracted characteristics

| Existing characteristic                        | Current use                                                | Decision                                                                                                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Warm orange gradient `#FF923C` → `#FF801A`     | Mobile home hero and primary actions                       | Retain orange as the brand direction, but darken the interactive solid for accessible white text. Reserve gradients for branded/hero surfaces, not controls. |
| Warm yellow `#F3AF00`                          | Rating, category labels, icon accents, focus/hover borders | Retain as a rating/highlight hue; do not use it for small text or focus rings on white.                                                                      |
| Warm off-white/gray backgrounds                | `#F3F4F6`, white cards, subtle gray borders                | Retain the soft, food-friendly canvas; consolidate into semantic surface tokens.                                                                             |
| Dark neutral `#353535` and secondary `#606060` | Titles, body, metadata                                     | Retain the hierarchy with adjusted token values and verified contrast.                                                                                       |
| Rounded cards and pill actions                 | Cards, categories, primary CTA                             | Retain selectively. Use 12–16 px surfaces and pills only for chips, badges, and compact actions.                                                             |
| Food-forward photography                       | Menu and item cards                                        | Retain with consistent crops, fallbacks, and accessible alt text.                                                                                            |
| Mobile bottom navigation                       | Home/find/cart/profile                                     | Retain for the primary public/customer destinations after final information architecture approval.                                                           |
| Sticky bottom purchase summary                 | Item detail, cart, customer information                    | Retain for high-intent mobile actions, with safe-area padding and no content obstruction.                                                                    |
| Horizontally scrolling categories/cards        | Public menu discovery                                      | Retain category scrolling; avoid hidden-card carousels for essential results.                                                                                |
| 640 px centered prototype shell                | Every HTML page                                            | Retain only as a useful mobile demo boundary. Production public pages expand intentionally on tablet/desktop.                                                |
| React semantic tokens and shared primitives    | Current app foundation                                     | Use as the implementation baseline, revised by the token recommendations below.                                                                              |
| Plus Jakarta Sans                              | Current `src/styles.css`                                   | Adopt as the product UI typeface. It is more consistently integrated than prototype Poppins.                                                                 |
| Lucide React                                   | Current package and architecture                           | Adopt as the primary interface icon set.                                                                                                                     |
| Light/dark theme provider                      | Current app supports `light`, `dark`, and `system`         | Support both modes for the React application. Light is the primary design and QA baseline.                                                                   |

### 3.3 Problems to resolve

| Problem                                                      | Evidence                                                                                          | Resolution                                                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Three colors compete as “primary”                            | Orange actions, yellow accents, red prices                                                        | Orange is brand/action; amber is rating/warning; prices use primary text, not danger red.                      |
| Prototype targets are too small                              | 24 px quantity buttons and 16 px cart count                                                       | All interactive targets are at least 44 × 44 CSS px; visible icon may remain 18–20 px.                         |
| Very small text harms readability                            | 10 px descriptions and metadata                                                                   | Minimum normal supporting text is 12 px; body text is normally 14–16 px.                                       |
| Hover is used as a major cue on mobile-first pages           | Card borders/backgrounds                                                                          | Add clear default, pressed, selected, and focus-visible states; hover is enhancement only.                     |
| Raw colors are embedded in templates/icons                   | Hex utilities and SVG fills                                                                       | New components consume semantic tokens; icons use `currentColor`.                                              |
| Legacy logo conflicts with product                           | `public/assets/logo/logo-brand-name.png` says “Appointment Doctor”; favicon is the same blue mark | Do not ship these as Tooang branding. Use a typographic “Tooang” wordmark until approved assets replace them.  |
| Miscellaneous starter icons are unrelated                    | `public/icons.svg` contains social/docs starter artwork                                           | Exclude from product UI unless a specific future requirement calls for them.                                   |
| Prototype content is menu-centric but not place-centric      | Home shows categories/favorites before establishing a place                                       | Public discovery starts with places; a selected place owns the menu, cart, availability, and checkout context. |
| Current solid orange may fail small-text contrast with white | Existing `#FF801A` CTA                                                                            | Use accessible brand primary `#C2410C` for filled controls. Keep bright orange for large decorative surfaces.  |
| Fixed bottom bars can cover content                          | Prototype relies on `pb-32`                                                                       | Calculate reserved space, include `env(safe-area-inset-bottom)`, and test zoom/text expansion.                 |

### 3.4 Asset direction

- Existing food photos are valid layout references and may be used as development fixtures. **Assumption:** production usage rights have not been documented; verify licensing before launch.
- Use place-provided cover/logo and menu-item imagery where available. Never stretch a logo into a cover-image crop.
- The current blue medical logo and favicon are legacy assets and are prohibited in Tooang UI.
- Until a Tooang mark is approved, render a text wordmark in Plus Jakarta Sans, weight 750, with the brand-primary color. Do not improvise a permanent logo.

## 4. Visual direction

Tooang should feel warm, appetizing, direct, and trustworthy. The visual identity uses a roasted-orange brand color, cream canvas, near-black warm text, restrained green supporting accents, generous food imagery, and simple rounded geometry.

### 4.1 Composition

- Public pages: image-led, compact but breathable, one dominant action per section, minimal chrome.
- Dashboard: information-led, strong alignment, quieter surfaces, persistent place context, dense controls only where repeated operations justify them.
- Avoid glassmorphism, neon effects, excessive gradients, novelty food illustrations, and heavy shadows.
- Use borders and surface contrast before elevation. Shadows indicate overlays or clickable raised cards, not every container.

### 4.2 Brand expression

- Primary brand expression: roasted orange solid and a bright-orange hero gradient.
- Supporting expression: cream backgrounds, amber rating stars, herb-green success/availability.
- Keep state colors semantically pure. Never recolor an error orange merely to match the brand.

## 5. Color system and semantic tokens

### 5.1 Token rules

- Components reference semantic names, never palette names such as `orange-500` or raw hex values.
- Text, icons, borders, and backgrounds use separate tokens even when values currently match.
- Filled state colors pair with their explicit foreground token.
- Focus uses a two-layer ring that remains visible against both surface and state colors.
- Verify final CSS values with automated contrast tooling after conversion to OKLCH/Tailwind variables.

### 5.2 Core and brand colors

Recommended values below supersede visually similar current values when implementation is updated.

| Semantic token               | Light                  | Dark                | Foreground pairing        | Intended usage and accessibility                                                                                                            |
| ---------------------------- | ---------------------- | ------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `color-canvas`               | `#FAF8F5`              | `#1C1917`           | primary text              | Page background. Warm, low-chroma, never used as an interactive state.                                                                      |
| `color-surface-default`      | `#FFFDFC`              | `#292524`           | primary text              | Cards, panels, sheets.                                                                                                                      |
| `color-surface-raised`       | `#FFFFFF`              | `#342F2C`           | primary text              | Popovers, dialogs, sticky action bars.                                                                                                      |
| `color-surface-subtle`       | `#F3EEE9`              | `#3B3531`           | primary/secondary text    | Table headers, grouped controls, empty-state panels.                                                                                        |
| `color-surface-disabled`     | `#EAE4DE`              | `#403A36`           | disabled text             | Disabled controls only.                                                                                                                     |
| `color-text-primary`         | `#29231F`              | `#FAF7F2`           | —                         | Headings, body, prices. Target ≥ 4.5:1 on relevant surfaces.                                                                                |
| `color-text-secondary`       | `#625952`              | `#CFC6BE`           | —                         | Supporting copy and metadata. Never below 12 px.                                                                                            |
| `color-text-tertiary`        | `#7A7068`              | `#AFA59D`           | —                         | Low-emphasis timestamps; do not use for essential instructions.                                                                             |
| `color-text-disabled`        | `#9C938C`              | `#817870`           | —                         | Disabled labels only; state must also be programmatically conveyed.                                                                         |
| `color-border-default`       | `#DDD5CE`              | `#514A45`           | —                         | Dividers, cards, control boundary.                                                                                                          |
| `color-border-strong`        | `#B8AEA6`              | `#746A63`           | —                         | Selected/active neutral controls and table emphasis.                                                                                        |
| `color-brand-primary`        | `#C2410C`              | `#F27A3D`           | `#FFFFFF` / `#1C1917`     | Primary actions, active navigation, links where contrast passes. The light value is darkened from prototype orange for white-text contrast. |
| `color-brand-primary-hover`  | `#9A3412`              | `#FF925C`           | same as primary           | Hover only; active uses `#7C2D12` light / `#FFAD82` dark.                                                                                   |
| `color-brand-primary-subtle` | `#FFF0E8`              | `#4B261A`           | `#8A2E0B` / `#FFD8C2`     | Selected chips, low-emphasis brand callouts.                                                                                                |
| `color-brand-secondary`      | `#F2D492`              | `#6B5423`           | `#3D2A08` / `#FFF2C7`     | Warm decorative accents, not primary action.                                                                                                |
| `color-accent`               | `#DCEFE2`              | `#173E29`           | `#174A2C` / `#BCEACB`     | Fresh-food/category accent and neutral-positive emphasis.                                                                                   |
| `color-focus-ring`           | `#2563EB`              | `#93C5FD`           | outer offset uses surface | Keyboard focus. Blue is intentionally distinct from brand and status.                                                                       |
| `color-overlay`              | `rgb(28 25 23 / 0.56)` | `rgb(0 0 0 / 0.68)` | —                         | Modal/sheet scrim.                                                                                                                          |

### 5.3 Feedback colors

| Token family            | Light strong / subtle / text      | Dark strong / subtle / text       | Use                                                       |
| ----------------------- | --------------------------------- | --------------------------------- | --------------------------------------------------------- |
| `color-state-success-*` | `#1F7A45` / `#E8F5EC` / `#176337` | `#5FC984` / `#173B26` / `#A7E6BB` | Completed, saved, open, available.                        |
| `color-state-warning-*` | `#9A5B00` / `#FFF4D6` / `#744300` | `#F0B44C` / `#483414` / `#FFD98A` | Pending, expiring, needs attention.                       |
| `color-state-danger-*`  | `#B42318` / `#FDECEA` / `#912018` | `#FF7A70` / `#4A1E1B` / `#FFB4AE` | Errors, destructive actions, unavailable due to failure.  |
| `color-state-info-*`    | `#1769AA` / `#E8F3FC` / `#14578C` | `#78BDF2` / `#17344A` / `#B9DEFA` | Informational banners, refreshing, neutral system notice. |

Strong feedback colors may be used for filled badges/buttons only with their tested foreground. Subtle backgrounds pair with the state text value. Status always includes text or an icon with an accessible label; color alone is insufficient.

### 5.4 Existing color audit and disposition

| Existing value                           | Existing role                           | Disposition                                                                                                     |
| ---------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `#FF801A`                                | CTA, active nav, cart count             | Retain as decorative bright orange/gradient endpoint; replace solid interactive use with `color-brand-primary`. |
| `#FF923C`                                | Hero gradient start                     | Retain for large decorative gradient only.                                                                      |
| `#F3AF00`                                | Rating, category label, focus and hover | Retain for star graphics and warm highlights; replace focus with `color-focus-ring`.                            |
| `#FF001A`                                | Price and delete links                  | Replace price with `color-text-primary`; replace destructive action with danger tokens.                         |
| `#353535`                                | Primary text                            | Consolidate into `color-text-primary`.                                                                          |
| `#606060`                                | Secondary text/icons                    | Consolidate into `color-text-secondary`; avoid at 10 px.                                                        |
| `#F3F4F6`, `#F1F2F6`, `#F0F1F3`          | Canvas, border, icon background         | Consolidate into canvas, subtle-surface, and border tokens.                                                     |
| `#FFF7F0`                                | Card hover                              | Consolidate into brand-primary-subtle.                                                                          |
| Current OKLCH tokens in `src/styles.css` | React theme                             | Keep the semantic structure; update aliases/values to match this approved system and add info/disabled tokens.  |

### 5.5 Dark mode

Dark mode is in scope because the current React theme provider, toggle, and token file already support `light`, `dark`, and `system`. Every shared component must support both. Light mode remains the primary public-experience baseline. Do not force public pages to light mode unless a documented visual or image-legibility problem remains after token implementation. Persist the user preference and honor `prefers-color-scheme` for `system`.

## 6. Typography system

### 6.1 Typeface

- Product UI: **Plus Jakarta Sans**, weights 400, 500, 600, 700, and 800.
- Fallback: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Numeric values: use tabular numerals for prices, quantities, order codes, times, and dashboard metrics.
- Do not mix Poppins and Plus Jakarta Sans in production.

The current Google Fonts import is acceptable during development. Production should self-host approved WOFF2 files or document the privacy/performance decision for remote loading.

### 6.2 Type scale

| Token                | Mobile / desktop | Weight | Line height | Use                                       |
| -------------------- | ---------------- | ------ | ----------- | ----------------------------------------- |
| `type-display`       | 36 / 48 px       | 750    | 1.1         | Rare marketing/hero statement.            |
| `type-page-title`    | 28 / 36 px       | 700    | 1.15        | One page title.                           |
| `type-section-title` | 22 / 24 px       | 700    | 1.25        | Major section headings.                   |
| `type-card-title`    | 16 / 18 px       | 650    | 1.35        | Place/menu/order card titles.             |
| `type-body-lg`       | 16 px            | 400    | 1.6         | Introductory or comfortable reading text. |
| `type-body`          | 14 / 15 px       | 400    | 1.55        | Default UI copy.                          |
| `type-label`         | 14 px            | 600    | 1.4         | Form labels and actions.                  |
| `type-meta`          | 12 / 13 px       | 500    | 1.45        | Metadata and timestamps.                  |
| `type-price`         | 16 / 18 px       | 700    | 1.3         | IDR values.                               |
| `type-order-code`    | 24 / 30 px       | 750    | 1.2         | Human-readable verification code.         |

Use sentence case. Avoid all caps except compact system codes or short status labels; preserve readable letter spacing. Paragraphs should not exceed approximately 70 characters per line.

## 7. Spacing, sizing, radius, border, shadow, and elevation tokens

### 7.1 Spacing

Use a 4 px base grid.

| Token      | Value | Typical use                          |
| ---------- | ----- | ------------------------------------ |
| `space-0`  | 0     | Reset only                           |
| `space-1`  | 4 px  | Tight icon/internal gap              |
| `space-2`  | 8 px  | Related inline content               |
| `space-3`  | 12 px | Compact component padding            |
| `space-4`  | 16 px | Mobile page gutter, default card gap |
| `space-5`  | 20 px | Comfortable card padding             |
| `space-6`  | 24 px | Section internal padding             |
| `space-8`  | 32 px | Section separation                   |
| `space-10` | 40 px | Large section separation             |
| `space-12` | 48 px | Desktop section rhythm               |
| `space-16` | 64 px | Major page regions                   |

Responsive aliases: page gutter is 16 px under 640, 24 px from 640, and 32 px from 1024. Section gap is 24 px mobile and 32–40 px desktop.

### 7.2 Sizing

- Minimum touch target: 44 × 44 px; preferred primary mobile action height: 48–52 px.
- Inputs: 44 px compact desktop, 48 px default/mobile, 56 px large search/checkout.
- Icons: 16 px compact, 20 px default, 24 px navigation, 32–48 px state illustration.
- Avatar: 32 px compact, 40 px default, 64–96 px profile.
- Menu thumbnails: 88–112 px list; image ratio 4:3 card; place cover ratio 16:9 mobile and up to 3:1 desktop.

### 7.3 Radius and border

| Token         | Value   | Use                                 |
| ------------- | ------- | ----------------------------------- |
| `radius-xs`   | 4 px    | Tiny indicators only                |
| `radius-sm`   | 8 px    | Compact controls, table row actions |
| `radius-md`   | 12 px   | Inputs, standard cards              |
| `radius-lg`   | 16 px   | Prominent cards, dialogs            |
| `radius-xl`   | 20 px   | Bottom sheets and feature panels    |
| `radius-full` | 9999 px | Pills, avatars, icon buttons        |

Default border is 1 px. Use 2 px for focus/selected emphasis only. Nested surfaces should not accumulate multiple visible borders.

### 7.4 Elevation

| Token       | Value                                    | Use                           |
| ----------- | ---------------------------------------- | ----------------------------- |
| `shadow-xs` | `0 1px 2px rgb(41 35 31 / 0.06)`         | Sticky divider or subtle card |
| `shadow-sm` | `0 2px 8px rgb(41 35 31 / 0.08)`         | Interactive card              |
| `shadow-md` | `0 12px 32px -12px rgb(41 35 31 / 0.24)` | Dropdown, popover, sheet      |
| `shadow-lg` | `0 24px 56px -18px rgb(41 35 31 / 0.32)` | Dialog                        |

Dark mode uses stronger black alpha but fewer shadows. Focus and selected state must not rely on shadow alone.

## 8. Iconography and imagery guidance

### 8.1 Icons

- Use Lucide React for interface icons; default stroke 1.75–2 px and `currentColor`.
- Every icon-only control has an accessible name and tooltip on pointer/keyboard-capable layouts.
- Do not mix filled prototype icons and Lucide outlines inside the same navigation or control family.
- Star ratings may use a dedicated filled star shape. QR is content, not decoration.
- Use familiar symbols: plus/minus for quantity, shopping basket/cart, clock for hours, map pin for location, utensils/bag for fulfillment, and chevron for disclosure.

### 8.2 Photography

- Menu item image: 4:3 crop with `object-fit: cover`; preserve a meaningful focal point.
- Place cover: responsive wide crop; never overlay critical text on a busy image without a tested scrim.
- Use a neutral food/place placeholder with no fake dish depiction when an image is missing.
- Lazy-load below-fold images and reserve aspect ratio to prevent layout shift.
- Alt text describes useful content (“Spicy miso ramen with egg”), not filenames. Use empty alt for purely decorative repeated thumbnails.
- Never communicate availability through grayscale alone; retain label and state.

### 8.3 Image upload and image preview

- Validate JPEG, PNG, WebP, or AVIF and the documented 5 MB UX limit before upload; backend remains authoritative.
- Show file preview, name, size, progress, replace, retry, and remove actions.
- Crop guidance: 1:1 logo, wide place cover, 4:3 item. Cropping itself is not assumed to exist until implemented.

## 9. Grid, container, and responsive breakpoints

Use Tailwind-compatible breakpoints:

| Name  | Minimum width | Design intent                                        |
| ----- | ------------- | ---------------------------------------------------- |
| Base  | 0             | 320–639 px phones; source of truth for public layout |
| `sm`  | 640 px        | Large phone/small tablet                             |
| `md`  | 768 px        | Tablet; navigation and two-column opportunities      |
| `lg`  | 1024 px       | Dashboard sidebar and desktop public grids           |
| `xl`  | 1280 px       | Wide dashboard/content expansion                     |
| `2xl` | 1536 px       | Maximum-density dashboard, not wider reading text    |

### Containers

- Public global shell: full width with gutters; maximum 1200 px.
- Public reading/detail text: maximum 720 px.
- Checkout: maximum 1120 px desktop; main form 640–720 px plus 320–360 px summary.
- Auth form: maximum 440 px.
- Dashboard content: fluid within shell, normally max 1600 px; dense tables may use full available width.
- Do not center the whole production experience inside the prototype’s 640 px frame on desktop.

### Grid rules

- Public cards: one column base, two at `sm`/`md` when content fits, three or four at `lg`/`xl`.
- Menu lists on phones favor compact horizontal cards; desktop may use 2–3 columns.
- Dashboard uses a 12-column conceptual grid with 24 px gutters at desktop; forms normally span 6–8 columns, not full width.
- Avoid masonry for food/menu results because scan order and keyboard order must remain predictable.

## 10. Public mobile-first layout rules

1. Start at 320 px with no horizontal page scrolling. Test 200% zoom and long translated content.
2. Put place name/context before categories or menu items. A cart always belongs to one place.
3. Make search 48–56 px high and place it near the top of discovery/menu contexts.
4. Category chips scroll horizontally on mobile with visible cut-off affordance; selected chip remains in view. At wider sizes they wrap.
5. Prefer compact list cards when users compare many items. Show image, name, short description, price, availability, rating if available, and add control.
6. Keep add/quantity controls reachable and 44 px minimum. Quantity changes announce the new count.
7. Use a sticky cart summary only when the cart is non-empty or the current page has a high-intent action. Include item count, subtotal, and action label.
8. Sticky bars reserve content space and include safe-area padding. They must not cover validation errors or focused fields.
9. Bottom navigation has at most five destinations, one active item, text labels, and a cart count capped visually at `99+`.
10. On desktop, bottom navigation becomes a header/account navigation. Sticky cart may become a right-hand summary.
11. Bottom sheets suit filters, fulfillment choice, and item customization on mobile. Use dialogs or side panels when width and task complexity warrant them.
12. Never reproduce a desktop table for customer orders on a phone; use order cards with status, code, place, total, and date.

## 11. Dashboard responsive layout rules

### 11.1 Desktop shell

- At `lg+`, use a 256 px persistent sidebar, 64 px top bar, and fluid content area.
- Sidebar contains only capability-relevant sections. Place switcher sits near the top and visibly names the active place.
- Page header includes breadcrumb when hierarchy is useful, title, supporting scope/status, and at most two primary actions.
- Filters occupy a toolbar above data; advanced/low-frequency filters may open a popover or sheet.

### 11.2 Tablet and mobile

- Below `lg`, collapse sidebar into an accessible modal drawer triggered from the top bar.
- Keep active place visible in the top bar. Place switching may use a full-width command-style dialog/sheet.
- Stack header actions; primary action remains full-width or clearly dominant on narrow screens.
- Data tables choose one documented strategy per screen:
  - keep a scroll container with sticky first/action columns for truly tabular comparison;
  - hide low-priority columns while retaining a details disclosure;
  - transform rows into labeled cards when row-level work matters more than cross-row comparison.
- Never clip row actions. Use an overflow menu when more than two secondary actions exist.
- CASHIER order queue should become vertical status-grouped cards with large transition actions, suitable for touch.
- Dialogs become near-fullscreen sheets on small screens when forms exceed a few fields.
- Filters show an applied-count badge and a clear-all control. Filter state survives responsive transformation.

### 11.3 Density

- Default dashboard row height: 52–56 px. Compact 44 px rows may be user-selected later, but are not the mobile default.
- Operational order cards use 12–16 px internal gaps and strong status/time hierarchy.
- Avoid dashboards composed entirely of cards. Tables and lists are appropriate when they improve scanning.

## 12. Navigation patterns

### Public/customer navigation

- Mobile candidate destinations: Discover, Orders, Cart, Account. “Menu” is contextual to a place, not a global tab.
- Desktop header: Tooang wordmark, Discover, Orders (authenticated), cart, account.
- Back navigation on detail/checkout pages returns to the logical parent and does not depend solely on browser history.
- Cart badge is hidden at zero; it announces count changes to assistive technology without stealing focus.

### Dashboard navigation

- Group by context: Overview; Place (profile, hours, categories, items, tables, members); Orders; Platform administration.
- Global pages must carry a “Platform” context label and must not inherit a place filter implicitly.
- Hide unauthorized destinations when effective permissions are absent. A direct denied route shows the appropriate 403 or safe 404 response.
- Preserve selected place by stable ID in a documented route or persisted preference; never use display name as identity.
- When a user has multiple places, the switcher lists name, membership role, and active/published state. Switching clears or keys place-scoped local/query state by `placeId`.

### Breadcrumbs

- Use on dashboard detail/edit pages and deep customer order flows.
- Omit redundant breadcrumbs on simple mobile top-level screens.
- Current item is text, not a link; collapsed middle items remain keyboard accessible.

## 13. Component design specifications

All interactive components require default, hover where relevant, focus-visible, active/pressed, disabled, loading, error, and selected states when applicable. Hover must never be the only state cue.

### 13.1 Buttons and icon buttons

| Variant        | Purpose                                             | Visual rule                                                              |
| -------------- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| Primary        | One main action per region                          | Brand-primary fill, explicit foreground; hover/active tokens.            |
| Secondary      | Supporting action                                   | Surface fill, strong border, primary text.                               |
| Tertiary/ghost | Low-emphasis action                                 | Transparent; subtle hover/pressed surface.                               |
| Destructive    | Delete, deactivate, revoke, cancel when destructive | Danger fill or outlined danger depending prominence. Never brand orange. |
| Link button    | Inline action that behaves as a button              | Styled like link but retains button semantics.                           |

- Sizes: small 36 px (desktop only), default 44 px, large 48–52 px.
- Loading preserves width, disables repeated submit, displays spinner plus action-specific text when possible (“Saving…”), and sets `aria-busy`.
- Disabled actions should generally explain why through adjacent copy or tooltip; authorization-only actions are normally hidden.
- Icon buttons are at least 44 px with 20–24 px icon and accessible label.
- Do not place destructive primary adjacent to safe primary without separation.

### 13.2 Links

- Use brand-primary text with underline on hover/focus; links within prose are underlined by default.
- Visited state may be a darker brand tone on public informational links, but not in navigation.
- External-link behavior is explicit and does not open a new tab without indication.

### 13.3 Form controls

- Anatomy: visible label, required/optional indicator, control, helper text, error message.
- Use persistent labels; placeholders are examples, not labels.
- Default height 48 px public/mobile and 44–48 px dashboard.
- Focus: 2 px focus ring plus 2 px surface offset. Error retains focus indication and adds danger border/message.
- Disabled fields are visually subdued and excluded from submit as appropriate; read-only values use a read-only presentation, not fake disabled inputs.
- Textarea has a sensible minimum height and visible character counter near documented limits.

### 13.4 Selects and comboboxes

- Native select is acceptable for short, static lists such as FOOD/DRINK.
- Use combobox for searchable place, user, category, or table lists.
- The popup supports arrow keys, Home/End, typeahead, Escape, and clear selected labeling.
- Mobile long lists may use a searchable bottom sheet. Never silently select the first remote option.

### 13.5 Search input

- Include search icon, clear button when non-empty, accessible label, and optional results count.
- Debounce remote search; show background-refresh state without replacing current results.
- Enter is not required to trigger unless the API/task flow explicitly uses submission.
- Empty query and no-results are distinct states.

### 13.6 Quantity control

- Anatomy: decrement button, numeric value, increment button; each target ≥44 px.
- Decrement at one either disables or becomes an explicitly labeled remove action according to context. Never unexpectedly delete.
- Announce quantity and subtotal changes with a polite live region.
- While mutation is pending, prevent conflicting taps but avoid blocking the entire card. On failure restore confirmed value and explain.

### 13.7 Checkbox, radio, switch, segmented control

- Checkbox: independent selections. Radio: one option in a group. Switch: immediate boolean setting. Segmented control: 2–4 peer views/options.
- Use text labels with 44 px combined hit area.
- A switch should not require a separate Save button unless it edits a staged form; if the action has major consequences (publish/ordering), use confirmation or explicit Save.
- Fulfillment DINE_IN/TAKEAWAY uses radio cards or a two-option segmented control with text and supporting requirements.

### 13.8 Cards

- Cards group one entity or decision. Default: surface, 1 px border, 12–16 px radius.
- Entire-card links must not contain nested conflicting interactive elements. If add/favorite actions exist, link only the content region.
- Selected card uses strong border plus subtle brand surface; focus is independent.

### 13.9 Place card

- Anatomy: cover image, optional logo, name, type/city, open/closed label, short rating summary when available, and concise address.
- Do not show ordering CTA when discovery data does not establish ordering/open state; detail page is authoritative.
- Mobile: horizontal card for dense results or full-width image card for featured content. Desktop: consistent grid height.

### 13.10 Menu-item card

- Anatomy: image, item name, FOOD/DRINK/category label, two-line description, IDR price, availability, optional rating, add/quantity action.
- Unavailable: retain discoverability where appropriate, show “Unavailable,” disable add, and do not obscure text with a full-card opacity reduction.
- Management variant adds category, sort order/availability, and explicit edit menu; it does not reuse customer add controls.

### 13.11 Category tabs or chips

- Use tabs only when panels are switched in place and keyboard tab semantics are implemented. Use filter chips when filtering a result set.
- Active state uses subtle brand background, strong text, border, and `aria-selected`/`aria-pressed` as appropriate.
- Mobile horizontal row has no hidden scrollbars as the sole scrolling cue; keep partial next item visible or add edge fade.

### 13.12 Rating and reviews

- Display numeric average plus star and count: “4.6 (128 reviews).” Do not show an unsupported precision.
- Input uses five labeled radio-style stars, keyboard operable, with current value announced.
- Review card: reviewer public name, rating, date, comment, verified-purchase text only because backend review eligibility is verified; own actions where permitted.
- Long comments wrap and preserve safe line breaks. Moderation/delete requires confirmation.

### 13.13 Price display

- Format using `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })` unless backend precision requires otherwise.
- Use tabular numerals. Price is primary text, not danger red.
- Never calculate authoritative totals with floating-point client logic; display backend totals and label estimates when awaiting confirmation.

### 13.14 Status badges and availability indicators

- Badge anatomy: optional icon/dot plus human label. Minimum 24 px high; not interactive unless explicitly a filter.
- Order status mapping:
  - PENDING → warning, “Pending”
  - CONFIRMED → info, “Confirmed”
  - PREPARING → info with distinct utensil/clock icon, “Preparing”
  - READY → success-emphasis, “Ready”
  - COMPLETED → neutral/success, “Completed”
  - CANCELLED → danger-neutral, “Cancelled”
  - EXPIRED → neutral-muted with clock, “Expired”
- Open/available uses success; closed may use neutral or warning depending whether temporary. “Ordering off” is distinct from “Closed.”

### 13.15 Alerts, inline validation, and toasts

- Inline field error sits below the control and is associated via `aria-describedby`.
- Page/section alert is used for persistent or blocking conditions such as closed place, stale cart, or failed data load.
- Toast is used for non-blocking completion/failure after user action. It never contains the only copy of a critical error.
- Success toasts auto-dismiss in 4–6 seconds; error toasts remain longer and include a retry only when safe.

### 13.16 Dialogs and confirmation dialogs

- Dialogs trap focus, label title/description, close on Escape unless a critical irreversible operation is mid-flight, and restore trigger focus.
- Confirmation names the target and consequence. Destructive button uses a verb: “Delete menu item,” not “Yes.”
- For revoke/deactivate/delete and sensitive role changes, do not default focus to the destructive action.
- Complex mobile dialogs become sheets/fullscreen flows.

### 13.17 Drawers and bottom sheets

- Drawer: navigation or secondary workspace. Bottom sheet: short mobile selection/action task.
- Include drag handle only if dragging is implemented; always provide a close button.
- Respect safe areas; scroll content separately from a sticky action footer.
- Do not nest sheets/dialogs. Close or replace the first layer.

### 13.18 Dropdown menus

- Use for low-frequency row/account actions, not primary flow.
- Arrow-key navigation and roving focus are required. Destructive items are separated and danger-colored.
- On touch-only narrow screens, a menu may transform into an action sheet.

### 13.19 Pagination

- Public feeds may use explicit “Load more” when preserving exploration context; dashboard/API lists use numbered pagination.
- Always show current page and result range when metadata is available.
- Pagination remains keyboard operable and never fabricates pages for unpaginated endpoints.

### 13.20 Empty states

- Anatomy: concise title, specific explanation, optional single primary action, optional lightweight icon.
- Distinguish first-use empty (“No menu items yet”) from no-results (“No items match these filters”).
- Unauthorized is never presented as empty.

### 13.21 Skeletons and loading indicators

- Skeleton mirrors final geometry and is used for initial content loads expected to exceed about 300 ms.
- Spinner is for compact indeterminate actions, buttons, or route fallback—not an endless final page.
- Preserve current data with an unobtrusive progress cue during background refresh.
- Skeleton animation stops under reduced motion.

### 13.22 Tables and responsive alternatives

- Use semantic table markup for real row/column data, caption or accessible name, sortable header buttons, and scope attributes.
- Loading/empty/error rows span all columns and remain readable.
- Desktop may use sticky headers. Horizontal scroll container must be keyboard-focusable and visibly scrollable.
- Mobile card transformation retains field labels, action access, and the same information priority.

### 13.23 Filter and sorting controls

- Show active filters as removable chips and provide “Clear all.”
- Default sort is named when it matters. Do not add client-only sorting that implies the entire paginated collection was sorted.
- Filter changes update API-supported query parameters and preserve URL state where useful.

### 13.24 Dashboard statistic cards

- Show label, primary value, scope/time period, and optional comparison only when the backend provides it.
- Do not invent revenue, conversion, or live metrics. Current product has no payment analytics.
- Use 2-up tablet/4-up desktop grids and horizontal/stacked layout on mobile.

### 13.25 Order queue item

- Anatomy: status, order code, age/created time, fulfillment, table snapshot if dine-in, customer name, item/quantity summary, subtotal, and valid next action.
- PENDING/READY receive strong attention but remain distinguishable without color.
- Show absolute time in detail/tooltip and relative time in queue. Expiry countdown is assistive, not authoritative after server conflict.
- Sort/filter according to backend-supported parameters only.

### 13.26 Order status timeline

- Vertical on mobile, horizontal or vertical on desktop based on space.
- Show reached states and timestamps returned by the API. Do not fabricate timestamps for unreturned phases.
- Cancelled/expired branches terminate clearly; do not imply they passed through completion.

### 13.27 Cart summary

- Show place, line items, notes, quantity controls, subtotal, and current reconciliation problems.
- Sticky mobile summary shows count/subtotal and “Review cart” or “Continue to checkout.”
- A cart for another place must prompt explicit replacement/choice according to implemented backend behavior; do not silently merge places.

### 13.28 Checkout summary

- Show fulfillment, table when dine-in, customer name/note, immutable review of current items, and backend-calculated subtotal.
- Disable repeated submit while preserving idempotent retry semantics. Connection uncertainty should say the order may already exist and offer safe status/history recovery.
- There is no payment section.

### 13.29 QR and order verification

- Success presentation prioritizes order code in selectable high-contrast text, QR image, place, status, and expiry guidance.
- QR requires sufficient quiet zone, minimum practical size around 200 × 200 px, and download/print only if implemented.
- Never expose raw verification tokens in visible copy or operational screens.
- Public verification shows only the API-safe fields and cannot offer status-changing actions.

### 13.30 Avatar and account menu

- Use user-provided image only if an avatar feature exists; otherwise initials from full name with deterministic neutral background.
- Menu shows full name/email, customer links, dashboard entry only when accessible, theme control, and logout.
- Logout is distinct but not styled as destructive deletion.

## 14. Forms and validation behavior

1. Use TanStack Form and Zod consistent with current architecture; schemas reflect backend contract exactly.
2. Validate format on blur or submit; do not show errors before the user has interacted unless submitting.
3. Validate interdependent fields immediately when the dependency changes: DINE_IN requires active table; TAKEAWAY removes table requirement.
4. Preserve user input after API failure unless security or domain rules require clearing it.
5. On failed submit, move focus to the error summary or first invalid field and provide anchored links for long forms.
6. Server error wins over client assumptions. Map stable domain codes to plain-language messages; never show stack traces or Axios objects.
7. Mark optional fields explicitly when most fields are required; use `*` only with a legend.
8. Normalize display consistently but avoid silently altering meaningful user content. Character counters use backend Unicode limits as closely as practical.
9. Destructive toggles such as publishing/ordering should explain prerequisites and consequences returned by conflicts.
10. Prevent double submission. For checkout, retain/reuse the idempotency key for the same attempt and generate a new key only for a genuinely new request.

## 15. Data display patterns

- Dates/times display in the relevant place timezone for place operations, with timezone label where ambiguity exists. Account/global views may use user locale but must label differing place timezones.
- IDR is the only currency. Do not add a currency selector.
- Use localized human labels (“Food”, “Takeaway”) while retaining enum values in code and requests.
- IDs are not primary labels. Show order code to humans; internal UUIDs appear only when genuinely useful for support/admin and allowed by API.
- Truncation must provide access to the full safe value. Never truncate order codes or critical status.
- Tables align text left and numbers right. Status and actions remain compact but not cryptic.
- Charts are optional and only used when backend data supports a meaningful trend; every chart needs a text/table equivalent and accessible summary.
- Audit-oriented interfaces are designed only when an audit API is exposed. The current backend documents audit storage but no public audit endpoint; do not invent one.

## 16. Feedback and system states

Every data-driven screen implements the following applicable states:

| State                    | Pattern                                                               | Required behavior                                                                                                 |
| ------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Initial loading          | Shape-matched skeleton; spinner only for very small surfaces          | Keep page shell/navigation stable; timeout into recoverable error.                                                |
| Background refresh       | Existing data plus top/inline subtle progress and optional “Updating” | Do not replace content or reset scroll.                                                                           |
| Empty data               | Empty-state panel                                                     | Explain first action; show action only if permitted.                                                              |
| No search/filter results | No-results panel near results                                         | Repeat search/filter context; offer clear filters.                                                                |
| Success                  | Updated UI plus toast or dedicated success page                       | Use dedicated success for checkout; announce asynchronously.                                                      |
| Validation error         | Field messages plus optional summary                                  | Associate labels/errors; retain input.                                                                            |
| API error                | Inline section/page error with retry when safe                        | Plain language and request/recovery guidance.                                                                     |
| Unauthorized (401)       | Auth recovery/login redirect                                          | Preserve safe return URL; clear private state after terminal session failure.                                     |
| Forbidden (403)          | Full/section 403                                                      | Explain lack of access without exposing private target data; link to valid destination.                           |
| Not found (404)          | Full/section not-found                                                | Use neutral wording; for hidden scoped resources do not reveal existence.                                         |
| Conflict/stale (409)     | Persistent alert/dialog and refresh                                   | Explain changed state, refresh authoritative data, preserve recoverable form input.                               |
| Offline/network failure  | Banner plus retry                                                     | Do not claim a mutation failed when its outcome is unknown; for checkout/order transition, recover by refetching. |
| Closed place             | Informational/warning banner; ordering actions disabled               | Show next hours only if reliable data is available. Browsing remains possible.                                    |
| Ordering disabled        | Explicit status near cart/CTA                                         | Distinct from closed; prevent checkout.                                                                           |
| Unavailable item         | Item label and disabled add                                           | Existing cart surfaces reconciliation message/removal path.                                                       |
| Expired/terminal order   | Status panel and timeline                                             | No invalid actions; verification availability follows API retention.                                              |
| Unexpected UI failure    | Route/layout error boundary                                           | Preserve shell/auth when possible; retry and safe navigation.                                                     |

### Pattern selection

- **Skeleton:** initial structured read.
- **Spinner:** button, tiny widget, or short route fallback.
- **Inline message:** field, item, or local recoverable failure.
- **Banner:** page-wide persistent condition affecting several actions.
- **Toast:** transient result of a user-initiated mutation.
- **Empty-state panel:** valid zero-result state.
- **Full error page:** route cannot render, authentication boundary, forbidden/not found, or unrecoverable load.

No blank screen, permanent spinner, or toast-only blocking error is acceptable.

## 17. Role- and permission-aware UI behavior

### 17.1 Core rules

- Backend authorization is the security boundary. Hidden or disabled UI is only usability assistance.
- Build visibility and route affordances from `GET /me` effective permissions when available, not hard-coded role-name mappings.
- A place-scoped action requires the target/selected `placeId`, an active membership or explicit global grant, and the relevant effective permission.
- Never treat OWNER or CASHIER as platform roles. They are `PlaceMember` roles.
- On permission changes/revocation, refetch session/context and remove inaccessible cached UI promptly.
- Prefer hiding unauthorized controls. Show disabled unauthorized controls only when the user benefits from understanding how to obtain access; never reveal sensitive target details.

### 17.2 Experience by actor

| Actor/context      | Relevant UI                                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visitor            | Published place discovery/details/menu/reviews, login/register, public verification. Cart/checkout/review actions prompt authentication.                   |
| Authenticated USER | Profile, carts, checkout, own order history/detail/cancellation when valid, verified-purchase reviews.                                                     |
| CASHIER membership | Selected-place order queue/detail/transitions according to exact permissions; table read where allowed. No place/menu/member configuration by implication. |
| OWNER membership   | Selected-place profile, hours, publishing/ordering, menu, tables, CASHIER management, and orders according to effective permissions.                       |
| ADMIN              | Global permissions returned by backend, including supported user/place/order/review operations; no SUPER_ADMIN-only role/OWNER operations.                 |
| SUPER_ADMIN        | Platform-role and OWNER membership operations plus returned global capabilities; domain invariants still apply.                                            |

### 17.3 Place switching

- Always display active place name and role/context in dashboard chrome.
- Switcher search is available for larger lists. Inaccessible/revoked places disappear after session refresh.
- Before switching, warn about unsaved form changes.
- Query keys and component state include `placeId`; never flash Place A data under Place B.
- If a deep link names a place the actor cannot access, show backend-derived safe 404/403 and offer an accessible place.

### 17.4 Denied actions

- `401`: attempt established session recovery; otherwise login.
- `403`: capability denied; do not imply the resource is absent.
- hidden-scope `404`: say the page/resource cannot be found or accessed, without confirming it exists.
- `409`: explain domain invariant or stale state (last OWNER/SUPER_ADMIN, invalid transition, closed place, cart changed) and refresh relevant data.

## 18. Accessibility requirements

WCAG 2.2 AA is the baseline, including:

- Normal text contrast ≥4.5:1; large text ≥3:1; interactive boundaries/focus/non-text information ≥3:1 against adjacent colors.
- Visible `:focus-visible` on every interactive element. Focus is never removed without an equivalent.
- Complete keyboard navigation with logical DOM/focus order matching visual order.
- Semantic landmarks (`header`, `nav`, `main`, `aside`, `footer`), headings without skipped structural levels, real buttons/links, and semantic tables.
- Every input has a visible label; errors and help are programmatically associated. Error summaries link to fields.
- Async cart, quantity, upload, and status updates use appropriate polite/assertive live regions without excessive announcements.
- Pointer targets meet 44 × 44 px wherever practical and WCAG 2.2 minimum requirements everywhere.
- Status never relies only on color. Use label, icon/shape, and accessible name.
- Dialogs, drawers, tabs, menus, comboboxes, and tables follow established ARIA patterns through tested primitives (Radix/Base UI where applicable).
- Images have meaningful alt text or empty alt when decorative. QR has text alternative identifying its purpose, plus a readable order code.
- `prefers-reduced-motion` removes non-essential movement and replaces transforms with immediate/fade state changes.
- Support browser zoom to 200% without loss and reflow at 320 CSS px equivalent.
- Do not trigger context changes merely on focus or selection unless the control clearly communicates immediate behavior.
- Authentication must not depend on cognitive puzzles. Error copy must not disclose account existence beyond backend policy.
- Auto-updating operational queues should not steal focus; users can pause disruptive refresh behavior if introduced.

## 19. Motion and interaction guidelines

### 19.1 Timing and easing

| Motion               | Duration   | Easing                           |
| -------------------- | ---------- | -------------------------------- |
| Press/color feedback | 80–120 ms  | `ease-out`                       |
| Hover/focus surface  | 120–160 ms | `ease-out`                       |
| Menu/tooltip/popover | 120–180 ms | `cubic-bezier(0.2, 0, 0, 1)`     |
| Accordion            | 180–240 ms | `cubic-bezier(0.2, 0, 0, 1)`     |
| Dialog fade/scale    | 180–240 ms | enter ease-out, exit ease-in     |
| Drawer/bottom sheet  | 220–320 ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| Toast                | 180–240 ms | ease-out; no bouncing            |

- Route changes use the existing top loading bar and no large page slide. A subtle 120–180 ms content fade is optional.
- Quantity/cart feedback may briefly emphasize the updated value and cart badge; no confetti or repeated bounce.
- Loading skeleton shimmer is subtle and capped; prefer pulse or static skeleton under reduced motion.
- Do not animate layout continuously, spin decorative objects, parallax food images, or use motion as the only status cue.
- Reduced motion sets durations near zero, removes transform travel, and preserves visibility/state feedback.

## 20. Page-level UX guidance

### 20.1 Public and customer pages

#### Place discovery

- Mobile order: wordmark/header, search, type/city filters, results count, place list, bottom navigation.
- Use API-supported search, type, and city only. Provide filter sheet on mobile and inline toolbar desktop.
- Cards show safe public fields. Initial, no-result, pagination, error, and offline states are required.

#### Place detail

- Cover/logo, name, type/city, open/closed and ordering state, address/contact, description, hours, rating summary, menu entry, and reviews.
- Distinguish “closed” from “ordering disabled.” Browsing remains available.
- Hours expand from today/summary to seven-day view. Display place timezone when relevant.

#### Menu browsing and category filtering

- Keep place identity and availability summary visible.
- Search only if supported by the final public menu contract; current public menu supports type/category, not free-text item search, so do not send unsupported queries.
- Sticky horizontal category/type filters; grouped categories reflect paginated API response carefully. Do not imply missing categories are empty when only one page is loaded.
- Sticky cart summary appears once cart has items.

#### Menu-item detail

- Large 4:3 image, category/type, name, rating summary, description, price, availability, quantity, note when adding if supported, and reviews.
- Primary add action remains reachable. Unavailable state replaces add with clear explanation.

#### Place and menu reviews

- Summary first, distribution only if API provides it, newest reviews list, pagination/load more.
- Review form is available only for eligible completed-order context. Explain verified-purchase requirement and surface conflict states.

#### Login and registration

- Single-column max 440 px, visible product wordmark, password visibility control, inline validation, safe redirect after login.
- Registration does not imply immediate login because current backend contract does not create a session.
- Do not add password-reset or email-verification links as functional promises; both are outside V1.

#### Cart

- Name the place, list items and reconciliation issues, edit quantities/notes, remove explicitly, and show backend subtotal.
- Empty cart offers return to the associated menu or discovery. Invalid/unavailable items require resolution before checkout.

#### Checkout

- Mobile sequence: fulfillment → table if dine-in → customer information/note → review → submit.
- Desktop: form left, sticky summary right. No payment, delivery, schedule, promo, or tip UI.
- If place closes or state changes, show conflict and recovery; preserve safe inputs.

#### Checkout success with order code and QR

- Dedicated success state, order code first, QR, status, place, expiration/next-step copy, and links to order detail/history.
- Explain that payment/fulfillment happens with the place without inventing a paid state.

#### Public order verification

- Token route shows only order code, place name, status, fulfillment, and documented timestamps.
- Unknown/malformed/expired-retention tokens share a neutral not-found presentation. No customer, item, total, or mutation data.

#### User order history

- Reverse-chronological cards/list with status and fulfillment filters only if API supports them; place filter is supported for own orders.
- Mobile cards; desktop table/list. Terminal and active orders are visually distinct.

#### User order detail and cancellation

- Show snapshots, totals, fulfillment/table snapshot, notes, timeline, expiry, and cancellation state.
- Cancel only when the permission/current state allows. Backend conflicts refresh and explain. Reason is required after PENDING when backend requires it.

#### Profile and account settings

- Separate personal data from account deletion request. Confirm deletion request with consequences and avoid implying instant hard deletion.
- Show session-safe identity fields only. Dashboard entry appears based on `canAccessDashboard`/effective capabilities.

### 20.2 Operational dashboard

#### Dashboard overview

- Selected place and open/published/ordering state at top; operational counts only when API data exists.
- Prioritize incoming/active orders and configuration blockers over decorative charts.

#### Place selector

- Persistent shell control with current place, membership context, searchable list when necessary, and unsaved-change protection.

#### Place profile and publishing settings

- Group identity, contact, location, images, publication, and ordering settings.
- Publishing/ordering prerequisites appear before toggles. Use explicit confirmation for unpublish/disable when it affects customers.

#### Business hours

- Seven consistent weekday rows, closed switch, open/close time controls, and clear overnight semantics according to API.
- Preview current open state and timezone. Do not infer local device timezone as place timezone.

#### Menu categories

- Ordered list/table with name, active state, sort order, item dependency, and actions.
- Category deletion conflict explains that non-deleted items must be moved/deleted first. No category description field in V1.

#### Menu items

- Filter by API-supported type, category, availability; show image, name, category, type, price, availability.
- Create/edit forms match current limits. Availability-reducing actions warn that carts/order eligibility may change.

#### Dining tables

- Show name and active state. CASHIER read-only presentation where permitted; management actions by effective permission.
- Do not fabricate pagination if endpoint is unpaginated. QR regeneration/presentation only if an implemented contract exposes it.

#### Place members

- Show safe identity and OWNER/CASHIER membership. OWNER vs CASHIER operations are visually separated.
- Ordinary OWNER/ADMIN must not receive SUPER_ADMIN-only OWNER assignment/revocation controls. Explain last-OWNER conflicts.

#### Incoming order queue

- Default attention to active statuses, with clear filters for terminal states when supported.
- Cards/rows show age, code, fulfillment/table, item count, subtotal, status, and valid next transition.
- Background refresh preserves scroll/focus and announces material changes politely.

#### Order detail and status processing

- Use authenticated operational endpoints only. Show safe order/item/customer snapshots, notes, times, and transition history available from response.
- Primary next action is prominent; cancellation is separated and confirmed. A `409` triggers refetch and new valid actions.

### 20.3 Platform administration

#### Platform overview

- Global context label; only supported counts/health summaries. Do not mix selected-place data into global metrics.

#### User management

- Paginated table/card list of API-safe fields, platform role when returned, documented search/filter only.
- Deactivation requires explicit confirmation and communicates invariant/target restrictions through backend errors.

#### Platform-role management

- SUPER_ADMIN-only by effective permission; fixed values USER/ADMIN/SUPER_ADMIN; explicit before/after confirmation.
- Last-SUPER_ADMIN conflict receives a persistent explanation and refetch.

#### Global place management

- Clearly global list/detail scope. Reuse place components but do not imply membership. Actions are permission driven.

#### Review moderation

- Separate place and menu-item targets or label target type clearly. Show only exposed author/context fields.
- Deletion is confirmed; no unsupported moderation reason/status workflow.

#### Global order inspection

- Read-focused reuse of order list/detail under global API scope. Never use selected-place query keys or public verification endpoint.

#### Audit-oriented interfaces

- The backend stores audit logs, but current documented API does not expose an audit UI endpoint. Do not build an audit log screen until a contract and permissions exist. If later supported, use immutable chronological records, filters, before/after disclosure, and strict data minimization.

## 21. Content and microcopy conventions

- Use concise, plain English in implementation unless localization requirements are approved. Format locale-sensitive numbers as Indonesian/IDR.
- Sentence case: “Add to cart,” “Place is closed,” “Save business hours.”
- Buttons use verbs and objects. Avoid “Submit,” “OK,” and “Yes” where a precise action exists.
- State messages answer: what happened, what it affects, and what the user can do.
- Name the resource in destructive confirmations: `Delete “Miso Ramen”?`
- Do not blame the user. Prefer “Enter a valid table” to “You entered an invalid table.”
- Avoid backend jargon (`idempotency`, `serialization`, `predicate`) in customer copy. Translate conflicts into task language while retaining a support/reference code when useful.
- Use “place” as the generic product noun; use the actual place type/name in customer-facing copy where natural.
- Use “Dine in” and “Takeaway”; use “Order code”; use “Menu item.”
- Preserve customer-entered names/comments, but escape/sanitize rendering and respect documented limits.

## 22. Anti-patterns and prohibited inconsistencies

- No legacy “Appointment Doctor” logo, blue medical mark, or unrelated starter social icons.
- No raw palette utility in feature components when a semantic token exists.
- No red prices or green-only success communication.
- No 10 px body copy or 24 px touch controls.
- No hover-only discoverability, focus removal, unlabeled icon buttons, or placeholder-only labels.
- No desktop layout merely scaled down; no public mobile screen locked to a centered 640 px column on desktop.
- No universal card grid when a list/table communicates better.
- No indefinite spinner, blank error page, or empty state used for forbidden data.
- No client-created authorization matrix, role-only gate when effective permissions exist, or assumption that hidden controls provide security.
- No cross-place cart merge, cache leakage, or ambiguous selected-place context.
- No invented payment, delivery, reservation, inventory, promotion, loyalty, scheduled-order, email-verification, or password-reset feature.
- No invented analytics, audit endpoint, category description, verification data, or order timeline timestamp.
- No destructive action styled like a routine brand action or placed without confirmation when consequences are material.
- No optimistic order transition or checkout result that remains displayed after server disagreement.
- No component-library default accepted without token, responsive, and accessibility review.

## 23. Implementation checklist

### Foundations

- [ ] Replace legacy logo/favicon with approved Tooang assets or temporary text wordmark.
- [ ] Map `src/styles.css` variables to the semantic tokens in this document, including info and disabled families.
- [ ] Retain light/dark/system theme support and verify both themes.
- [ ] Standardize Plus Jakarta Sans loading and tabular numerals.
- [ ] Remove raw prototype color values from migrated components.

### Shared components

- [ ] Verify button/input/select/checkbox/radio/switch states and 44 px targets.
- [ ] Provide shared alert, toast, status badge, empty, loading, error, confirmation, drawer/sheet, pagination, and responsive data patterns.
- [ ] Add accessible live regions for cart/order/upload asynchronous changes.
- [ ] Ensure all overlays manage focus, Escape, labels, and focus restoration.
- [ ] Implement image fallback, aspect-ratio reservation, and alt-text API.

### Public/customer

- [ ] Build mobile-first at 320 px before tablet/desktop enhancement.
- [ ] Keep place context, price, availability, quantity, and cart state scannable.
- [ ] Reserve space for sticky cart/checkout actions and device safe area.
- [ ] Implement initial, refresh, empty, no-results, API, offline, unauthorized, conflict, and disabled-business states.
- [ ] Remove every unsupported payment/delivery/scheduling affordance.

### Dashboard

- [ ] Implement persistent desktop sidebar and responsive mobile drawer.
- [ ] Keep selected place visible and key all place-scoped state by `placeId`.
- [ ] Define responsive behavior for each table before implementation.
- [ ] Optimize order queue/status actions for touch and stale-state recovery.
- [ ] Separate global administration visually and technically from place scope.

### Authorization and data integrity

- [ ] Drive visibility from backend-returned effective permissions.
- [ ] Treat backend 403/404/409 semantics correctly and avoid data disclosure.
- [ ] Refetch after sensitive mutations and conflicts.
- [ ] Preserve checkout idempotency across safe retries.
- [ ] Clear private data on logout and prevent cross-place cache flashes.

### Accessibility and quality

- [ ] Test contrast, keyboard, screen reader, 200% zoom, 320 px reflow, reduced motion, and touch targets.
- [ ] Test light and dark tokens for every shared component state.
- [ ] Test long names, translated copy, large prices, missing/broken images, and slow/error networks.
- [ ] Run lint, formatting, tests, type-check, and production build.
- [ ] Perform manual mobile public flow and tablet CASHIER flow before release.

## 24. Assumptions and unresolved design decisions

### Assumptions used in this specification

1. Plus Jakarta Sans remains the approved UI font because it is the current React foundation; Poppins belongs only to the prototype.
2. Existing food imagery is a development reference, not confirmed licensed production content.
3. Dark mode remains supported because the current theme provider and CSS implement it; light remains the main public QA mode.
4. English is the current UI authoring language, while currency/number formatting is Indonesian. Localization strategy is not yet documented.
5. A temporary text wordmark is safer than reusing the known-invalid legacy brand assets.
6. Bottom navigation is useful for the customer mobile experience, but its exact destinations require information-architecture validation once all public routes exist.
7. Dashboard place selection uses validated optional `?placeId=` URL state; stale values are canonicalized and platform routes do not use it for scope.

### Stakeholder approval required

| Decision                                    | Why it matters                                                                  | Recommended default pending approval                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Final Tooang logo, favicon, and brand usage | Current assets are for another product                                          | Use typographic “Tooang” wordmark; never ship legacy mark.                                                   |
| Food photo production licensing/source      | Repository contains photos without documented rights                            | Use uploader-provided media and neutral placeholders; treat samples as fixtures.                             |
| Product language and localization           | Copy is mixed English/product context is Indonesian                             | Author components localization-ready; use English copy and Indonesian IDR formatting for now.                |
| Exact mobile bottom-nav destinations        | Public/customer route set is not implemented yet                                | Discover, Orders, Cart, Account; keep menu contextual.                                                       |
| Whether public pages may force light theme  | Architecture notes some public layouts may force light, while app supports dark | Honor user/system theme unless QA proves a specific blocker.                                                 |
| Guest cart behavior                         | Backend cart is authenticated-user owned                                        | Prompt login before cart mutation; do not create local guest-cart promises without product/backend decision. |
| Refresh cadence for incoming orders         | API exists, realtime transport is not documented                                | Use conservative query polling/background refresh that preserves focus; do not imply realtime.               |
| QR download/print controls                  | Verification exists, output actions are not explicitly required                 | Show scannable QR and code; add export actions only after product approval.                                  |

Any resolution to these items should update this document and the corresponding semantic token/component/page rule rather than being applied as a one-off exception.
