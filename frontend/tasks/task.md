Dengan keputusan itu, urutannya bisa dibuat cukup tegas. Ada satu koreksi arsitektural penting yang akan saya jadikan dasar semua task: **akses dashboard tidak boleh ditentukan hanya oleh `platformRole`**. Seorang `USER` bisa menjadi `OWNER` atau `CASHIER` melalui `PlaceMember`, sehingga dashboard harus dapat diakses berdasarkan effective capability/membership, bukan `ADMIN | DOCTOR` seperti struktur lama. Model backend memang memisahkan `User.platformRole` (`USER | ADMIN | SUPER_ADMIN`) dari `PlaceMember.role` (`OWNER | CASHIER`).

Di bawah ini saya buat setiap task sebagai **prompt mandiri untuk AI Agent di IDE**. Urutannya sengaja dari fondasi → auth → authorization → shell → fitur place → operational → platform administration → hardening.

---

## Phase 1 — Frontend Baseline & Visual Foundation

### Task 01 — Audit Existing Frontend Before Refactor

```text
Study the existing Tooang frontend repository before making implementation changes.

Context:
- The frontend uses React 19, TypeScript, Vite, TanStack Router, TanStack Query, Axios, Tailwind CSS v4, CASL, TanStack Form, Zod, and Vitest.
- The repository was derived from another application and still contains obsolete concepts such as DOCTOR, patients, specialists, and unrelated routes/features.
- Existing reusable infrastructure such as router setup, Query provider, AuthContext, CASL provider, theme provider, API wrapper, and reusable UI primitives should be preserved when they are still appropriate.
- Backend SRS and API contracts are authoritative when they conflict with current frontend assumptions.

Tasks:
1. Inspect the current src directory and identify:
   - reusable infrastructure;
   - obsolete domain-specific code;
   - routes/features that do not belong to Tooang;
   - auth assumptions that conflict with the current backend;
   - authorization assumptions that conflict with the current backend;
   - styling/design-token inconsistencies.
2. Produce a concise refactor plan grouped into:
   - keep;
   - modify;
   - remove;
   - create.
3. Identify dependencies between the proposed changes.
4. Do not implement feature pages yet.

Important:
- Do not delete files yet.
- Do not invent backend contracts.
- Do not change generated routeTree.gen.ts manually.
- Prefer incremental refactoring over rewriting the entire application.

Acceptance criteria:
- The resulting analysis clearly identifies all legacy domain artifacts.
- Existing reusable infrastructure is distinguished from obsolete application-specific code.
- The next implementation steps can be executed without ambiguity.
```

---

### Task 02 — Remove Legacy Domain Architecture

```text
Refactor the existing frontend so its domain structure represents Tooang instead of the previous application.

Use the audit from the previous task.

Remove or replace obsolete concepts such as:
- DOCTOR;
- patients;
- specialists;
- appointment/booking concepts unrelated to Tooang;
- old dashboard role guards;
- obsolete navigation items;
- obsolete domain-specific route files.

Preserve reusable generic infrastructure when appropriate:
- TanStack Router setup;
- TanStack Query integration;
- API/JWT transport layer;
- AuthContext foundation;
- CASL provider;
- ThemeProvider;
- shared UI primitives;
- shared utilities.

Prepare the feature structure for Tooang domains:

src/features/
  auth/
  dashboard/
  users/
  places/
  place-members/
  business-hours/
  dining-tables/
  menus/
  orders/
  reviews/
  media/

Do not implement those features yet.

Requirements:
- Remove imports that reference deleted domains.
- Keep TypeScript compilation valid.
- Do not manually edit routeTree.gen.ts.
- Remove obsolete role constants such as DOCTOR.
- Do not add customer/public features yet.

Acceptance criteria:
- The application builds without legacy domain references.
- Feature folders represent Tooang domains.
- No obsolete doctor/patient/specialist application logic remains.
```

---

### Task 03 — Establish Tooang Design Tokens

```text
Create the frontend visual foundation for Tooang.

The existing HTML template is only an initial design reference, not a final visual source of truth. Improve it where necessary while keeping its useful structural ideas.

Focus only on design tokens and global styling.

Review:
- existing HTML/template styles;
- src/styles.css;
- current Tailwind CSS v4 setup;
- existing UI primitives.

Define semantic tokens for at least:
- background;
- foreground;
- surface/card;
- muted;
- border;
- primary;
- primary foreground;
- secondary;
- destructive;
- success;
- warning;
- sidebar background;
- sidebar foreground;
- sidebar active state;
- focus ring.

Also standardize:
- border radius;
- shadows;
- spacing conventions where needed;
- page background;
- typography hierarchy;
- table surface;
- form surface.

Requirements:
- Prefer semantic CSS variables instead of hardcoded colors throughout components.
- Preserve Tailwind CSS v4 conventions.
- Keep the palette suitable for a modern food/digital-menu management product.
- Do not blindly copy the current template colors.
- Avoid feature-page implementation in this task.
- Preserve dark mode infrastructure if it already works, but prioritize a polished light dashboard first.

Acceptance criteria:
- styles.css provides a coherent semantic token system.
- Existing shared components can consume the tokens.
- No page should require feature-specific hardcoded brand colors.
```

---

### Task 04 — Standardize Shared Dashboard UI Primitives

```text
Prepare reusable UI building blocks required by the Tooang management dashboard.

Do not create domain pages yet.

Review existing components and reuse/refactor them where possible.

Ensure reusable components exist for:
- PageHeader;
- PageContainer;
- SectionCard;
- DataTable shell;
- EmptyState;
- ErrorState;
- LoadingState / skeleton;
- StatusBadge;
- ConfirmDialog;
- SearchInput;
- Pagination;
- Filter controls;
- Form field wrappers;
- responsive drawer/sheet where required by dashboard navigation.

Requirements:
- Use existing Base UI / Radix UI / shared primitives where appropriate.
- Use Lucide icons.
- Use semantic design tokens created previously.
- Avoid domain-specific API calls.
- Components must remain reusable across places, menus, orders, users, and tables.

Acceptance criteria:
- Shared primitives have consistent spacing and visual states.
- Loading, empty, error, and destructive-action patterns are available before feature implementation starts.
```

---

## Phase 2 — Backend Contract & Authentication

Backend yang didokumentasikan sudah menyediakan `/api/v1` untuk authentication, users, places, memberships, business hours, dining tables, menus, carts, orders, reviews, media, dan readiness.

### Task 05 — Align API Configuration With `/api/v1`

```text
Refactor frontend API configuration to match the Tooang backend contract.

Backend API root:
  /api/v1

Review:
- configs/api-config.ts;
- configs/auth/jwt-service.ts;
- environment configuration;
- query defaults;
- API response utilities.

Requirements:
1. VITE_BASE_SERVER_URL should represent the backend server origin.
2. Derive the API base URL as:
   ${VITE_BASE_SERVER_URL}/api/v1
3. Ensure requests do not accidentally produce /api/api/v1 or duplicate path segments.
4. Keep all HTTP traffic behind the existing API/JWT service abstraction.
5. Components must not import Axios directly.
6. Preserve normalized API error handling.
7. Add startup validation for required public environment variables if practical.

Do not implement auth behavior yet.

Acceptance criteria:
- API client points consistently to /api/v1.
- Feature code can use relative paths such as /me, /places, /auth/login.
- No feature component accesses Axios directly.
```

---

### Task 06 — Define Frontend API Response Contracts

```text
Align frontend shared API types with the Tooang backend common response contract.

The backend success response follows conceptually:
{
  error: false,
  message: string,
  data?: ...
  meta?: ...
}

Error responses follow:
{
  error: true,
  message: string,
  code: string,
  details?: ...
}

Create or refactor shared types/utilities for:
- ApiSuccessResponse<T>;
- ApiErrorResponse;
- pagination metadata;
- API error normalization;
- response-data unwrapping.

Requirements:
- Do not invent individual feature DTOs yet.
- Keep errors compatible with backend 400/401/403/404/409 behavior.
- UI must consume normalized application errors rather than raw Axios errors.

Acceptance criteria:
- Shared response types match backend conventions.
- Feature modules can define their own data types on top of this shared contract.
```

---

### Task 07 — Align Authentication Types and `/me`

```text
Refactor frontend authentication types for the Tooang backend.

Remove previous application roles.

Platform roles:
- USER
- ADMIN
- SUPER_ADMIN

Place membership roles:
- OWNER
- CASHIER

Define typed frontend representations for:
- authenticated user;
- platform role;
- place membership;
- permission identifiers;
- effective permissions.

Replace old /auth/me assumptions with:
  GET /me

Important:
- Inspect the actual backend API specification before finalizing response field names.
- Do not invent properties that are not documented or implemented.
- Keep backend response shape separate from optional frontend-derived view models.

Do not implement CASL rules yet.

Acceptance criteria:
- No DOCTOR or old role remains.
- Auth user model can represent both platform role and multiple place memberships.
- /me becomes the canonical session-bootstrap endpoint.
```

---

### Task 08 — Implement Auth Session Bootstrap

```text
Refactor AuthContext so frontend startup correctly bootstraps the Tooang authenticated session.

Flow:
1. Determine whether an access-token/session bootstrap should be attempted using the existing auth transport strategy.
2. Call GET /me.
3. On success:
   - store authenticated user state;
   - expose loading/authenticated state.
4. On authentication failure:
   - clear frontend authentication state.
5. Prevent protected routes from rendering before initial auth bootstrap completes.

Requirements:
- Use TanStack Query only where appropriate; do not maintain duplicate server state unnecessarily.
- Do not yet build permission rules beyond storing backend permission metadata.
- Preserve fullscreen initial fallback behavior.
- GET /me is authoritative for current account state.

Acceptance criteria:
- Reloading an authenticated application restores the session through /me.
- Invalid sessions cleanly become unauthenticated.
- Protected content does not flash before auth bootstrap finishes.
```

---

### Task 09 — Correct Access Token Refresh Flow

```text
Refactor the JWT/API interceptor to match the Tooang authentication API.

Relevant endpoints:
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- GET /me

Fix legacy behavior where /auth/me may have been treated as a refresh endpoint.

Requirements:
- Attach Authorization: Bearer <access-token> to protected requests.
- On eligible 401 responses, attempt POST /auth/refresh once.
- Avoid retry loops.
- Do not attempt refresh for login/register/refresh endpoints.
- After successful refresh, retry the original request once.
- If refresh fails, clear auth state and reject cleanly.
- Support backend refresh-cookie behavior rather than attempting to read HttpOnly cookies from JavaScript.
- Keep concurrent refresh handling safe so multiple simultaneous 401 responses do not generate uncontrolled refresh requests if existing architecture supports request deduplication.

Acceptance criteria:
- Expired access token can be refreshed once.
- Failed refresh ends the authenticated frontend session.
- No infinite request loop is possible.
```

---

### Task 10 — Implement Login and Logout Integration

```text
Integrate the existing login UI with the Tooang backend.

Endpoints:
- POST /auth/login
- POST /auth/logout
- GET /me

Requirements:
- Validate login form using Zod + TanStack Form.
- Submit credentials using feature API/mutation abstractions.
- Store only frontend-accessible token data that the backend contract requires.
- Never attempt to access refresh-token cookies directly.
- After login, bootstrap authoritative user information through /me when necessary.
- On logout:
  - call backend logout;
  - clear access token;
  - clear authenticated user state;
  - reset CASL ability later through existing auth lifecycle;
  - clear relevant private query cache.
- Provide user-friendly error feedback.

Do not implement registration or customer flows in this task.

Acceptance criteria:
- Login and logout work against the backend.
- Reload after login can recover session state.
- Private cached data is not leaked after logout.
```

---

## Phase 3 — Authorization

### Task 11 — Define Typed Permission Model

```text
Create a single frontend permission contract compatible with permissions returned by the Tooang backend.

Requirements:
- Permission identifiers should be typed.
- Do not define frontend role-to-permission matrices.
- Backend permissions are authoritative.
- Frontend permission constants/types exist only for type safety.
- Include permissions required by the management dashboard such as:
  place.read
  place.create
  place.update
  place.publish
  place.delete
  table.read
  table.create
  table.update
  table.delete
  menu.create
  menu.update
  menu.delete
  order.read
  order.cancel
  order.confirm
  order.prepare
  order.ready
  order.complete
  place_member.read
  cashier.assign
  cashier.revoke
  review.moderate
  user.read
  user.deactivate
  owner.assign
  owner.revoke
  platform_role.assign
  platform_role.update
  media.upload
  media.delete

Verify the actual backend permission identifiers before finalizing.

Acceptance criteria:
- No frontend code reconstructs ADMIN/OWNER permissions from roles.
- Permission identifiers have one shared typed definition.
```

---

### Task 12 — Build CASL Ability From Backend Permissions

```text
Refactor the CASL ability layer so it consumes effective permissions returned by the backend.

Requirements:
- Build ability from authenticated user permission metadata.
- Reset ability when user logs out.
- Update ability when /me changes.
- Do not duplicate backend role-permission policy.
- Provide simple reusable APIs/hooks for UI usage, for example conceptually:
  can(permission)
  cannot(permission)

For place-specific operations:
- preserve membership/scope information separately;
- do not encode place IDs into permission identifiers.

Acceptance criteria:
- CASL is driven by backend permissions.
- Components can declaratively hide/disable unauthorized actions.
- Frontend role constants are not used as the main authorization mechanism.
```

---

### Task 13 — Implement Place-Scoped Capability Helpers

```text
Implement frontend helpers for place-scoped UI authorization.

The backend separates permission identity from resource scope.

Create an approach conceptually equivalent to:
- can(permission)
- canAtPlace(placeId, permission)

Requirements:
- Global platform permissions may allow access without a PlaceMember.
- OWNER/CASHIER capabilities must consider the user's memberships for the selected place.
- Do not generate permission strings containing place IDs.
- Do not treat frontend checks as security boundaries.
- Keep scope resolution reusable for navigation, buttons, and route UX.

Use actual /me membership and permission data rather than hardcoded role policy whenever the backend provides sufficient metadata.

Acceptance criteria:
- OWNER UI appears only for owned places.
- CASHIER operations appear only for assigned places.
- ADMIN/SUPER_ADMIN global permissions continue to work without membership.
```

---

### Task 14 — Replace Legacy Dashboard Route Guard

```text
Replace the legacy ADMIN/DOCTOR dashboard guard with Tooang-compatible dashboard access logic.

Dashboard management access should be available when the authenticated user has at least one relevant management capability, for example through:
- ADMIN/SUPER_ADMIN global permissions; or
- OWNER/CASHIER membership capabilities.

Do not require platformRole ADMIN for OWNER/CASHIER users.

Requirements:
- Require an authenticated user first.
- Determine dashboard eligibility using effective permissions/membership context.
- Use safe redirects for unauthorized users.
- Do not expose hidden routes merely through navigation filtering.

Acceptance criteria:
- USER + OWNER membership can enter dashboard.
- USER + CASHIER membership can enter dashboard.
- ADMIN and SUPER_ADMIN can enter dashboard.
- Plain USER without management capabilities cannot access management dashboard.
```

---

## Phase 4 — Dashboard Shell

### Task 15 — Build Responsive Dashboard Layout

```text
Build the reusable Tooang management dashboard shell using the existing template only as a structural reference.

Create/refactor:
- sidebar;
- topbar;
- mobile navigation;
- main content area;
- user menu;
- breadcrumb/page heading region.

Requirements:
- Use Tooang design tokens.
- Responsive desktop/mobile behavior.
- Sidebar must support grouped navigation.
- Do not hardcode OWNER/ADMIN menus directly into layout JSX.
- Navigation data will be permission-filtered.
- Preserve accessibility for keyboard navigation and focus states.

Do not integrate feature APIs yet.

Acceptance criteria:
- Dashboard shell works across common viewport sizes.
- Routes can render pages inside the shell.
- Visual styling is coherent and no longer tied to obsolete template colors.
```

---

### Task 16 — Implement Permission-Aware Navigation

```text
Create dashboard navigation configuration and permission-aware rendering.

Navigation groups should conceptually support:

GENERAL
- Overview

PLACE
- Orders
- Menu
- Dining Tables
- Business Hours
- Members
- Settings

PLATFORM
- Places
- Orders
- Reviews
- Users

Requirements:
- Filter navigation using effective permissions.
- Place navigation must consider selected-place scope.
- Platform navigation must use global capabilities.
- Do not base menu visibility only on platformRole.
- Keep route paths typed through TanStack Router where practical.
- Hidden navigation must not replace route guards.

Acceptance criteria:
- CASHIER sees operational place navigation only.
- OWNER sees place-management navigation.
- ADMIN/SUPER_ADMIN see relevant global navigation.
```

---

### Task 17 — Implement Place Switcher Context

```text
Implement the active-place selection experience for the dashboard.

Use memberships and accessible place information from authenticated/backend data.

Requirements:
- Add a place switcher in the dashboard shell.
- Persist selected place appropriately, preferably using URL state or another predictable mechanism rather than hidden mutable global state.
- Validate that the selected place remains accessible after /me refresh.
- Automatically select a sensible first accessible place when no selection exists.
- Global ADMIN/SUPER_ADMIN pages must not unnecessarily depend on selected place.
- Changing active place must update place-scoped navigation and route behavior.

Do not fetch every feature dataset yet.

Acceptance criteria:
- OWNER/CASHIER users can move between assigned places.
- Navigation capabilities update with selected place.
- Invalid/stale selected places are handled safely.
```

---

### Task 18 — Create Dashboard Overview UI

```text
Create the first management dashboard overview page.

Do not invent financial/revenue analytics because Tooang V1 has no payment processing.

Build useful operational sections using data that existing backend APIs can actually support, such as:
- pending orders;
- confirmed/preparing orders;
- ready orders;
- recent orders;
- selected place identity/status;
- ordering enabled/published state.

If the backend does not expose aggregate endpoints, derive only reasonable summaries from existing bounded order/place endpoints.

Requirements:
- Provide loading, empty, and error states.
- OWNER/CASHIER overview should use selected-place context.
- ADMIN/SUPER_ADMIN may receive a simpler platform overview if global data is available.
- Do not invent unsupported analytics.

Acceptance criteria:
- Overview reflects real backend data only.
```

PRD secara eksplisit menyatakan payment gateway/settlement bukan scope V1, jadi dashboard tidak seharusnya menampilkan pseudo-revenue analytics.

---

## Phase 5 — Place Management

### Task 19 — Implement Accessible Places Page

```text
Implement the management Places page.

Use the documented backend place endpoints.

Requirements:
- Define feature-local:
  places.api.ts
  places.key.ts
  places.query.ts
  places.type.ts
  places.schema.ts where required.
- Render a paginated place list where the API supports it.
- Add search/filter only if supported by the backend contract.
- Respect global versus place-scoped access.
- Provide loading, empty, error, and pagination states.
- Do not invent unsupported query parameters.

Acceptance criteria:
- ADMIN/SUPER_ADMIN can use global place access according to backend permissions.
- Place-scoped users see only data supported by their available endpoints/context.
```

---

### Task 20 — Implement Place Detail / Overview

```text
Implement a place management detail/overview page.

Display available backend fields such as:
- name;
- type;
- description;
- address/city;
- timezone;
- publishing state;
- ordering state;
- contact/media where available.

Requirements:
- Fetch by the backend-supported identifier.
- Handle 403/404 appropriately.
- Show actions only when the user has the corresponding permission.
- Do not implement editing yet.

Acceptance criteria:
- Place details are rendered from real backend data.
- Permission-restricted actions are hidden or disabled appropriately.
```

---

### Task 21 — Implement Place Profile Editing

```text
Implement editing for supported place profile fields.

Use:
  PATCH /places/:placeId

Requirements:
- Inspect backend API specification for exact accepted fields.
- Use TanStack Form + Zod.
- Prepopulate from current place data.
- Submit only supported mutable fields.
- Normalize API errors to field/general feedback.
- Invalidate relevant place queries after success.
- Require place.update capability in the UI.
- Do not add publishing/ordering toggles in this task.

Acceptance criteria:
- OWNER can edit owned place if permitted.
- ADMIN/SUPER_ADMIN global place.update works.
- Unauthorized UI does not expose edit controls.
```

---

### Task 22 — Implement Publishing and Ordering Controls

```text
Implement place publishing and ordering controls.

Endpoints:
- PATCH /places/:placeId/publishing
- PATCH /places/:placeId/ordering

Requirements:
- Treat them as distinct domain operations.
- Show current states clearly.
- Require appropriate permissions.
- Use confirmation UI for potentially disruptive state changes.
- Display backend conflict/domain-rule errors rather than trying to reproduce all domain rules client-side.
- Refresh place data after mutation.

Acceptance criteria:
- Publishing and ordering states remain synchronized with backend state.
- Domain conflicts such as incomplete place requirements are surfaced correctly.
```

---

## Phase 6 — Place Operational Features

### Task 23 — Implement Business Hours Management

```text
Implement place business-hours management.

Relevant routes:
- GET /places/:placeId/business-hours
- PUT /places/:placeId/business-hours/:day

Requirements:
- Render seven day rows.
- Support closed/open state.
- Support opening and closing times.
- Allow overnight ranges because backend supports overnight hours.
- Display place timezone prominently.
- Validate fields with Zod before submit.
- Save one day independently to keep mutations small and resilient.
- Invalidate business-hours query after update.

Acceptance criteria:
- OWNER/global admins can edit business hours.
- CASHIER cannot edit.
- Closed-day and overnight UI semantics are clear.
```

---

### Task 24 — Implement Dining Table List

```text
Implement dining-table management list for a selected place.

Endpoints:
- GET /places/:placeId/dining-tables
- POST /places/:placeId/dining-tables

Requirements:
- Display table identifier/name and active state.
- CASHIER may receive read-only UI where permitted.
- OWNER/ADMIN/SUPER_ADMIN may see create actions based on permissions.
- Account for the known backend contract that this collection may currently be unpaginated.
- Do not add client-side fake pagination.

Acceptance criteria:
- Table list accurately reflects backend state.
- Read-only versus management controls follow effective permissions.
```

---

### Task 25 — Implement Dining Table Edit and Delete

```text
Implement dining-table detail mutations.

Endpoints:
- GET /places/:placeId/dining-tables/:tableId
- PATCH /places/:placeId/dining-tables/:tableId
- DELETE /places/:placeId/dining-tables/:tableId

Requirements:
- Edit supported name/activation fields only.
- Confirm destructive delete actions.
- Show backend uniqueness/conflict errors clearly.
- Invalidate collection/detail queries after mutation.
- Preserve CASHIER read-only behavior.

Acceptance criteria:
- Table create/update/delete lifecycle works against backend.
```

---

### Task 26 — Implement Menu Category Management

```text
Implement menu-category management for a selected place.

First inspect the backend menu API specification for exact routes and payloads.

Requirements:
- List categories.
- Create category.
- Update category.
- Enable/disable or ordering behavior only if documented.
- Soft-delete using the documented endpoint.
- Support sortOrder if present in the contract.
- Use permission-aware controls.
- Use TanStack Query mutations and targeted invalidation.

Do not implement menu items yet.

Acceptance criteria:
- OWNER/global administrators can maintain categories.
- Unsupported fields/actions are not invented.
```

---

### Task 27 — Implement Menu Item List

```text
Implement management UI for menu items in a selected place.

Requirements:
- Use backend management menu endpoints.
- Display:
  name;
  FOOD/DRINK type;
  category;
  price;
  availability;
  image if available.
- Provide category/type filters only according to backend contract.
- Format IDR values consistently.
- Do not use floating-point calculations for business logic; display backend monetary values safely.
- Add loading, error, empty, and filter states.

Do not implement create/edit form yet.

Acceptance criteria:
- Menu management list reflects backend data and selected place.
```

---

### Task 28 — Implement Menu Item Create/Edit/Delete

```text
Implement menu-item mutations.

Requirements:
- Create and edit forms using TanStack Form + Zod.
- Fields must match the backend API specification exactly.
- Category options must belong to the selected place.
- Support FOOD/DRINK enum.
- Support price and availability fields according to contract.
- Confirm delete operations.
- Invalidate menu/category queries where necessary.
- Do not implement media upload in this task.

Acceptance criteria:
- Menu item CRUD works without cross-place category selection.
- Validation and API errors are user-friendly.
```

---

## Phase 7 — Place Membership

### Task 29 — Implement Place Member List

```text
Implement member management/read view for a selected place.

Endpoint:
  GET /places/:placeId/members

Requirements:
- Display member identity fields allowed by the API.
- Display membership role:
  OWNER
  CASHIER
- Respect backend data minimization.
- CASHIER should receive only the view allowed by backend permissions.
- OWNER/global admin behavior must use effective permissions.
- Account for the known contract that the collection may currently be unpaginated.
- Do not implement mutations yet.

Acceptance criteria:
- Membership list accurately represents backend data.
```

---

### Task 30 — Implement CASHIER Assignment and Revocation

```text
Implement CASHIER membership management.

Relevant endpoints:
- PUT /places/:placeId/members/:userId
- DELETE /places/:placeId/members/:userId

Requirements:
- OWNER can assign/revoke CASHIER only where backend permits.
- ADMIN can manage CASHIER globally according to permissions.
- Do not allow OWNER membership mutation through OWNER UI.
- SUPER_ADMIN-specific OWNER management will be implemented separately.
- Confirm membership revocation.
- Surface backend invariant/conflict errors.

Acceptance criteria:
- CASHIER lifecycle follows backend authorization boundaries.
```

---

## Phase 8 — Order Operations

### Task 31 — Implement Place Order Queue

```text
Implement the operational order queue for a selected place.

Use documented endpoints under:
  /places/:placeId/orders

Requirements:
- Display relevant statuses:
  PENDING
  CONFIRMED
  PREPARING
  READY
  COMPLETED
  CANCELLED
  EXPIRED
- Provide supported filtering/pagination only when documented.
- Make high-attention states easy to distinguish.
- CASHIER and OWNER must be scoped to assigned/owned places.
- Do not implement status mutations yet.

Acceptance criteria:
- Operational queue can be used by CASHIER and OWNER without exposing cross-place data.
```

---

### Task 32 — Implement Operational Order Detail

```text
Implement authenticated operational order details.

Requirements:
- Use authenticated order endpoints, never the public verification endpoint for operational details.
- Display order items, quantities, snapshots, fulfillment information, dining-table snapshot when applicable, timestamps, notes, and status according to API response.
- Do not expose internal tokens.
- Provide clear terminal/non-terminal states.
- Prepare action area for permitted transitions.

Acceptance criteria:
- Operational users can inspect permitted orders.
- No public-verification shortcut is used for protected operational data.
```

---

### Task 33 — Implement Order Status Transitions

```text
Implement order lifecycle actions according to backend permissions and domain states.

Possible operations include:
- confirm;
- prepare;
- ready;
- complete;
- cancel.

Requirements:
- Inspect exact backend mutation endpoints before implementation.
- Render only actions permitted by effective permissions and current order status.
- Backend remains authoritative for valid transitions.
- Handle 409 race/state conflicts by refreshing order state.
- Require cancellation reason where backend requires it.
- Refresh queue and detail after successful mutation.

Do not recreate the backend state machine as a security mechanism; frontend logic is UX assistance only.

Acceptance criteria:
- CASHIER/OWNER/global administrators can perform only currently valid visible actions.
- Concurrent/stale transition errors recover cleanly.
```

---

## Phase 9 — Platform Administration

### Task 34 — Implement Global Orders Page

```text
Implement the global orders page for actors with global order.read capability.

Use documented global /orders endpoints.

Requirements:
- Reuse order table/detail components where practical.
- Keep place-level order queue and global order access as different query scopes.
- Add documented pagination/filtering only.
- Do not require selected-place context.
- Only expose page/navigation when global permission exists.

Acceptance criteria:
- ADMIN/SUPER_ADMIN can inspect globally permitted orders.
- OWNER/CASHIER do not gain global scope through this UI.
```

---

### Task 35 — Implement User Administration List

```text
Implement the platform user-management list.

Endpoint:
  GET /users

Requirements:
- Paginated list.
- Display only API-exposed safe user fields.
- Show platform role where returned.
- Add documented search/filtering only.
- Access requires user.read.
- Do not implement role/deactivation mutations yet.

Acceptance criteria:
- ADMIN/SUPER_ADMIN with user.read can browse users.
```

---

### Task 36 — Implement User Deactivation

```text
Implement account deactivation through the documented user endpoint.

Relevant endpoint:
  DELETE /users/:userId

Requirements:
- Require explicit confirmation.
- Respect frontend permission visibility.
- Do not attempt to reproduce ADMIN/SUPER_ADMIN target restrictions as authoritative logic.
- Show backend 403/409 invariant errors clearly.
- Refresh user list/detail after successful mutation.

Acceptance criteria:
- Eligible users can be deactivated.
- ADMIN cannot use UI as a workaround to deactivate protected role targets.
```

---

### Task 37 — Implement Review Moderation

```text
Implement platform review moderation for users with review.moderate.

Review backend API documentation first because place-review and menu-item-review routes may differ.

Requirements:
- Provide review list/moderation views supported by existing endpoints.
- Show target type, rating, comment, author information only where API exposes it, and relevant place/menu context.
- Allow moderation delete through documented endpoints.
- Confirm destructive actions.
- Refresh affected data after moderation.

Acceptance criteria:
- ADMIN/SUPER_ADMIN moderation works using backend-defined capabilities.
```

---

### Task 38 — Implement SUPER_ADMIN Platform Role Management

```text
Implement SUPER_ADMIN-only platform-role management.

Endpoint:
  PUT /users/:userId/platform-role

Supported platform roles:
- USER
- ADMIN
- SUPER_ADMIN

Requirements:
- UI access requires relevant platform-role permission.
- Use an explicit confirmation step.
- Do not allow arbitrary/custom role strings.
- Handle last-SUPER_ADMIN invariant conflicts from backend.
- Refresh target user and user-list data after mutation.

Acceptance criteria:
- Platform role mutation is unavailable to ADMIN/OWNER/CASHIER.
- Backend invariants remain authoritative.
```

---

### Task 39 — Implement SUPER_ADMIN OWNER Membership Management

```text
Extend place-member administration for SUPER_ADMIN OWNER membership operations.

Use documented place-member endpoints and exact payloads.

Requirements:
- SUPER_ADMIN may assign/change/revoke OWNER where backend permits.
- Distinguish OWNER operations clearly from CASHIER management.
- Handle last-OWNER invariant conflicts.
- Do not let ordinary OWNER or ADMIN UI expose OWNER assignment/revocation.
- Refresh membership/place data after mutation.

Acceptance criteria:
- OWNER membership security boundaries match backend policy.
```

---

## Phase 10 — Media

### Task 40 — Implement ImageKit Upload Authorization Client

```text
Implement frontend integration with the Tooang ImageKit upload-authorization workflow.

Do not place ImageKit private credentials in the frontend.

Requirements:
- Inspect backend media API specification first.
- Request short-lived upload authorization from Tooang backend.
- Upload directly to ImageKit only using backend-issued client-safe authorization.
- Support only backend-allowed image types:
  jpeg
  png
  webp
  avif
- Enforce the documented 5 MB client-side UX limit while keeping backend authoritative.
- Provide upload progress/error feedback.
- Keep provider-specific code isolated in the media feature/integration layer.

Do not attach images to place/menu entities yet.

Acceptance criteria:
- Frontend contains no ImageKit private API secret.
- Authorized image upload can complete successfully.
```

---

### Task 41 — Integrate Place and Menu Media

```text
Integrate media upload/detach workflows into place and menu management forms.

Requirements:
- Use backend media attachment/detach contracts exactly.
- Support relevant place logo/cover and menu-item images when documented.
- Show preview, upload progress, replacement, and removal state.
- Do not assume remote cleanup succeeded until backend confirms the application mutation.
- Refresh corresponding place/menu queries after successful changes.

Acceptance criteria:
- Place/menu media lifecycle works through backend-approved ImageKit integration.
```

---

## Phase 11 — UX Hardening

### Task 42 — Standardize Loading, Empty, Error and Mutation Feedback

```text
Audit all management-dashboard pages and standardize application states.

Requirements:
- Skeleton/loading state;
- empty state;
- recoverable error state;
- 403 capability denial;
- 404 hidden/not-found resource;
- 409 conflict/state change;
- mutation loading state;
- success toast;
- destructive failure toast;
- retry behavior where appropriate.

Use shared components created earlier.

Do not show raw backend stack traces, Axios objects, or internal errors.

Acceptance criteria:
- Every dashboard data surface handles loading/error/empty states consistently.
```

---

### Task 43 — Add Dashboard Error Boundaries

```text
Add route/layout-level error boundaries to the management dashboard.

Requirements:
- Prevent a single feature failure from breaking the entire app shell where possible.
- Provide retry/navigation recovery.
- Preserve authentication state when the failure is unrelated to authentication.
- Distinguish unexpected UI errors from expected API states.

Acceptance criteria:
- Dashboard remains recoverable after a feature rendering/query failure.
```

---

## Phase 12 — Tests

### Task 44 — Test Authentication Lifecycle

```text
Add frontend tests for the Tooang authentication lifecycle using Vitest and the project's existing testing setup.

Cover:
- initial /me bootstrap;
- authenticated bootstrap success;
- invalid session;
- successful login;
- logout cleanup;
- one-time access-token refresh;
- failed refresh;
- prevention of infinite refresh loop.

Focus on behavior rather than implementation details.

Acceptance criteria:
- Critical authentication paths have deterministic automated tests.
```

---

### Task 45 — Test Permission and Dashboard Access

```text
Add authorization-focused frontend tests.

Test representative scenarios:

1. Plain USER:
   - cannot enter management dashboard.

2. USER + CASHIER membership:
   - can enter dashboard;
   - sees order/table operational UI;
   - does not see menu/place configuration actions.

3. USER + OWNER membership:
   - can manage owned-place UI;
   - cannot see global platform administration.

4. ADMIN:
   - sees global administrative features permitted by backend metadata;
   - does not see SUPER_ADMIN-only role/OWNER operations.

5. SUPER_ADMIN:
   - sees platform-role and OWNER management UI.

6. Multiple memberships:
   - changing active place changes place-scoped capabilities.

Requirements:
- Tests must use backend-like permission metadata.
- Do not encode an alternative frontend role-permission matrix.

Acceptance criteria:
- Navigation, action visibility, and route access follow effective permissions.
```

---

### Task 46 — Test Critical Feature Mutations

```text
Add targeted tests for high-risk management operations.

Cover representative flows:
- place update;
- publishing/ordering toggle;
- dining-table mutation;
- menu mutation;
- CASHIER membership mutation;
- order status transition;
- user deactivation;
- platform-role mutation;
- OWNER membership mutation.

Focus especially on:
- successful mutation;
- API 403;
- API 404;
- API 409;
- query invalidation/refetch;
- destructive confirmation.

Acceptance criteria:
- High-risk dashboard actions are regression-tested.
```

---

## Phase 13 — Final Cleanup

### Task 47 — Audit Query Keys and Cache Invalidation

```text
Audit all Tooang frontend TanStack Query usage.

Requirements:
- Standardize feature query-key factories.
- Ensure list/detail keys compose predictably.
- Remove duplicated ad-hoc keys.
- Verify mutation invalidation is neither too broad nor insufficient.
- Prevent place A data from appearing temporarily under place B.
- Ensure logout clears private cached data.

Acceptance criteria:
- Query cache behavior is predictable across place switching and mutations.
```

---

### Task 48 — Final Architecture Alignment

```text
Perform a final frontend architecture review after management dashboard implementation.

Verify:
- feature-oriented structure;
- route-driven composition;
- /api/v1 contract;
- GET /me auth bootstrap;
- POST /auth/refresh behavior;
- backend-driven CASL permissions;
- platform-role versus PlaceMember separation;
- permission-aware dashboard access;
- selected-place scoping;
- no legacy DOCTOR/patient/specialist code;
- no frontend role-permission source of truth;
- no direct Axios calls from components;
- no unsupported backend fields/endpoints;
- consistent design tokens;
- consistent error/loading states.

Update ARCHITECTURE.md to describe the implemented Tooang frontend rather than the legacy application's behavior.

Run:
- lint;
- formatting check;
- tests;
- production build.

Acceptance criteria:
- Documentation and implementation agree.
- All quality commands pass.
- No known legacy architectural assumptions remain.
```

---

### Urutan dependency yang perlu dipertahankan

Secara praktis, jangan menjalankan task domain sebelum foundation-nya selesai:

```text
01–04
Architecture + Visual Foundation
        ↓
05–10
API + Authentication
        ↓
11–14
Authorization
        ↓
15–18
Dashboard Shell
        ↓
19–30
Place Management
        ↓
31–33
Order Operations
        ↓
34–39
Platform Administration
        ↓
40–41
Media
        ↓
42–48
Hardening + Tests
```

Ada satu hal yang sengaja saya ubah dari frontend architecture awal: **`role check` bukan lagi lapisan utama dashboard authorization**. Arsitektur akhirnya seharusnya kurang lebih menjadi:

```text
Authentication
      │
      ▼
GET /me
      │
      ├── platformRole
      ├── effective permissions
      └── place memberships
              │
              ▼
        CASL Ability
              +
        Place Scope
              │
       ┌──────┴───────┐
       ▼              ▼
Route Access      UI Visibility
       │              │
       └──────┬───────┘
              ▼
        Backend API
     authoritative authz
```

Ini selaras dengan SRS: frontend permission checks hanya mengatur visibility/navigation/interactions, sedangkan backend tetap menjadi security boundary dan harus mengecek current server-side role, membership, scope, serta domain rules.

Saya juga sengaja belum memasukkan **register, public place discovery, customer menu, cart, checkout, own orders, dan customer reviews** ke 48 task tersebut. Itu lebih baik menjadi **batch kedua: Customer/Public Frontend**, setelah management dashboard stabil.
