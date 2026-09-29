# Batch 02 — Customer / Public Frontend

## Existing Frontend Readiness Assessment

The frontend is moderately ready for Batch 2. Batch 1 established a strong reusable foundation: React 19, TypeScript, Vite, TanStack Router file-based routing, TanStack Query, the shared Axios/JWT transport, refresh-session recovery, TanStack Form, Zod, CASL, Tailwind CSS v4 semantic tokens, accessible shared primitives, Sonner, Vitest, and feature-oriented service/query/type boundaries. Existing `orders`, `reviews`, `users`, `places`, auth, currency, API-response, and API-error code can be extended instead of rebuilt.

The customer application itself is not implemented. The current `/` route is an authenticated placeholder; public place/menu query layers, a customer shell, carts, checkout, customer-facing order routes, public verification, and mobile interaction tests are absent. Existing `/dashboard/account/*` pages are useful contract references but use dashboard information architecture and must not become the primary customer experience.

Backend implementation and the `/api/v1` specifications are authoritative for endpoints, fields, validation, authorization, state transitions, and conflicts. `frontend/design.md` is authoritative for visual and interaction decisions. HTML in `frontend/templates/` is reference material only.

## Blocking Backend Contract Gates

Baseline last verified against backend implementation, API specifications, and SRS v1.3 on **2026-09-29**. These gates are prerequisites, not frontend implementation tasks. If a gate remains unresolved, complete unaffected behavior, record the blocker, and do not invent a frontend contract.

| Gate                                 | Status                        | Implemented contract and defect                                                                                                                                                                                                                                 | Affected Batch 2 work                                                                                                                      |
| ------------------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Customer DINE_IN table discovery     | **BLOCKED**                   | Checkout requires `tableId` for `DINE_IN`, but the only table collection, `GET /api/v1/places/:placeId/dining-tables`, requires target-place or global `table.read`. An ordinary `USER` has no `table.read` grant and no customer table-option endpoint exists. | Tasks 24–25, the DINE_IN portion of Task 42, and final acceptance in Task 44. TAKEAWAY remains available.                                  |
| Customer verification QR/link source | **BLOCKED**                   | Checkout and own-order serializers omit `verificationToken`; `GET /api/v1/order-verifications/:token` only consumes an already-known token. No customer response supplies a verification token or URL.                                                          | The QR/link enhancement in Task 27 and its Task 44 release check. The public `/verify/$token` consumer route in Task 36 remains supported. |
| Cart totals                          | **BLOCKED — contract defect** | `backend/docs/api-specification/carts.md` promises item `lineTotal` and cart `subtotal`, but `CartsService` returns current `unitPrice`, quantities, counts, and reconciliation data without either total.                                                      | Tasks 19, 21, 23–24, related Task 42 assertions, and Task 44. Implemented cart fields remain usable.                                       |

### Gate evidence and resolution requirements

#### Gate 1 — Customer DINE_IN table discovery

- Implemented staff/management read: `GET /api/v1/places/:placeId/dining-tables`; UUID path parameter, no body, bearer authentication, and `table.read` permission. Success is `200` with `{ data: { tables } }`; each table exposes `tableId`, `placeId`, `name`, `isActive`, `createdAt`, and `updatedAt`. Authentication failure is `401`, a missing permission is `403`, and a hidden missing/deleted/revoked place scope is `404`.
- Checkout input: `POST /api/v1/me/orders` accepts a strict `DINE_IN` body containing `placeId`, `fulfillmentType: "DINE_IN"`, required `tableId`, `customerName`, and optional `customerNote`. A missing or invalid field is `400`; an unavailable/foreign table is hidden as `404`; checkout state conflicts are `409`.
- Permission evidence: ordinary `USER` platform grants include `order.checkout` but exclude `table.read`. CASHIER/OWNER membership or an explicit ADMIN/SUPER_ADMIN global grant supplies `table.read`; that management authority must not be used as a customer fallback.
- Authoritative files: `backend/docs/api-specification/dining-tables.md`, `backend/docs/api-specification/orders.md`, `backend/src/modules/places/dining-tables.controller.ts`, `backend/src/modules/places/dining-tables.schema.ts`, `backend/src/modules/places/dining-tables.service.ts`, `backend/src/modules/orders/orders.schema.ts`, `backend/src/modules/orders/orders.service.ts`, `backend/src/common/auth/permissions.ts`, `backend/src/common/auth/__tests__/permissions.spec.ts`, and `backend/src/modules/users/__tests__/users.service.spec.ts`.
- Resolution requirement: add an approved customer-scoped, active-table-only endpoint or checkout-options response and document its safe fields, authorization, errors, and caching behavior. This can be additive to `/api/v1`; changing the management collection's authorization requires an explicit security review. Until implementation and specification agree, Task 25 remains blocked and Task 24 must not offer an unusable DINE_IN submission.

#### Gate 2 — Customer verification QR/link source

- Checkout: `POST /api/v1/me/orders` returns `201` with `{ data: { order } }`, including order identity/code, place ID, status, fulfillment/customer/table snapshots, item snapshots, server subtotal, and timestamps. It intentionally omits `verificationToken`.
- Own-order reads: `GET /api/v1/me/orders` and `GET /api/v1/me/orders/:orderId` require own `order.read`, return `200`, and expose safe summaries/details without verification tokens. Foreign ownership is a hidden `404`.
- Token consumption: `GET /api/v1/order-verifications/:token` is public and read-only. A valid token returns `200` with exactly `orderCode`, `placeName`, `status`, `fulfillmentType`, `createdAt`, `expiresAt`, and `statusUpdatedAt`. Malformed, unknown, disabled, and retention-expired tokens share `404 ORDER_VERIFICATION_NOT_FOUND`; rate limiting may return `429`.
- Authoritative files: `backend/docs/api-specification/orders.md`, `backend/src/modules/orders/orders.controller.ts`, `backend/src/modules/orders/order-access.controller.ts`, `backend/src/modules/orders/orders.service.ts`, `backend/src/modules/orders/order-queries.service.ts`, `backend/src/modules/orders/order-verification.service.ts`, `backend/src/modules/orders/__tests__/order-queries.service.spec.ts`, `backend/src/modules/orders/__tests__/order-verification.service.spec.ts`, and `backend/src/modules/orders/__tests__/orders.repository.spec.ts`.
- Resolution requirement: approve and implement a privacy-preserving way for an order owner to obtain verification-link data. Do not silently add the opaque token to existing customer order responses: their documented non-disclosure is deliberate and any change requires SRS/privacy review plus an explicit compatibility decision. Until then, Task 27 renders no QR/link; Task 36 may consume a token already present in its URL.

#### Gate 3 — Cart totals

- Routes: `GET /api/v1/me/carts/:placeId`, `POST /api/v1/me/carts/:placeId/items`, and `PATCH`/`DELETE /api/v1/me/carts/:placeId/items/:menuItemId` require bearer authentication and own `cart.manage`. All successful operations return `200` with `{ data: { cart } }`.
- Implemented response: `cartId`, `placeId`, `distinctItemCount`, `aggregateQuantity`, `items[]`, and `removedItems[]`. Each item currently contains `menuItemId`, `name`, `type`, `category`, `unitPrice`, `quantity`, and `note`; neither item `lineTotal` nor cart `subtotal` is serialized. An empty cart has `cartId: null` and empty arrays.
- Significant failures: malformed identifiers/body and quantity/size limits are `400`; authentication/permission failures are `401`/`403`; missing place/item scope is `404`; unavailable items and exhausted concurrent modification are `409` with stable domain codes where implemented.
- Defect: `backend/docs/api-specification/carts.md` states that `lineTotal` and `subtotal` are returned and server-recomputed, but `backend/src/modules/carts/carts.service.ts` does not return them. Documentation alone does not resolve the gate.
- Authoritative files: `backend/docs/api-specification/carts.md`, `backend/src/modules/carts/carts.controller.ts`, `backend/src/modules/carts/carts.schema.ts`, `backend/src/modules/carts/carts.service.ts`, `backend/src/modules/carts/carts.repository.ts`, and `backend/src/modules/carts/__tests__/*`.
- Resolution requirement: align implementation, specification, and tests. Adding the already-documented numeric totals to the existing response is additive for consumers, but the frontend must not model them until the implementation actually returns them. Until then, use implemented fields only; any client arithmetic must be explicitly labeled an estimate and never presented as checkout-authoritative.

### Customer/public endpoint ledger

All paths below are under `/api/v1`. `Public` means no bearer token; `own` permissions are granted to an active ordinary user but are still enforced by the backend on every request.

| Area          | Endpoint and supported input                                                                                                                                                                                                                                                                                                                                                     | Authentication / permission                                                                                                     | Success and safe response boundary                                                                                                                                                                                                                                                                 | Significant errors                                                                                                                                                                             | Primary authority                                                                                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public places | `GET /places?page&limit&search&type&city`; defaults `1/20`, maximum limit `100`, search max `120`, city max `100`, type `RESTAURANT\|CAFE\|FOOD_STALL\|OTHER`. `GET /places/:slug` uses a lowercase ASCII kebab-case slug, max `100`.                                                                                                                                            | Public.                                                                                                                         | `200`; list returns `data.places` plus pagination metadata for published/non-deleted places. Detail returns `data.place` with safe place fields, seven-day `businessHours`, and authoritative `isOpen`. The list does not return `isOpen`.                                                         | `400` invalid query/slug; detail `404` for unknown, unpublished, or deleted place.                                                                                                             | `backend/docs/api-specification/places.md`; `backend/src/modules/places/places.controller.ts`, `places.schema.ts`, `places.service.ts`.                                        |
| Public menu   | `GET /places/:placeId/menu?page&limit&type&categoryId`; standard pagination, optional `FOOD\|DRINK` type and UUID category. No free-text search or `isAvailable` query.                                                                                                                                                                                                          | Public.                                                                                                                         | `200`; `data.categories[]` groups the current page's eligible items and includes category identity/name/order/thumbnail plus safe item fields; pagination counts items before grouping.                                                                                                            | `400` invalid input; `404` when the place is not public/active.                                                                                                                                | `backend/docs/api-specification/menus.md`; `backend/src/modules/menus/menus.controller.ts`, `menus.schema.ts`, `menus.service.ts`.                                             |
| Carts         | `GET /me/carts/:placeId`; `POST .../items` with `{ menuItemId, quantity?, note? }`; `PATCH .../items/:menuItemId` with at least quantity or note; `DELETE .../items/:menuItemId`. Quantity is `1–99` on add and `0–99` on update; zero removes; note is nullable and max `500` code points.                                                                                      | Bearer; own `cart.manage`.                                                                                                      | `200`; complete reconciled implemented cart shape described in Gate 3. Reconciliation may remove invalid rows and return bounded reasons.                                                                                                                                                          | `400` validation/limits; `401`; `403`; hidden `404` for place/item scope; `409 MENU_ITEM_UNAVAILABLE` or concurrent-state conflict.                                                            | `backend/docs/api-specification/carts.md`; `backend/src/modules/carts/carts.controller.ts`, `carts.schema.ts`, `carts.service.ts`.                                             |
| Checkout      | `POST /me/orders` with required `Idempotency-Key` (`1–255`, `[A-Za-z0-9._:-]`). Strict TAKEAWAY body: `placeId`, fulfillment type, customer name, optional note. Strict DINE_IN adds required `tableId`. Prices, items, totals, phone, payment, and user ID are not accepted.                                                                                                    | Bearer; own `order.checkout`.                                                                                                   | `201`; `data.order` contains safe order/item/table snapshots and server subtotal, never `verificationToken`. Same unexpired key plus the same normalized payload replays the stored `201`.                                                                                                         | `400` validation; `401`; `403`; `404` unavailable place/table; stable `409` cart/place/ordering/hours/item/total/idempotency/concurrency conflicts; `503 ORDER_CODE_ALLOCATION_FAILED`.        | `backend/docs/api-specification/orders.md`; `backend/src/modules/orders/orders.controller.ts`, `orders.schema.ts`, `orders.service.ts`.                                        |
| Own orders    | `GET /me/orders?page&limit&status&fulfillmentType&placeId`; `GET /me/orders/:orderId`; `PATCH /me/orders/:orderId/status` with `{ status: "CANCELLED", cancellationReason? }`. Lists use standard pagination and newest-first ordering.                                                                                                                                          | Bearer; own `order.read` or `order.cancel`.                                                                                     | `200`; list returns safe summaries and metadata, detail adds notes, table and item snapshots, and cancellation/status timestamps. No verification token. Cancellation returns the updated safe order.                                                                                              | `400` invalid query/body or required reason; `401`; `403`; hidden `404` for foreign/missing order; `409` expired, changed, or invalid transition.                                              | `backend/docs/api-specification/orders.md`; `backend/src/modules/orders/orders.controller.ts`, `orders.schema.ts`, `order-queries.service.ts`, `order-transitions.service.ts`. |
| Reviews       | Public `GET /places/:placeId/reviews` and `GET /places/:placeId/menu-items/:menuItemId/reviews`; authenticated `POST` on the same routes with strict `{ orderId, rating, comment? }`; own lists at `GET /me/place-reviews` and `/me/menu-item-reviews`; own `PATCH`/`DELETE` by review ID. Lists use standard pagination; rating is integer `1–5`, comment nullable/max `2,000`. | Public reads; create uses own `review.create`; own lists use `profile.read`; mutations use own `review.update`/`review.delete`. | Public list `200` with safe reviews, `reviewCount`, `averageRating`, and metadata. Create is `201`, or `200` when restoring a deleted logical review. Own list/mutations return safe owned review context.                                                                                         | `400`; `401`; `403`; hidden `404`; `409 REVIEW_ALREADY_EXISTS` and verified-purchase/order/item eligibility conflicts.                                                                         | `backend/docs/api-specification/reviews.md`; `backend/src/modules/reviews/reviews.controller.ts`, `reviews.schema.ts`, `reviews.service.ts`.                                   |
| Profile       | `GET /me`; `PATCH /me` with at least one of `fullName` or `email`; `POST /me/account-deletion-requests` with no body.                                                                                                                                                                                                                                                            | Bearer; own `profile.read`, `profile.update`, or `account.deletion.request`.                                                    | Profile reads/updates are `200`; `GET` includes safe identity, authoritative platform/membership metadata, and permission arrays. Deletion acceptance is `202` with deletion-pending data; the persisted transition is idempotent, immediately revokes sessions, and does not imply hard deletion. | `400` invalid update; `401` invalid/inactive principal, including a later retry after deletion acceptance; update `409` duplicate email; deletion `409` owner/SUPER_ADMIN lifecycle invariant. | `backend/docs/api-specification/users.md`; `backend/src/modules/users/users.controller.ts`, `users.schema.ts`, `users.service.ts`; `backend/src/common/auth/permissions.ts`.   |
| Verification  | `GET /order-verifications/:token`; token is exact, opaque, case-sensitive, and 43 URL-safe characters.                                                                                                                                                                                                                                                                           | Public, read-only; rate-limited per source IP.                                                                                  | `200`; exactly the seven public fields listed in Gate 2. Possession grants no order mutation authority.                                                                                                                                                                                            | Malformed/unknown/disabled/retention-expired all return neutral `404 ORDER_VERIFICATION_NOT_FOUND`; `429` when rate-limited.                                                                   | `backend/docs/api-specification/orders.md`; `backend/src/modules/orders/order-access.controller.ts`, `order-verification.service.ts`, `orders.repository.ts`.                  |

### Common contract and architecture decision

- Successful JSON uses `{ "error": false, "message": string, "data"?: object, "meta"?: object }`. Errors use `{ "error": true, "message": string, "code": string, "details"?: array }`.
- `400` is invalid input, `401` invalid authentication or an inactive principal, `403` capability denial, `404` absent or deliberately hidden scope, and `409` uniqueness/state/idempotency/concurrency conflict. Route-specific `429` and `503` behavior remains as recorded above.
- Timestamps are UTC ISO 8601 strings. Money is a JSON number derived from server-side `Decimal(15,2)` values. Paginated endpoints default to page `1`, limit `20`, reject limits above `100`, and return `page`, `limit`, `totalItems`, and `totalPages`.
- `/me` role and permission arrays are rendering assistance only. They never prove authorization; the backend reloads current state and enforces permission, ownership, place scope, and domain invariants.
- Backend implementation plus API/SRS is the functional source of truth; `frontend/design.md` controls interaction and visual decisions. No approved contract change was found during this baseline check, so the route and feature architecture below remains unchanged.
- Unaffected work may proceed: public place/menu/review browsing, authenticated carts using implemented fields, TAKEAWAY checkout, own orders/cancellation, profile, own reviews, and public verification when a token is already present. Do not weaken a blocked gate to complete unrelated work.

## Obsolete or Supporting-Reference Code

- Replace the authenticated placeholder in `src/routes/index.tsx` with public discovery.
- Stop using the legacy medical/“Appointment Doctor” logo and favicon on public/auth surfaces. Use the temporary typographic “Tooang” wordmark required by `design.md` until approved assets exist.
- Keep `frontend/templates/` as reference only. Do not migrate its Poppins font, hard-coded colors, Swiper dependency, free-text menu search, phone checkout field, free-form table number, fixed 640 px shell, or prototype navigation.
- Preserve `/dashboard/account/orders`, `/dashboard/account/reviews`, and `/dashboard/account/profile` for Batch 1 compatibility. Reuse their services, query logic, and domain types where safe, but create customer-layout UI variants.
- Fix the existing own-order query normalization that omits the backend-supported `placeId` filter without changing place/platform management behavior.
- Extend the existing `places`, `orders`, `reviews`, and `users` features. Create a new `cart` feature because none exists; do not create duplicate public versions of entire domains.
- The current Vitest environment is Node-only. Add a focused DOM interaction setup for customer behavior tests rather than replacing existing tests.

## Route and Navigation Contract

Fully public routes:

- `/` — published-place discovery
- `/places/$slug` — place detail, hours, rating, and reviews
- `/places/$slug/menu` — public menu browsing
- `/verify/$token` — minimal public verification
- `/login`
- `/register`

Authentication-required customer routes:

- `/places/$slug/cart`
- `/places/$slug/checkout`
- `/orders`
- `/orders/$orderId`
- `/account/profile`
- `/account/reviews`

Mobile navigation uses Discover, Orders, and Account. Cart access is contextual to a selected place through menu/cart sticky actions because the backend cannot enumerate every cart. Desktop progressively enhances the same information architecture into a header. Menu remains place-contextual. Protected actions preserve an allowlisted same-origin return intent but never auto-submit a mutation after authentication. Menu-item detail is a sheet/dialog backed by an item already present in the paginated public-menu response; no unsupported public item-detail route is created.

---

## Phase 1 — Public Design Foundation and Route Architecture

### Task 01 — Record Batch 2 Contract Baseline and Blocking Gates

Goal:
Establish a checked, implementation-facing contract baseline so later agents do not guess around known backend gaps.

Context:
Backend implementation and API/SRS documents are the functional authority. The three gates at the top of this file affect DINE_IN, QR/link presentation, and cart totals.

Implementation:

- Re-read the relevant controllers, schemas, services, and API specifications before beginning downstream work.
- Record any resolved gate with its exact endpoint, request, response, permission, status codes, and migration compatibility notes.
- Maintain a compact endpoint ledger for public places, menu, carts, checkout, own orders, reviews, profile, and verification.
- Treat implementation/spec disagreement as a contract defect and stop only the affected task.
- Keep the route and feature architecture declared in this document synchronized if an approved contract changes.

Backend contract:

- Inspect `backend/docs/api-specification/*` and corresponding `backend/src/modules/*` code.
- Preserve the common success/error envelopes and 400/401/403/404/409 meanings.
- Permission metadata is rendering assistance, never proof of authorization.

Design requirements:

- Follow `frontend/design.md`, especially its source-of-truth order and “no false capability” rule.
- This task changes documentation/contract understanding only; it must not add speculative UI.

Do not:

- Modify backend code as part of Batch 2.
- Invent fields, endpoints, permissions, or fallback access to management endpoints.
- Mark a gate resolved from documentation alone when implementation still differs.

Acceptance criteria:

- Each gate has a clear resolved or blocked status.
- Downstream agents can identify the exact authoritative files to inspect.
- Unaffected frontend work can proceed without weakening the gates.

Dependencies: None.

### Task 02 — Refactor the Public Landing Placeholder and Legacy Branding

Goal:
Prepare `/` to become a fully public route and remove invalid branding from public/auth entry surfaces.

Context:
`src/routes/index.tsx` currently redirects visitors to login and renders an authenticated placeholder. Public/auth pages reference a legacy medical brand asset prohibited by `design.md`.

Implementation:

- Remove the authentication requirement from `/` and replace the placeholder composition with a thin route entry for the future discovery page.
- Add a reusable typographic Tooang wordmark variant suitable for public headers and auth forms.
- Replace public/auth references to `logo-brand-name.png` and the invalid favicon with the approved temporary fallback; leave dashboard asset changes limited to what is necessary to avoid invalid branding.
- Preserve logout, dashboard access, and account functionality through the future customer shell rather than the landing placeholder.
- Add focused tests proving `/` is public and authenticated users may also visit it.

Backend contract:

- `/` requires no backend authentication.
- Do not change existing auth/session endpoints or dashboard guards.

Design requirements:

- Follow `frontend/design.md` Sections 3.3, 3.4, 4, 8, and 20.1.
- Use the Plus Jakarta Sans typographic wordmark and semantic brand tokens; support light/dark/system themes.
- Start at 320 px and avoid a centered fixed-width prototype shell.

Do not:

- Build discovery data fetching in this task.
- delete or rewrite stable dashboard routes.
- Reuse the legacy blue medical mark.

Acceptance criteria:

- An unauthenticated user can reach `/` without redirect.
- Public/auth surfaces no longer render the known-invalid logo.
- Dashboard authentication and route access tests remain green.

Dependencies: Task 01.

### Task 03 — Complete Public Design Tokens and Mobile UI Primitives

Goal:
Provide the shared mobile-first primitives required by public/customer pages without creating a second design system.

Context:
Batch 1 already has semantic CSS tokens and shared Radix/Base UI components. `design.md` identifies missing public states and specifies customer-oriented control sizing, imagery, status, and sticky-action behavior.

Implementation:

- Audit `src/styles.css` against the semantic token families in `design.md`; add missing info, disabled, focus, and safe-area utilities through semantic variables.
- Add or carefully extend shared primitives for text wordmark, responsive image/fallback with reserved aspect ratio, rating display/input, quantity control, customer alert/live region, sticky mobile action bar, and customer order/open-state badges.
- Ensure public form controls are 48 px where specified and all touch targets are at least 44 px.
- Reuse existing Button, Sheet, ResponsiveDrawer, Skeleton, EmptyState, ErrorState, and Sonner behavior where suitable.
- Add primitive-level accessibility and state tests.

Backend contract:

- Primitives accept display data only and must not embed endpoint calls or authorization logic.
- Order status labels cover exactly PENDING, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED, and EXPIRED.

Design requirements:

- Follow `frontend/design.md` Sections 5–19.
- Use semantic tokens, Plus Jakarta Sans, restrained elevation, visible focus, reduced motion, and non-color-only state cues.
- Sticky actions must reserve content space and respect `env(safe-area-inset-bottom)`.

Do not:

- Hard-code palette colors in feature components.
- Copy management tables or dashboard density into customer primitives.
- Introduce a new component library.

Acceptance criteria:

- Primitives expose documented variants and loading/disabled/error states.
- Keyboard, focus, labeling, reduced-motion, and 320 px behavior are covered.
- Existing Batch 1 component tests remain green.

Dependencies: Task 02.

### Task 04 — Create the Public and Customer Route Layout Boundaries

Goal:
Create stable routing/layout boundaries for public and authenticated customer experiences.

Context:
TanStack Router uses file-based routing and auto-generated route trees. Dashboard layout/guards must remain independent from customer navigation.

Implementation:

- Add pathless or equivalent file-based layout routes for the public shell and auth-required customer shell.
- Keep leaf routes thin: validate path/search input, apply access boundaries, set metadata, and compose feature pages.
- Add customer route error boundaries that preserve shell/auth state and offer safe retry/navigation.
- Implement a reusable customer auth guard using the existing sanitized redirect helper and router context.
- Ensure direct links and reloads work for all routes declared in this document.

Backend contract:

- Public routes must not require a bearer token.
- Customer routes require an authenticated active principal; terminal 401 recovery uses the established JWT refresh/session flow.

Design requirements:

- Follow `frontend/design.md` Sections 9, 10, 12, 16, and 20.1.
- Shell landmarks and focus order must remain stable during route loading/errors.
- Mobile is the base layout; tablet/desktop enhance the same hierarchy.

Do not:

- Manually edit `src/routeTree.gen.ts`.
- Put feature API calls directly in route files.
- Reuse the dashboard sidebar/shell for public/customer pages.

Acceptance criteria:

- Public, auth-entry, and auth-required routes have distinct, testable boundaries.
- Unauthorized customer deep links redirect safely to login with their intended local URL.
- Route generation, type-checking, and Batch 1 routes remain valid.

Dependencies: Tasks 02–03.

### Task 05 — Build the Mobile-First Customer Navigation Shell

Goal:
Implement navigation optimized for Discover → Place → Menu → Cart → Checkout → Order.

Context:
The backend cannot list all carts, so Cart is contextual rather than a global bottom destination. The dashboard navigation model is unsuitable for customers.

Implementation:

- Build a compact public header with wordmark, logical back affordance on nested flows, and auth-aware account action.
- Build mobile bottom navigation with Discover, Orders, and Account; unauthenticated protected destinations use safe intent recovery.
- Add contextual cart affordance to place/menu contexts and a desktop header variant with Discover, Orders, contextual cart, account menu, theme control, and permission-derived dashboard entry.
- Hide zero cart badges and announce confirmed count changes without stealing focus.
- Keep navigation mounted across compatible customer routes to avoid layout shifts.

Backend contract:

- Use current `/me` session data and effective capabilities only for rendering navigation.
- Do not query or imply an unsupported global cart list.

Design requirements:

- Follow `frontend/design.md` Sections 10, 12, 13.30, and 20.1.
- Navigation must work without hover, use 44 px targets, and respect mobile safe areas.
- Desktop is a progressive enhancement, not a separate information architecture.

Do not:

- Add Menu as a global destination.
- Show dashboard access from platform role names alone.
- Persist private cart response data in navigation-local state.

Acceptance criteria:

- Active destination, back behavior, auth transitions, and contextual cart behavior are unambiguous.
- Navigation works at 320 px, keyboard-only, and desktop widths.
- No management navigation regression occurs.

Dependencies: Task 04.

### Task 06 — Add Customer-Facing State and Error Presentation Utilities

Goal:
Standardize safe, plain-language customer loading, error, empty, retry, and conflict behavior.

Context:
Existing dashboard error helpers are management-oriented. Customer flows need consistent handling of offline-like failures and uncertain checkout outcomes without exposing Axios or backend internals.

Implementation:

- Create customer error-presentation utilities from normalized `ApplicationError` values.
- Map validation, 401, 403, neutral 404, domain 409, rate limit, network, and 5xx cases to controlled copy and recovery actions.
- Add explicit presentations for closed place, ordering disabled, unavailable item, reconciled cart, expired order, and unknown checkout outcome.
- Preserve stale data during background refresh and distinguish empty from no-results.
- Provide reusable page/section state composition and tests for code/status mapping.

Backend contract:

- Preserve backend status/code distinctions including `ORDER_VERIFICATION_NOT_FOUND`, `MENU_ITEM_UNAVAILABLE`, cart limit/concurrency codes, checkout domain codes, and order transition conflicts.
- A 404 on hidden or verification resources must not disclose existence.

Design requirements:

- Follow `frontend/design.md` Sections 13.15, 13.20–21, 16, 17.4, and 21.
- Use skeletons for initial structure, banners for persistent blockers, and toasts only for non-blocking mutation feedback.

Do not:

- Render raw server messages blindly, stack traces, Axios objects, Prisma details, or tokens.
- Use a permanent spinner or toast-only blocking error.

Acceptance criteria:

- Major customer states have deterministic safe copy and a valid recovery action.
- Verification 404s are neutral and checkout network uncertainty is not called a definite failure.
- Utilities are unit tested without changing dashboard helpers unnecessarily.

Dependencies: Task 03.

---

## Phase 2 — Public Place Discovery

### Task 07 — Implement the Public Place Contract and Query Layer

Goal:
Add typed, place-isolated public list/detail data access using the existing transport and feature boundaries.

Context:
`features/places` currently implements management operations only. Public list and slug detail have different response capabilities.

Implementation:

- Extend place types with explicit public list and public detail shapes rather than assuming the management DTO everywhere.
- Add schemas/normalizers for `page`, `limit`, `search`, `type`, and `city` using backend limits.
- Add service methods for `GET /places` and `GET /places/:slug` through the shared API abstraction.
- Extend the place query-key factory with separate public list/detail namespaces; include all normalized filters and slug/place identity.
- Configure deliberate stale/placeholder behavior so one filter/slug never flashes under another.
- Add service, normalization, query-key, and response-shape tests.

Backend contract:

- `GET /api/v1/places` is public, paginated, and returns only published/non-deleted places.
- Supported filters are `search` (max 120), `type`, and `city` (max 100).
- `GET /api/v1/places/:slug` returns public place details, seven-day hours, and `isOpen`; unknown/unpublished/deleted is 404.

Design requirements:

- Follow `frontend/design.md`; this data layer must support the discovery/detail state requirements without embedding UI.
- Do not infer `isOpen` for list records because it is not returned there.

Do not:

- Call Axios directly from a component.
- Reuse management endpoints for public pages.
- Add unsupported sort, geolocation-radius, favorite, or cuisine parameters.

Acceptance criteria:

- Public place calls use exact relative endpoints and unwrap standard envelopes.
- Query keys isolate filters and detail slugs.
- Existing management place tests remain green.

Dependencies: Task 01.

### Task 08 — Build the Mobile Published-Place Discovery Page

Goal:
Replace `/` with a fast, mobile-first published-place discovery experience.

Context:
Discovery is public. The list endpoint supports bounded pagination plus search/type/city, but does not expose current opening state.

Implementation:

- Define validated URL search state for page, search, type, and city.
- Add a debounced, labeled search input and mobile filter sheet; use an inline toolbar at wider widths.
- Render responsive place cards with cover/logo fallbacks, name, type, city/address, and only fields returned by the list API.
- Implement initial skeleton, background refresh, first-use empty, no-results with clear filters, API/network error, retry, and pagination/load-more behavior.
- Preserve navigation context when opening a place and when returning to results.
- Add accessible result counts and filter announcements.

Backend contract:

- Use `GET /api/v1/places` through Task 07.
- Pagination defaults to 1/20 and maximum 100; use a customer-appropriate bounded page size.
- Do not display `isOpen` or review summary unless a future list contract explicitly returns it.

Design requirements:

- Follow `frontend/design.md` Sections 9, 10, 13.5, 13.9, 13.19–23, and 20.1 Place discovery.
- Start with a one-column 320 px layout; enhance to 2–4 columns where content fits.
- Use semantic surfaces, reserved image ratios, and no hover-dependent affordance.

Do not:

- Require login.
- Add menu-item search to discovery.
- Present ordering/open CTAs based on fields the list does not provide.

Acceptance criteria:

- Search and filters generate only supported query parameters.
- Loading/empty/no-result/error/retry states keep the shell stable.
- Place links use slug routes and work by keyboard/touch.

Dependencies: Tasks 05–07.

### Task 09 — Harden Discovery Responsiveness and Pagination Transitions

Goal:
Ensure discovery remains visually stable and correctly scoped during filter, pagination, and breakpoint changes.

Context:
TanStack Query may retain prior page data during refetch; that data must never be mislabeled as belonging to a different filter set.

Implementation:

- Review placeholder/previous-data behavior and show an updating cue without relabeling stale results as new-filter results.
- Preserve scroll and focus appropriately when loading more; move focus intentionally for numbered-page navigation.
- Reserve image/card geometry and handle missing, broken, portrait, and long-content cases.
- Verify mobile filter sheet and desktop toolbar share one URL-backed filter state.
- Add tests for key isolation, rapid search changes, no-result clearing, and pagination transitions.

Backend contract:

- Results remain ordered by backend defaults; do not add client sorting across pages.
- Metadata `page`, `limit`, `totalItems`, and `totalPages` drives pagination.

Design requirements:

- Follow `frontend/design.md` Sections 9, 10, 13.19–23, 16, and 18.
- Avoid layout shift and preserve 320 px reflow/200% zoom behavior.

Do not:

- Concatenate pages from different normalized filters.
- Render unbounded result collections.
- Treat a refetch error with stale data as an empty page.

Acceptance criteria:

- Rapid filter changes cannot display Place A results under Place B filters.
- Pagination/loading is accessible and stable at all target breakpoints.
- Tests cover stale-data and image-fallback cases.

Dependencies: Task 08.

---

## Phase 3 — Place Detail and Menu Browsing

### Task 10 — Build the Public Place Detail Page

Goal:
Present an authoritative public place profile and a clear path to its menu.

Context:
Slug detail returns safe identity, imagery, business hours, `isOpen`, timezone, and ordering state. Browsing remains available when closed or ordering is disabled.

Implementation:

- Build `/places/$slug` using the public detail query.
- Render cover/logo fallbacks, name, type/city, description, address, safe contact fields, timezone, open/closed state, and ordering-enabled state.
- Show today’s hours first with an accessible disclosure for all seven days; support closed and overnight periods exactly as returned.
- Add menu, reviews, and logical-back navigation.
- Implement skeleton, 404, API/network error, retry, long text, and missing-image/contact states.

Backend contract:

- Use `GET /api/v1/places/:slug` only.
- `isOpen` is backend-derived using place timezone; do not recompute it as checkout authority.
- Unpublished, deleted, or unknown places return neutral 404.

Design requirements:

- Follow `frontend/design.md` Sections 8–10, 13.9, 13.14–15, and 20.1 Place detail.
- Mobile hierarchy is imagery → identity/state → primary menu action → details/hours/reviews.
- Clearly distinguish “Closed” from “Ordering off” using text and non-color cues.

Do not:

- Disable menu browsing because checkout is unavailable.
- Fetch protected business-hours endpoints.
- Use device timezone as place timezone.

Acceptance criteria:

- All displayed fields come from the safe public response.
- Closed and ordering-disabled states are distinct and accessible.
- Direct slug loads and 404/retry behavior work on mobile and desktop.

Dependencies: Tasks 07–08.

### Task 11 — Implement Public Place Review Queries and Summary

Goal:
Add typed public place-review retrieval and rating summary support.

Context:
Public reviews are paginated and expose a summary separately from review rows. They never expose internal user/order IDs.

Implementation:

- Extend review types with public review, public reviewer, rating summary, and public list result shapes.
- Add service/query methods and a key factory namespace for place-scoped public review pages.
- Normalize page/limit and keep summary plus metadata from the response.
- Ensure place IDs are included before pagination in keys and invalidation helpers.
- Add service/query tests for nullable average, empty reviews, pagination, and error conversion.

Backend contract:

- `GET /api/v1/places/:placeId/reviews?page&limit` is public.
- Response data contains `reviews` and `summary { reviewCount, averageRating }` plus metadata.
- Only a published active place is readable; list order is newest first.

Design requirements:

- Follow `frontend/design.md` Sections 13.12, 13.19, and 20.1 Place and menu reviews.
- Preserve backend precision; do not invent rating distribution.

Do not:

- Reuse global moderation endpoints or types.
- Expose review/order internals.
- Infer an average from only the loaded page.

Acceptance criteria:

- Public review queries are isolated from own and moderation caches.
- Summary and pagination are typed from the exact envelope.
- Tests cover zero-review and nullable-average behavior.

Dependencies: Task 07.

### Task 12 — Build Public Place Reviews on Place Detail

Goal:
Show rating summary and visible verified-purchase reviews without suggesting arbitrary visitor submission.

Context:
Review creation requires an authenticated owned COMPLETED order. Public review rows are safe for visitors.

Implementation:

- Add summary and paginated/load-more review sections to place detail.
- Render reviewer public name, 1–5 rating, date, optional comment, and verified-purchase wording.
- Handle no reviews, initial/progressive loading, background error, full error, and retry.
- Route eligible authenticated creation toward the completed-order review flow; unauthenticated users receive explanatory login/account guidance without a generic write-review button.
- Keep long comments safe, wrapping, and readable.

Backend contract:

- Read via `GET /places/:placeId/reviews`.
- Creation is not performed here unless an eligible `orderId` is available from the authenticated order flow.

Design requirements:

- Follow `frontend/design.md` Sections 13.12, 16, 18, and 20.1 Place and menu reviews.
- Summary precedes reviews; do not show a distribution the API does not provide.

Do not:

- Imply that visiting/signing in alone grants review eligibility.
- Display internal IDs or render unsafe HTML from comments.

Acceptance criteria:

- Visitors can read reviews and understand the verified-purchase rule.
- Empty/error/pagination states are accessible and stable.
- Review content and rating are not derived from moderation data.

Dependencies: Tasks 10–11.

### Task 13 — Implement the Public Menu Contract and Query Layer

Goal:
Add exact public menu access with category/type filters and item-pagination semantics.

Context:
The endpoint groups returned items by category after item pagination. A page containing no category does not prove that category is globally empty.

Implementation:

- Define public category and menu-item types from the implemented response, including thumbnails/images and item/category sort fields.
- Add normalized `page`, `limit`, `type`, and `categoryId` schemas.
- Add service/query functions for `GET /places/:placeId/menu` and place/filter-scoped query keys.
- Preserve returned category grouping and item-count metadata without fabricating a separate all-category endpoint.
- Add contract tests for grouping, filters, empty pages, image nullability, and query isolation.

Backend contract:

- The endpoint is public and accepts only standard pagination, `type=FOOD|DRINK`, and `categoryId`.
- It returns available, non-deleted items in active categories for a published place.
- Public items omit place/timestamp management fields and expose active image URL only.

Design requirements:

- Follow `frontend/design.md` Sections 10, 13.10–13, 13.19, and 20.1 Menu browsing.
- Support efficient mobile scanning and progressive loading.

Do not:

- Add free-text search, availability filter, client-wide sorting, or protected single-item calls.
- Treat categories absent from one page as empty.

Acceptance criteria:

- Requests contain only supported parameters.
- Keys prevent data from one place/filter appearing under another.
- Exact response grouping and metadata are tested.

Dependencies: Task 07.

### Task 14 — Build Mobile Menu Browsing and Filters

Goal:
Create fast, place-contextual menu browsing optimized for narrow screens.

Context:
The public menu is item-paginated and supports FOOD/DRINK/category filters only. Place state comes from public detail.

Implementation:

- Build `/places/$slug/menu` after resolving the slug detail to public place ID.
- Keep place identity, open/closed, and ordering-enabled context visible without blocking browsing.
- Add sticky horizontally scrollable type/category chips with URL-backed filter state and selected-item visibility.
- Render compact mobile menu cards with image, category/type, name, description, IDR price, and detail/add affordances.
- Implement initial skeleton, empty menu, filtered no-results, progressive loading/pagination, API error/retry, and background refresh.
- Enhance to wrapped filters and 2–3-column/list layouts on wider screens.

Backend contract:

- Use Task 13’s public menu endpoint; never request unsupported search.
- Prices are current server values but checkout will re-read them.

Design requirements:

- Follow `frontend/design.md` Sections 9–10, 13.10–13, 13.19–23, and 20.1 Menu browsing.
- Controls require 44 px targets, visible selected states, and no hover dependence.
- Reserve room for the contextual cart summary once available.

Do not:

- Claim omitted categories are empty.
- Render an unbounded menu or calculate authoritative totals.
- Force a dashboard/table layout on mobile.

Acceptance criteria:

- FOOD/DRINK/category filtering maps exactly to API parameters.
- Place/menu data cannot cross-flash between slugs.
- Mobile scanning, empty/error states, and responsive enhancement meet `design.md`.

Dependencies: Tasks 10 and 13.

### Task 15 — Build Menu-Item Detail and Public Item Reviews

Goal:
Provide focused item detail/reviews and the entry point for protected cart actions.

Context:
There is no public single-item endpoint. Detail must use an item already returned by the current public-menu page, while reviews have a public item endpoint.

Implementation:

- Open item detail in an accessible mobile bottom sheet and responsive desktop dialog/panel from a loaded menu card.
- Show 4:3 image/fallback, category/type, name, description, current price, and availability implied by public eligibility.
- Fetch rating summary/reviews with a place/item-scoped public query; support empty, pagination, error, and retry states.
- Add quantity/note draft controls and a protected add action placeholder for Task 20.
- Restore focus to the triggering card and preserve menu scroll/filter state on close.

Backend contract:

- Item detail fields come from `GET /places/:placeId/menu`.
- Reviews use `GET /places/:placeId/menu-items/:menuItemId/reviews`.
- Do not call protected `GET /places/:placeId/menu-items/:menuItemId`.

Design requirements:

- Follow `frontend/design.md` Sections 13.6, 13.10–12, 13.17, 18–19, and 20.1 Menu-item detail.
- Sheet/dialog must trap focus, support Escape/close, restore focus, and respect safe areas.

Do not:

- Create a shareable item route that cannot load authoritatively.
- Show unavailable items not returned by the public menu.
- Auto-trigger cart mutations.

Acceptance criteria:

- Details always correspond to a currently loaded place/menu item.
- Public reviews use isolated keys and safe fields.
- Overlay and draft interactions are keyboard/touch accessible.

Dependencies: Tasks 11 and 13–14.

---

## Phase 4 — Authentication Entry and Protected-Action Recovery

### Task 16 — Implement Safe Protected-Action Intent Recovery

Goal:
Preserve useful browsing context across authentication without automatically performing protected mutations.

Context:
Visitors may encounter Add to cart, Checkout, Orders, Account, or Review actions. Existing login supports a sanitized local redirect but not a structured action draft.

Implementation:

- Define a versioned allowlist of intent kinds and minimal payloads for the supported protected actions.
- Store short-lived intent/draft data in session storage with validation, expiry, and a same-origin sanitized return URL.
- Provide helpers to create, read, consume, and clear intents and to reject malformed/stale/unsupported data.
- After authentication, return to the intended route, restore safe draft UI, and require explicit user confirmation before mutation.
- Clear consumed intent, logout-private intent, and drafts that no longer match the returned place/item.
- Add unit tests for open redirects, malformed storage, expiry, cross-place mismatch, and consume-once behavior.

Backend contract:

- No protected request is made until authentication succeeds.
- Backend validation remains authoritative after the user confirms.

Design requirements:

- Follow `frontend/design.md` Sections 16–18 and 20.1 Login and registration.
- Recovery messaging must explain what was restored and keep focus predictable.

Do not:

- Store access/refresh tokens, prices, permissions, or sensitive response bodies in the intent.
- Accept absolute/protocol-relative redirects.
- Auto-submit add, checkout, cancellation, or review after login.

Acceptance criteria:

- Each protected action returns safely to its logical flow.
- Unsafe/stale intents fall back to a valid customer destination.
- Tests prove no open redirect or automatic mutation path.

Dependencies: Task 04.

### Task 17 — Adapt Login for Customer Entry Flows

Goal:
Make login a polished customer entry point while preserving Batch 1 session infrastructure.

Context:
The existing auth service correctly logs in, stores the access token, fetches `/me`, and hydrates the shared session. The current form uses invalid branding and lacks password visibility/recovery context.

Implementation:

- Restyle the login page/form with the public wordmark, single-column layout, persistent labels, password visibility control, and design-system feedback.
- Preserve the sanitized redirect and integrate Task 16 intent recovery.
- Map invalid credentials/inactive account uniformly, display `Retry-After`-appropriate rate-limit guidance, and preserve entered email on failure.
- Carry the safe redirect/intent into the registration link.
- Add interaction tests for validation, pending/duplicate submit prevention, success return, 401, 429, and unsafe redirect fallback.

Backend contract:

- Use existing `POST /auth/login` and subsequent `GET /me` flow.
- Invalid credentials/account state is non-disclosing 401; login may return 429.
- Do not change refresh-cookie or access-token handling.

Design requirements:

- Follow `frontend/design.md` Sections 13.1–3, 14, 16, 18, and 20.1 Login and registration.
- Max form width is 440 px; mobile controls are at least 48 px high.

Do not:

- Add password reset, email verification, social login, or CAPTCHA promises.
- Duplicate auth state outside the existing context/query cache.

Acceptance criteria:

- Login preserves Batch 1 auth semantics and restores the intended customer route.
- Errors are accessible, non-disclosing, and plain-language.
- Branding, keyboard use, and mobile sizing match `design.md`.

Dependencies: Tasks 03 and 16.

### Task 18 — Adapt Registration and Preserve the Intended Flow

Goal:
Allow a visitor to register and then continue safely toward the protected action after a required login.

Context:
Backend registration creates a USER but no session. The current registration route loses the incoming redirect.

Implementation:

- Add validated `redirect` search handling to `/register` and preserve Task 16 intent metadata.
- Restyle the form with the public wordmark, password visibility controls, character/validation guidance, and accessible error summary.
- On success, explain that the account is ready and navigate to login with the safe redirect intact.
- Preserve backend email/password normalization rules without silently transforming the password.
- Add tests for successful handoff, duplicate email, common/invalid password, 429, redirect safety, and pending state.

Backend contract:

- `POST /api/v1/auth/register` accepts `fullName`, `email`, and exact `password`; it returns 201 but does not authenticate.
- Handle 400, 409, and 429 safely.

Design requirements:

- Follow `frontend/design.md` Sections 13–16, 18, and 20.1 Login and registration.
- Use a single-column max-440 px mobile-friendly form with visible labels and focusable errors.

Do not:

- Auto-login after registration.
- Promise email verification or password reset.
- Trim/normalize password input.

Acceptance criteria:

- Registration success reliably hands off to login and preserves the intended local flow.
- Validation and backend errors retain safe form input and focus behavior.
- Existing auth service/session tests remain green.

Dependencies: Task 17.

---

## Phase 5 — Cart

### Task 19 — Implement the Cart Contract, Query Keys, and Schemas

Goal:
Create the missing place-scoped cart feature using exact implemented contracts.

Context:
Carts are authenticated, owned by user, and keyed by place. The current service returns current unit prices and reconciliation removals; total fields remain gated.

Implementation:

- Create `features/cart/{services,queries,schemas,types}` following established patterns.
- Model cart identity, place ID, item/category identity, type, current unit price, quantity, note, counts, and `removedItems` reasons from implementation.
- Add service methods for get/add/update/delete through the shared API transport.
- Add a place-first key factory, query options, mutation hooks, exact cache replacement from complete cart responses, and targeted invalidation.
- Normalize note/quantity UX validation to backend limits while keeping server authority.
- Add contract, key-isolation, mutation-cache, and error tests.

Backend contract:

- Use `GET /me/carts/:placeId`, `POST /items`, and `PATCH/DELETE /items/:menuItemId`.
- Add quantity is 1–99; update accepts 0–99; zero removes. Note is nullable, max 500 code points.
- Limits: 50 distinct items, aggregate quantity 200. Reconciliation removes invalid rows and reports bounded reasons.
- Re-check gate 3 before modeling totals.

Design requirements:

- Follow `frontend/design.md`; the query layer must support live announcements and reconciliation states without embedding component state copies.

Do not:

- Accept client user IDs or prices.
- Create a global cart-list endpoint/key.
- Add optimistic cart values that survive server disagreement.

Acceptance criteria:

- All cart calls use exact endpoints/shapes and place-isolated keys.
- Complete server responses become the cache truth after mutations.
- Tests cover empty cart, reconciliation, zero removal, limits, 404, and 409.

Dependencies: Task 01; gate 3 applies.

### Task 20 — Implement Protected Add-to-Cart and Quantity Controls

Goal:
Connect public menu browsing to authenticated, server-confirmed cart mutations.

Context:
Guest carts are unsupported. Visitors must authenticate and return to the item draft; authenticated users can add only an eligible item from the same place.

Implementation:

- Wire item detail/card actions to Task 16 intent recovery when unauthenticated.
- For authenticated users, submit `menuItemId`, quantity, and optional note to the place cart.
- Use shared quantity controls with confirmed-value rendering, per-control pending prevention, polite count announcements, and failure rollback/refetch.
- Replace add controls with confirmed cart quantity where appropriate without storing a second server-state copy.
- Map item unavailable, limit, concurrent modification, 401, 404, and generic errors to customer copy.

Backend contract:

- `POST /me/carts/:placeId/items` increments an existing row rather than replacing its quantity.
- Server verifies place/item eligibility and current state.
- Use the returned complete cart as authoritative.

Design requirements:

- Follow `frontend/design.md` Sections 10, 13.1, 13.6, 13.10, 16, 18, and 20.1 Menu-item detail.
- Keep the primary add action reachable, 44 px minimum, and safe-area aware in a sheet.

Do not:

- Create a local guest cart.
- Send price, category, name, or user ID in the mutation.
- Silently delete at quantity one; use explicit remove behavior.

Acceptance criteria:

- Unauthenticated add restores the draft after login and waits for confirmation.
- Confirmed server cart state updates all relevant controls/badges.
- Cross-place IDs cannot be mixed and failures restore usable UI.

Dependencies: Tasks 15–19.

### Task 21 — Build the Mobile Cart Page and Reconciliation States

Goal:
Provide a one-handed, place-specific cart review/edit experience with authoritative recovery states.

Context:
Retrieving a cart can remove invalid rows and report why. Closed or ordering-disabled carts may remain but cannot check out.

Implementation:

- Build `/places/$slug/cart`, resolve public place context, then query the authenticated cart by public place ID.
- Render empty and valid carts, item/category/type, current unit price, quantity, note editing, and explicit removal.
- Surface every `removedItems` reason in a persistent reconciliation message and update the displayed cart immediately.
- Show closed and ordering-disabled states distinctly; disable checkout while retaining return-to-menu/edit options.
- Implement initial skeleton, background refresh, mutation pending/failure/success, 401 recovery, 404, 409 refresh, and offline-like retry.
- Add a sticky mobile checkout action and a desktop summary region using only contract-supported totals.

Backend contract:

- Use the complete cart returned by Task 19 mutations/retrieval.
- Re-check gate 3. If no subtotal is implemented, do not label a client sum as an authoritative subtotal.
- Checkout eligibility is ultimately decided by `POST /me/orders`.

Design requirements:

- Follow `frontend/design.md` Sections 10, 13.6, 13.15, 13.27, 16, 18, and 20.1 Cart.
- Sticky action must reserve content space and remain above the virtual keyboard/safe area.

Do not:

- Trust cached price as checkout truth.
- Hide removed-item reconciliation in a toast only.
- Merge another place’s cart.

Acceptance criteria:

- Empty, valid, reconciled, closed, ordering-off, loading, and error states are implemented.
- Quantity/note/remove operations use server responses and accessible pending feedback.
- No unsupported total or checkout promise is shown.

Dependencies: Tasks 10 and 19–20; gate 3 applies.

### Task 22 — Implement Contextual Cart Navigation and Cross-Place Isolation

Goal:
Make cart access reliable within place context while preserving separate carts per place.

Context:
The backend supports one cart per user per place and no collection endpoint for all carts.

Implementation:

- Connect the customer shell and menu/cart sticky summaries to the active place’s cart query.
- Show current-place confirmed aggregate quantity/count only; hide the badge at zero.
- Ensure navigation from Place A to Place B swaps to a distinct key/loading state and never displays A’s items under B.
- Preserve separate cached carts and allow returning to either place without merging or replacement prompts.
- Define fallback navigation when there is no place context: Discover rather than a fabricated global cart.
- Add isolation and rapid-navigation tests.

Backend contract:

- Cart identity is `(authenticated user, placeId)`.
- Cross-place item add returns hidden 404 and must never be attempted intentionally.

Design requirements:

- Follow `frontend/design.md` Sections 10, 12, 13.27, 16, and 22.
- Cart badge changes are announced politely and do not move focus.

Do not:

- Aggregate counts across unknown carts.
- Persist full cart responses in local/session storage.
- Silently merge, move, or replace a cart.

Acceptance criteria:

- Cart UI and badges always identify the current place.
- Switching places cannot flash or mutate another place’s cart.
- Navigation without place context has a clear supported fallback.

Dependencies: Tasks 05 and 19–21.

---

## Phase 6 — Checkout

### Task 23 — Implement Checkout Types, Schema, and Service Mutation

Goal:
Add an exact, typed checkout boundary and targeted cache lifecycle for customer orders.

Context:
Checkout is high risk: the backend revalidates place, time, ordering state, tables, items, quantities, prices, totals, and idempotency inside a transaction.

Implementation:

- Extend the orders feature with customer checkout input types, a strict DINE_IN/TAKEAWAY discriminated union, frontend form schema, and checkout response type.
- Add `ordersService.checkout(input, idempotencyKey)` using the shared API transport and required header.
- Add a checkout mutation that accepts a caller-managed attempt key, prevents accidental duplicate mutation calls, clears the affected cart only on confirmed success, and seeds/invalidates own-order detail/list data deliberately.
- Map stable checkout codes to Task 06 presentations while preserving the normalized code for recovery logic.
- Add service/schema/mutation tests for exact payloads, headers, cache effects, and non-success behavior.

Backend contract:

- `POST /api/v1/me/orders` requires `order.checkout` and `Idempotency-Key` matching 1–255 `[A-Za-z0-9._:-]` characters.
- TAKEAWAY accepts `placeId`, `fulfillmentType`, `customerName`, and optional `customerNote`; DINE_IN additionally requires `tableId`.
- Handle 404 and stable 409 codes including `CART_EMPTY`, `PLACE_UNAVAILABLE`, `ORDERING_DISABLED`, `PLACE_CLOSED`, `CART_ITEM_INVALID`, `ORDER_TOTAL_OUT_OF_RANGE`, `IDEMPOTENCY_KEY_REUSED`, and concurrent modification.

Design requirements:

- Follow `frontend/design.md` Sections 14–16 and 20.1 Checkout.
- Frontend validation improves UX only; server state is authoritative.

Do not:

- Send items, prices, totals, payment, phone, schedule, or delivery fields.
- Clear the cart on failed/unknown checkout.
- Generate a new idempotency key inside every mutation retry.

Acceptance criteria:

- Request unions cannot represent a TAKEAWAY table or DINE_IN without a table.
- Success and every failure leave the intended query caches consistent.
- Contract tests prove exact body/header behavior.

Dependencies: Tasks 19 and 21; gate 3 applies.

### Task 24 — Build the Mobile Checkout Review and Fulfillment Flow

Goal:
Build an accessible, one-handed checkout flow that preserves safe inputs through server conflicts.

Context:
The intended mobile sequence is fulfillment → table when supported → customer details/note → review → submit. There is no payment step.

Implementation:

- Build `/places/$slug/checkout` behind the customer guard and resolve place/cart context without copying server state into arbitrary form state.
- Render current cart review and place availability, then radio-card/segmented fulfillment selection.
- Collect customer name and optional order note with backend-aligned limits, visible labels, counters, and error associations.
- Conditionally render the Task 25 table selector for DINE_IN; do not offer an unusable DINE_IN submission while the gate is blocked.
- Preserve form values after validation, 409, or network errors; refetch authoritative cart/place state when relevant.
- Use a sticky mobile review/submit footer and a desktop two-column form plus sticky summary.

Backend contract:

- Checkout requires a non-empty owned cart, published/ordering-enabled/open place, valid current items, and an active same-place table for DINE_IN.
- New orders start PENDING and expire 15 minutes after creation.
- Re-check gate 3 for cart totals; final successful order subtotal is authoritative.

Design requirements:

- Follow `frontend/design.md` Sections 9–10, 13.7, 13.15, 13.28, 14, 16, 18, and 20.1 Checkout.
- Forms must remain usable with virtual keyboards, safe areas, 320 px width, and 200% zoom.

Do not:

- Add payment, tip, promo, wallet, delivery, preorder, reservation, or phone fields.
- Treat frontend open/availability checks as authority.
- Hide a blocking conflict in a toast.

Acceptance criteria:

- TAKEAWAY can be reviewed/submitted using only supported fields.
- DINE_IN availability follows Task 25’s gate without a staff-endpoint workaround.
- Validation/error/conflict states retain safe input and guide recovery.

Dependencies: Task 23.

### Task 25 — Integrate Customer DINE_IN Table Selection

Goal:
Enable customer DINE_IN only through an approved customer-accessible active-table contract.

Context:
The current dining-table collection requires management scope and cannot be called by an ordinary customer. This task is deliberately gated.

Implementation:

- Re-check the backend implementation/specification for an approved customer table-option endpoint or checkout-options response.
- If unresolved, leave DINE_IN blocked, document the release blocker, and make no frontend endpoint substitution.
- If resolved, add exact customer table-option types/service/query keys scoped by place and distinct from management dining-table caches.
- Build an accessible select/combobox or mobile selection sheet with explicit no-active-table, loading, retry, and stale-selection states.
- Clear `tableId` when switching to TAKEAWAY and require a confirmed active choice when switching back.
- Refetch/refresh options after table-related checkout conflicts while preserving other fields.

Backend contract:

- Use only the newly approved endpoint and returned safe fields.
- Checkout remains authoritative for table existence, active state, and place ownership.
- Do not call `GET /places/:placeId/dining-tables` unless its authorization contract is explicitly changed for customers.

Design requirements:

- Follow `frontend/design.md` Sections 13.4, 13.7, 13.17, 14, 16, and 20.1 Checkout.
- Mobile long lists may use a searchable bottom sheet with correct focus and safe-area behavior.

Do not:

- Request or display inactive/management-only table fields.
- Accept a free-form table name/number.
- Enable DINE_IN with a fabricated or cached table ID.

Acceptance criteria:

- The task either uses a verified customer-authorized contract or remains explicitly blocked.
- A resolved implementation handles empty/loading/error/stale table states.
- TAKEAWAY never retains or submits `tableId`.

Dependencies: Task 24 and blocking gate 1.

### Task 26 — Implement Checkout Idempotency-Key Lifecycle

Goal:
Guarantee safe customer retries without duplicate orders or accidental key reuse across different payloads.

Context:
The backend stores a successful idempotency result for 24 hours and replays the same normalized request. Network loss may leave the client uncertain whether checkout succeeded.

Implementation:

- Create a checkout-attempt helper that generates a compliant high-entropy key using browser cryptography.
- Bind the key to a deterministic representation of the validated checkout payload for the current attempt.
- Reuse the same key for duplicate taps, automatic/manual safe retries, and uncertain-network recovery with the same payload.
- Require an explicit new attempt/key when the validated payload changes after a definitive failure or when the prior attempt is confirmed complete/abandoned.
- Persist only the minimum attempt metadata in session storage when needed for reload recovery; validate expiry and user/place association.
- On uncertain outcome, disable blind resubmission until own-order history/detail recovery is attempted; provide a deliberate same-key retry.
- Add unit/integration tests for same payload, changed payload, reload, duplicate click, 409 reuse, success, and expiry.

Backend contract:

- Same key + equivalent payload returns the stored 201 response.
- Same key + different payload returns `409 IDEMPOTENCY_KEY_REUSED`.
- Idempotency scope is authenticated user and checkout endpoint; records last 24 hours.

Design requirements:

- Follow `frontend/design.md` Sections 13.1, 13.28, 14.10, 16, and 21.
- Customer copy must not use backend jargon such as “idempotency” or “serialization.”

Do not:

- Generate a key on every render/click/retry.
- Store full order/cart/customer response data in persistence.
- Claim a network-timeout checkout definitely failed.

Acceptance criteria:

- Equivalent retries demonstrably reuse one key.
- Payload changes cannot silently reuse the old key.
- Unknown outcomes direct the user to safe recovery and tests cover duplicate prevention.

Dependencies: Tasks 23–24.

### Task 27 — Build Checkout Success and Recovery

Goal:
Provide a dedicated success state and safe recovery for confirmed or uncertain checkout outcomes.

Context:
Successful checkout returns the created order and clears the cart atomically, but it does not expose verification tokens.

Implementation:

- Navigate confirmed success to the customer order detail/success presentation using the returned order and authoritative follow-up query.
- Prioritize order code, PENDING status, place, fulfillment/table snapshot, items, server subtotal, creation time, and expiration guidance.
- Link to order detail, My Orders, and the place/menu.
- Handle refresh/direct access through the own-order endpoint rather than relying only on mutation memory.
- For unknown network outcomes, offer order-history recovery and controlled same-key retry from Task 26.
- Add a gated placeholder note in task documentation for future QR/link presentation; render no QR without gate 2 resolution.

Backend contract:

- Checkout success is 201 with `data.order`; own detail is `GET /me/orders/:orderId`.
- No customer response exposes `verificationToken`.
- Payment state is absent from V1.

Design requirements:

- Follow `frontend/design.md` Sections 13.28–29, 16, 18, and 20.1 Checkout success.
- Make the order code selectable, high contrast, and never truncate it.

Do not:

- Invent a QR/token/URL, payment confirmation, or fabricated timeline timestamps.
- Use the public verification endpoint to retrieve private order detail.

Acceptance criteria:

- Confirmed success survives reload and links to owned order history/detail.
- Unknown outcomes have a safe non-duplicating recovery path.
- No token or unsupported payment/QR content appears.

Dependencies: Tasks 26 and 28; blocking gate 2 applies only to QR/link enhancement.

---

## Phase 7 — Customer Orders and Profile

### Task 28 — Extend the Existing Own-Order Query Layer

Goal:
Prepare reusable own-order data access for customer routes without regressing dashboard scopes.

Context:
Order services/types already support own list/detail/cancellation. Current list normalization includes `placeId` only for platform scope even though own orders support it.

Implementation:

- Correct normalized list parameters so `placeId` is included for own and global lists, never place-scoped operational lists.
- Review existing order summary/detail types against backend implementation and keep customer-safe snapshots exact.
- Add customer-oriented query option wrappers only where behavior differs; retain shared root/list/detail factories and scope identifiers.
- Define targeted helpers for checkout success, own cancellation, and list/detail invalidation.
- Reassess 30-second polling for customer lists/details; avoid operational polling unless it materially helps active orders and preserves focus/network efficiency.
- Add regression tests for all three scopes and filter combinations.

Backend contract:

- `GET /me/orders` accepts page, limit, optional status, fulfillmentType, and placeId.
- `GET /me/orders/:orderId` is ownership-restricted and returns hidden 404 for foreign orders.
- Responses never include verification token or payment state.

Design requirements:

- Follow `frontend/design.md`; data behavior must support customer refresh states without embedding dashboard presentation.

Do not:

- Fork duplicate customer order types/services.
- Broaden own scope based on platform roles.
- Apply `placeId` to the target-place queue endpoint.

Acceptance criteria:

- Own place filtering reaches the API and appears in the query key.
- Place/platform Batch 1 query behavior and tests remain correct.
- Invalidation helpers affect only relevant own-order data.

Dependencies: Task 01.

### Task 29 — Build the Mobile My Orders Page

Goal:
Create a customer-first history and active-order view using cards on mobile.

Context:
The existing My Orders component lives in the dashboard shell and reuses operational queue presentation. Customer routes need different navigation, density, and information priority.

Implementation:

- Build `/orders` behind the customer guard using Task 28 queries.
- Render reverse-chronological cards with place, untruncated order code, status, fulfillment/table summary, backend subtotal, and created time.
- Support only API-backed status, fulfillment, and optional exact place filters using URL state; use a mobile filter sheet and wider inline controls.
- Distinguish active and terminal statuses without client reordering that contradicts API order.
- Implement skeleton, background update, empty/no-results, API/network error, retry, 401 recovery, 404-safe navigation, and pagination.
- Preserve scroll/filter state when entering and returning from detail.

Backend contract:

- Use `GET /api/v1/me/orders` only for the customer list.
- Results are createdAt/orderId descending and use standard pagination.

Design requirements:

- Follow `frontend/design.md` Sections 10, 13.14, 13.19–23, and 20.1 User order history.
- Never render a dense desktop table on phones; enhance to a wider list/table only where appropriate.

Do not:

- Show operational transition controls, payment state, or verification tokens.
- Add unsupported date/search/sort filters.

Acceptance criteria:

- All supported filters and pagination are URL-backed and correctly keyed.
- Active/terminal status is readable without color alone.
- Mobile loading/error/empty layouts remain stable.

Dependencies: Tasks 05 and 28.

### Task 30 — Build Customer Order Detail and Status Presentation

Goal:
Present complete safe order snapshots and status progression clearly on mobile.

Context:
Own detail returns customer/order/item/table snapshots and only selected transition timestamps. Historical snapshots must not be replaced with current menu data.

Implementation:

- Build `/orders/$orderId` behind the customer guard using the own detail query.
- Show order code, place snapshot, status, fulfillment, table snapshot when present, customer/order notes, item snapshots, line totals, server subtotal, created/status-updated/expiry times, and cancellation reason.
- Build a vertical mobile status visualization using only returned timestamps; terminate cancelled/expired branches clearly.
- Mark an elapsed PENDING expiry as potentially stale and refetch rather than locally authorizing actions.
- Add skeleton, background refresh, neutral ownership 404, network/API error, retry, and logical navigation.
- Surface eligible review actions as a placeholder for Task 34.

Backend contract:

- `GET /api/v1/me/orders/:orderId` returns owned safe detail only.
- Returned timestamps include createdAt, statusUpdatedAt, expiresAt, and nullable confirmedAt/completedAt/cancelledAt; no timestamps exist for every intermediate phase.

Design requirements:

- Follow `frontend/design.md` Sections 13.14, 13.26, 15–16, 18, and 20.1 User order detail.
- Status and expiry must use labels/icons as well as semantic colors.

Do not:

- Fetch current menu/place values to overwrite snapshots.
- Fabricate preparing/ready timestamps or payment status.
- Expose UUIDs as primary labels when order code exists.

Acceptance criteria:

- Every displayed value maps to a documented own-order field.
- Status visualization handles all seven states and incomplete timestamps accurately.
- Ownership 404 and refresh recovery do not leak information.

Dependencies: Task 29.

### Task 31 — Implement Customer Order Cancellation

Goal:
Allow cancellation only while the owned PENDING order remains valid.

Context:
Customers cannot cancel after PENDING and cannot cancel a PENDING order at or beyond authoritative `expiresAt`, even if the expiry worker has not updated status yet.

Implementation:

- Show cancellation only for authenticated own PENDING orders that are not visibly past expiry, while treating this as UX guidance rather than authority.
- Use a destructive confirmation with an optional, max-500-character reason and clear consequences.
- Disable duplicate submission, keep the dialog stable while pending, and announce success.
- On `ORDER_PENDING_EXPIRED`, `ORDER_STATUS_CHANGED`, or `ORDER_STATUS_TRANSITION_INVALID`, refetch list/detail, close/remove stale actions appropriately, and explain the new state.
- Handle 400, 401, hidden 404, 409, network uncertainty, and retry safely.
- Add behavior tests for permitted, expired, changed, terminal, and foreign cases.

Backend contract:

- `PATCH /me/orders/:orderId/status` accepts only `{ status: "CANCELLED", cancellationReason? }`.
- Customer cancellation is limited to own, non-expired PENDING; the reason is optional in that state.

Design requirements:

- Follow `frontend/design.md` Sections 13.1, 13.15–16, 16, 18, and 20.1 Order detail and cancellation.
- Cancellation is visually separated from routine brand actions and never receives default destructive focus.

Do not:

- Offer cancellation for CONFIRMED/PREPARING/READY or terminal customer orders.
- Optimistically leave CANCELLED visible after server disagreement.
- Require a reason when the backend does not.

Acceptance criteria:

- Only valid-looking PENDING orders expose the action, and backend conflicts always win.
- Cache invalidation updates own list/detail deliberately.
- Confirmation/error behavior is accessible and tested.

Dependencies: Task 30.

### Task 32 — Build the Customer Profile Page and Account Entry

Goal:
Provide customer account/profile management outside the dashboard shell.

Context:
Existing profile service/UI covers `/me`, update, and deletion request but is dashboard-oriented. Auth/session state remains shared.

Implementation:

- Build `/account/profile` using a customer-layout variant that reuses existing user service/query/mutation/schema logic.
- Show safe identity fields, full name/email editing, theme/account navigation, and capability-derived dashboard entry.
- Separate the account-deletion request into a consequence-focused confirmation area.
- After profile changes, update/refetch the shared auth session so navigation identity stays synchronized.
- On accepted deletion request, clear private session/cache and route to a signed-out confirmation.
- Add mobile interaction tests for edit success/validation/409, deletion conflict/202, and logout behavior.

Backend contract:

- Use `GET /me`, `PATCH /me`, and `POST /me/account-deletion-requests`.
- Clients cannot update roles, permissions, memberships, or lifecycle fields.
- Deletion request may return 409 for OWNER/SUPER_ADMIN invariants and blocks further protected access after acceptance.

Design requirements:

- Follow `frontend/design.md` Sections 13.30, 14–18, and 20.1 Profile and account settings.
- Keep personal data and destructive account lifecycle actions in distinct sections.

Do not:

- Rebuild auth/profile services or hard-code role access.
- Imply deletion is immediate hard deletion.
- Put the customer page inside the dashboard shell.

Acceptance criteria:

- Profile/account entry works for any authenticated user, including users without dashboard access.
- Shared identity/navigation updates after mutations.
- Deletion confirmation and conflicts communicate consequences safely.

Dependencies: Task 05.

---

## Phase 8 — Verified-Purchase Reviews

### Task 33 — Implement Review Creation Contracts and Mutations

Goal:
Extend the existing review feature with exact verified-purchase creation behavior and cache invalidation.

Context:
Public/own/moderation review reads and own update/delete already exist. Creation requires an owned COMPLETED order and may restore a soft-deleted logical review.

Implementation:

- Add `CreateReviewInput { orderId, rating, comment? }` and exact place/menu create response types.
- Add service methods for place and menu-item POST endpoints through the shared API client.
- Add create mutation hooks carrying target place/item/order context.
- On success, invalidate the target public summary/list, relevant own-review lists, and affected own-order detail; handle both 201 created and 200 restored.
- Map duplicate, ineligible status, place mismatch, missing item snapshot/current item, hidden 404, and validation errors to safe customer copy.
- Add schema/service/mutation/cache tests.

Backend contract:

- `POST /places/:placeId/reviews` and `POST /places/:placeId/menu-items/:menuItemId/reviews` require auth and `review.create`.
- Rating is integer 1–5; optional comment is normalized/null and max 2,000 code points.
- Active duplicate is `409 REVIEW_ALREADY_EXISTS`; a soft-deleted match is restored/updated.

Design requirements:

- Follow `frontend/design.md` Sections 13.12, 13.15–16, 14, 16, and 20.1 Place and menu reviews.
- Mutation state and restored-review success must be announced clearly.

Do not:

- Accept a client user ID or claim eligibility from authentication alone.
- Treat local eligibility checks as authoritative.
- Reuse moderation mutation paths.

Acceptance criteria:

- Place and item creation send exact target/order payloads.
- New/restored success invalidates all relevant caches without global refetch noise.
- Eligibility and conflict codes have tested safe presentations.

Dependencies: Tasks 11 and 28.

### Task 34 — Build Review Eligibility and Creation from Completed Orders

Goal:
Expose review creation only from an owned completed-order context and clearly explain eligibility.

Context:
The backend has no separate eligibility endpoint. Own COMPLETED order snapshots and own-review lists can guide UX, while create remains authoritative.

Implementation:

- Add review actions to completed own-order detail for the place and each unique item snapshot.
- Compare paginated own-review data carefully; do not infer universal absence unless the relevant order review is known. Allow backend duplicate conflict to resolve uncertainty.
- Build an accessible 1–5 star radio input, optional comment with counter, and mobile sheet/dialog form.
- Preserve input on API error, focus the first invalid field, and display restored/duplicate/ineligible outcomes plainly.
- Hide creation on non-COMPLETED orders and explain verified-purchase requirements where useful.
- Refetch affected public/own/order data after success.

Backend contract:

- Place review requires the owned COMPLETED order to belong to the route place.
- Item review additionally requires that item in the order snapshot and a current non-deleted same-place item.
- Different completed orders may each produce reviews for the same target.

Design requirements:

- Follow `frontend/design.md` Sections 13.12, 13.16–17, 14, 16, 18, and 20.1 Place and menu reviews.
- Star input must be keyboard operable and announce the selected value.

Do not:

- Offer a generic public “Write review” flow without `orderId`.
- Deduplicate reviews only by place/item; cardinality also includes order.
- Expose deleted/current-item internals in error copy.

Acceptance criteria:

- Only COMPLETED owned-order UI exposes creation entry points.
- Place/item target and order ID are exact, and backend rejection remains authoritative.
- Forms meet accessibility, validation, restore, and conflict requirements.

Dependencies: Tasks 30 and 33.

### Task 35 — Adapt My Reviews for the Customer Experience

Goal:
Provide mobile-friendly review history, editing, and deletion outside the dashboard shell.

Context:
Existing own-review services and mutations are reusable, but the current component uses dashboard layout and select-based rating editing.

Implementation:

- Build `/account/reviews` with place/menu tabs and URL-backed pagination using existing own-review queries.
- Create customer review cards showing target, place, order code, rating, dates, comment, and edit/delete actions.
- Replace rating select UX with the shared accessible star input; preserve optional comment and max-2,000 counter.
- Use responsive sheet/dialog editing and named destructive confirmation for deletion.
- Improve invalidation so update/delete refreshes own lists plus affected public summary/list when target context is known.
- Handle empty, loading, API/network error, 401, hidden 404, 409, mutation pending/success/failure, and pagination.
- Retain Batch 1 dashboard routes/components or adapt shared internals without changing their shell behavior.

Backend contract:

- Read `GET /me/place-reviews` and `/me/menu-item-reviews`; mutate only own review endpoints.
- Update requires at least rating or comment; delete is soft deletion.

Design requirements:

- Follow `frontend/design.md` Sections 10, 13.12, 13.16–19, 16, 18, and 20.1 reviews.
- Use cards on mobile and preserve visible focus/44 px controls.

Do not:

- Use global moderation endpoints.
- Imply delete removes historical order eligibility or order data.
- Break `/dashboard/account/reviews`.

Acceptance criteria:

- Own review list/edit/delete works in the customer shell with accessible mobile UX.
- Cache updates are scoped and public summaries refresh where identifiable.
- Batch 1 review pages/tests remain functional.

Dependencies: Tasks 32–34.

---

## Phase 9 — Public Order Verification

### Task 36 — Implement the Public Verification Route and Page

Goal:
Provide a minimal, privacy-preserving verification page for QR scans or shared verification URLs.

Context:
The backend exposes only a token-consumption endpoint. Malformed, unknown, disabled, and retention-expired tokens intentionally share one 404 response.

Implementation:

- Add verification types/service/query options under the orders feature with a dedicated public key namespace.
- Build `/verify/$token` without authentication and fetch the exact opaque, case-sensitive token path.
- Display only order code, place name, status, fulfillment type, createdAt, expiresAt, and statusUpdatedAt.
- Render accessible status messaging for terminal/non-terminal states and expiration guidance without claiming operational authority.
- Handle initial loading, rate limit, network/API retry, and every token-related 404 through one neutral not-found experience.
- Avoid persisting the token or including it in visible copy, analytics, logs, support text, or error output.
- Add service/query/page tests for valid, malformed, unknown, expired-retention, terminal, and non-terminal cases.

Backend contract:

- `GET /api/v1/order-verifications/:token` is public/read-only and rate-limited.
- Valid response contains exactly the seven documented public fields.
- `ORDER_VERIFICATION_NOT_FOUND` is the common 404; public verification grants no mutation authority.

Design requirements:

- Follow `frontend/design.md` Sections 13.14, 13.29, 16, 18, and 20.1 Public order verification.
- Prioritize readable order code/status and a calm neutral not-found state.

Do not:

- Display customer, table, items, notes, totals, IDs, or token.
- Link to protected operations based solely on token possession.
- Attempt reverse lookup by order code.

Acceptance criteria:

- Valid pages display only allowlisted fields.
- All invalid/expired token cases are indistinguishable to the visitor.
- Route is public, responsive, accessible, and tested.

Dependencies: Tasks 03–06.

---

## Phase 10 — Responsive, Accessibility, and Performance Hardening

### Task 37 — Audit Mobile Reachability, Safe Areas, and Responsive Layouts

Goal:
Validate every Batch 2 page from 320 px upward and correct customer-flow layout defects.

Context:
Mobile is the product baseline. Sticky actions, sheets, virtual keyboards, long content, zoom, and safe areas commonly expose defects after feature integration.

Implementation:

- Audit discovery, place, menu/item sheet, auth, cart, checkout, orders/detail, profile/reviews, and verification at 320 px, larger mobile, tablet, and desktop.
- Test 200% zoom, landscape, long names/comments/addresses/prices, empty/broken images, large pagination metadata, and validation errors.
- Verify sticky headers/actions reserve content, respect safe areas, and do not cover focused fields or errors.
- Confirm filter/navigation transformations preserve state and information architecture across breakpoints.
- Fix horizontal overflow, clipped actions, unstable skeleton geometry, and desktop max-width/grid issues using shared tokens/primitives.
- Document manual QA evidence and remaining contract-gated cases.

Backend contract:

- Use mocked/fixture data shaped exactly like current API responses, including null/long fields and all statuses.

Design requirements:

- Follow `frontend/design.md` in full, especially its responsive rules in Sections 9–10, 12, 16, 18, and 20.1.
- Mobile-first fixes must not be desktop-only overrides.

Do not:

- Solve mobile issues by hiding essential information/actions.
- lock public desktop pages inside the prototype’s 640 px frame.
- Introduce page-specific raw colors/spacing when tokens exist.

Acceptance criteria:

- Every route reflows at 320 px and 200% zoom with no essential overlap or horizontal page scroll.
- Mobile actions remain thumb-friendly and keyboard-visible.
- Tablet/desktop enhancements preserve the same hierarchy.

Dependencies: Tasks 08–36.

### Task 38 — Audit Customer Accessibility and Motion

Goal:
Bring the integrated public/customer experience to the `design.md` WCAG 2.2 AA baseline.

Context:
Accessibility must be verified across composed flows, not only primitive tests.

Implementation:

- Audit semantic landmarks, page titles, heading order, link/button semantics, visible labels, error associations, and logical DOM/focus order.
- Test keyboard-only navigation, skip/main focus behavior, route focus, sheet/dialog traps/restoration, menus, chips, star input, quantity controls, and destructive confirmations.
- Verify contrast, visible focus, non-color status cues, 44 px targets, alt text, decorative-image handling, live regions, and no excessive announcements.
- Test reduced motion for loading, sheets, toasts, and feedback animation.
- Verify 401 redirects and auth errors do not leak account existence or lose intended context.
- Add regression tests for the highest-risk focus and announcement behaviors.

Backend contract:

- Error/status semantics must remain accurate when converted to accessible text.
- Do not reveal hidden-resource information through ARIA labels or off-screen content.

Design requirements:

- Follow `frontend/design.md` Section 18 in full plus Sections 13, 16, and 19.
- WCAG 2.2 AA is the acceptance baseline.

Do not:

- Remove focus outlines, depend on color/hover, or use placeholder-only labels.
- Add ARIA where native semantics are sufficient.

Acceptance criteria:

- Critical journeys are keyboard operable with predictable focus.
- Status, validation, mutation, and cart/order changes are announced appropriately.
- Contrast, motion, zoom, and touch target checks are documented and pass.

Dependencies: Task 37.

### Task 39 — Optimize Public Route and Media Performance

Goal:
Keep public/customer pages lightweight and stable without introducing speculative caching.

Context:
Vite/TanStack Router already support automatic route code splitting. Public pages can contain many images and paginated menu/review data.

Implementation:

- Verify generated route chunks and lazy-load non-critical review panels, item-detail code, or other heavy UI where beneficial.
- Use browser-native lazy loading/decoding and reserved aspect ratios for off-screen media; use returned URLs without inventing ImageKit transformations.
- Ensure first-view/hero images receive appropriate priority without downloading every menu image eagerly.
- Review query stale/refetch settings per domain; avoid operational polling for static discovery and excessive refetch for terminal orders.
- Keep pagination/load-more bounded and prevent expensive rendering of unbounded menu/review/order arrays.
- Measure build output and key route behavior under throttled/slow/error networks; document justified improvements.

Backend contract:

- Respect API pagination maxima/defaults and do not bypass them through parallel page flooding.
- Cache behavior must not weaken place scoping, auth, price freshness, or checkout authority.

Design requirements:

- Follow `frontend/design.md` Sections 8–10, 13.21, 16, and 23 performance-related checklist items.
- Avoid layout shift and preserve meaningful skeleton geometry.

Do not:

- Add a service worker/offline mutation queue, complex normalized cache, or undocumented CDN transforms.
- Prefetch private data for unauthenticated users.

Acceptance criteria:

- Public routes remain code-split and non-critical UI/media loads lazily.
- Collections remain bounded, images reserve layout space, and query settings are intentional.
- Build size/behavior review finds no avoidable major regression.

Dependencies: Task 37.

---

## Phase 11 — Critical Journey Testing

### Task 40 — Establish the Customer DOM Interaction Test Harness

Goal:
Add the minimum reliable DOM testing capability needed for customer route/component behavior while preserving existing Node tests.

Context:
Current Vitest runs in the Node environment and existing tests often validate pure logic/rendering. Customer focus, forms, sheets, navigation, and live regions require a DOM environment.

Implementation:

- Add a scoped jsdom/happy-dom Vitest configuration or per-file environment for customer interaction tests.
- Add only the necessary React testing utilities and shared render helpers for QueryClient, Router context, Auth context, Ability, Theme, and deterministic timers.
- Provide API/service mocking helpers at the feature boundary; avoid testing through real network calls.
- Reset query caches, storage, timers, and DOM between tests.
- Document when to use Node unit tests versus DOM interaction tests.
- Add a smoke test proving route/provider rendering, keyboard interaction, and async query resolution.

Backend contract:

- Fixtures must reflect exact current response envelopes and domain codes.
- No test helper may hide unsupported fields in its defaults.

Design requirements:

- Follow `frontend/design.md` accessibility behavior while choosing assertions based on roles, names, state, and visible outcomes.

Do not:

- Replace Vitest or introduce a full browser E2E framework in this task.
- Couple tests to internal component state/class names.

Acceptance criteria:

- Existing Node tests still run unchanged.
- DOM tests can exercise providers, router, focus, forms, and async query/mutation behavior.
- Test setup is deterministic, isolated, and documented.

Dependencies: Phase 1.

### Task 41 — Test Public Discovery, Place, Menu, and Verification Journeys

Goal:
Provide behavior coverage for the critical fully public experience.

Context:
Public access and non-disclosure are core product requirements. Tests should exercise user-visible behavior and request contracts.

Implementation:

- Test published-place listing, supported search/type/city filters, pagination, filter reset, no results, initial/background loading, error, and retry.
- Test place detail imagery fallback, hours/timezone, open versus ordering-off states, 404, and menu navigation.
- Test menu FOOD/DRINK/category filters, grouping/pagination, empty/unavailable menu, item sheet, and public reviews.
- Test valid verification for terminal/non-terminal statuses and identical neutral handling for malformed/unknown/retention-expired tokens.
- Assert visitors are never redirected to login for public reads and that private fields never render.

Backend contract:

- Mock exact `GET /places`, slug detail, public menu, public review, and verification responses/status codes.
- Assert no unsupported query parameters or protected endpoints are called.

Design requirements:

- Follow `frontend/design.md`; test by accessible roles/names and stable visible outcomes at representative mobile state.

Do not:

- Snapshot entire pages as the primary assertion.
- Test implementation details or fabricate API capabilities.

Acceptance criteria:

- Required public scenarios from Batch 2 scope have behavior tests.
- Cache isolation and neutral verification disclosure are explicitly asserted.
- Tests pass deterministically with Task 40’s harness.

Dependencies: Tasks 08–15, 36, and 40.

### Task 42 — Test Authentication Recovery, Cart, and Checkout Journeys

Goal:
Protect the highest-risk customer conversion path from regressions.

Context:
This flow crosses public routes, auth, session recovery, per-place cart state, backend reconciliation, and idempotent checkout.

Implementation:

- Test protected add while unauthenticated → login and registration handoff → safe return → restored draft → explicit confirmed add.
- Test cart add/increment, quantity update, note update, remove, quantity zero, empty, reconciliation/unavailable item, mutation failure, and separate-place isolation.
- Test TAKEAWAY validation/submission, duplicate-click prevention, same-key equivalent retry, changed-payload key behavior, 409 conflicts, unknown network outcome, and confirmed success/cart clearing.
- Test DINE_IN only against a resolved gate; otherwise assert it is not falsely offered and record the blocker.
- Test 401 terminal recovery clears private query data and preserves a safe re-entry URL.

Backend contract:

- Mock exact cart/checkout endpoints, response fields, reconciliation reasons, stable checkout codes, and idempotency semantics.
- Do not include gated subtotal/table/token fields unless their contracts are resolved.

Design requirements:

- Follow `frontend/design.md`; verify accessible pending/error/success feedback, sticky action availability, and no duplicate mutation.

Do not:

- Bypass service/query boundaries or assert local implementation state.
- Call a staff dining-table endpoint in customer tests.

Acceptance criteria:

- All required auth-transition, cart, and checkout scenarios are covered behaviorally.
- Same-payload retry creates one logical order outcome; changed payload cannot reuse the key silently.
- Gate-dependent assertions reflect current authoritative contracts.

Dependencies: Tasks 16–27 and 40.

### Task 43 — Test Orders, Cancellation, Profile, and Reviews

Goal:
Cover authenticated post-checkout/customer-account journeys and verified-purchase review rules.

Context:
These features reuse Batch 1 services but introduce new customer route/layout behavior and permission-sensitive actions.

Implementation:

- Test My Orders list filters/pagination/empty/error, detail snapshots, all status labels, table/fulfillment display, and no fabricated timestamps/payment state.
- Test permitted PENDING cancellation, optional reason, expired/changed/terminal/foreign rejection, conflict refetch, and action removal.
- Test profile entry/update, duplicate-email 409, deletion request success/conflict, dashboard-link capability visibility, and private-cache clearing on logout/deletion acceptance.
- Test completed-order review eligibility, place review, each eligible menu-item review, restored 200, duplicate/ineligible 409, update, delete, and public/own cache refresh.
- Assert non-completed orders and arbitrary public pages do not offer an actionable review form.

Backend contract:

- Mock exact own order, profile, own/public review, and mutation endpoints/status codes.
- Maintain ownership and verified-purchase boundaries in fixtures.

Design requirements:

- Follow `frontend/design.md`; test mobile card/dialog behavior via accessible names, focus, validation, and confirmation outcomes.

Do not:

- Grant capabilities based on role strings in fixtures.
- Assert private operational or moderation behavior through customer routes.

Acceptance criteria:

- Required order, cancellation, profile, and review scenarios are covered.
- Conflict/non-disclosure/private-cache behavior is explicit.
- Batch 1 management tests continue to pass.

Dependencies: Tasks 28–35 and 40.

---

## Phase 12 — Final Architecture and Quality Audit

### Task 44 — Run the Batch 2 Architecture and Release Audit

Goal:
Verify Batch 2 is contract-faithful, mobile-first, accessible, maintainable, and non-regressive before declaring it complete.

Context:
This is the only Batch 2 completion gate. Unresolved backend prerequisites remain release blockers rather than reasons to invent frontend behavior.

Implementation:

- Audit every service endpoint, request field, response type, search parameter, permission assumption, and error mapping against current backend implementation/specification.
- Audit route separation, thin route composition, feature boundaries, shared transport usage, query-key factories, place isolation, mutation invalidation, and private-cache cleanup.
- Confirm public browsing is unauthenticated; protected actions recover safely; dashboard Batch 1 remains stable.
- Search for legacy branding, raw prototype colors, Poppins/Swiper migration, unsupported features, raw internal errors, verification-token exposure, manual route-tree edits, and management-endpoint workarounds.
- Run mobile/responsive/accessibility/performance manual checks and all automated tests.
- Run `npm.cmd run lint`, `npm.cmd run check`, `npm.cmd run type-check`, `npm.cmd run test`, and `npm.cmd run build` from `frontend`.
- Record gate 1/2/3 resolution status and any release-blocking outcome in the Batch 2 handoff.

Backend contract:

- Backend remains authoritative for prices, totals, availability, opening state, ordering, tables, eligibility, transitions, permissions, and verification disclosure.
- Any discovered discrepancy is documented and the affected UI is blocked or removed.

Design requirements:

- Follow `frontend/design.md` in full, including semantic tokens, mobile-first layout, WCAG 2.2 AA, feedback states, motion, and prohibited inconsistencies.

Do not:

- Waive failing quality gates without documenting owner/reason.
- Mark Batch 2 complete while a required supported journey is broken or a contract gate is hidden by a workaround.
- Modify `routeTree.gen.ts` manually or rebuild stable dashboard infrastructure.

Acceptance criteria:

- All quality commands pass and critical manual journeys are documented.
- No unsupported endpoint/field/feature or private disclosure remains.
- Batch 1 management behavior is demonstrably preserved.
- Resolved and unresolved backend gates are explicit in release status.

Dependencies: Tasks 01–43.

---

## Recommended Execution Sequence

Execute tasks in phase order. Within that order:

1. Complete Tasks 01–06 before feature UI work.
2. Tasks 07 and 11 may run in parallel after their prerequisites; Tasks 13 and 16 may also run in parallel.
3. Complete the public place/menu path before wiring cart actions.
4. Task 28 may run alongside the cart phase after Task 01; Task 32 may run once the customer shell exists.
5. Complete TAKEAWAY checkout even if Task 25 remains gated. Do not mark full DINE_IN acceptance complete until gate 1 is resolved.
6. Complete public verification independently after shared public states. QR/link generation remains separate and gated by gate 2.
7. Start feature tests as soon as Task 40 and the corresponding feature task are complete; do not defer all testing to the end.
8. Run Task 44 last. It is the only Batch 2 completion gate.

## Assumptions and Defaults

- Backend implementation plus API/SRS is the functional source of truth; `frontend/design.md` is the visual/interaction source of truth.
- English UI copy and Indonesian IDR formatting are the current defaults.
- Light mode is the primary QA baseline; existing dark/system support remains.
- Public place/menu/review/verification browsing never requires authentication.
- There is no guest cart or global cart collection. Separate authenticated carts remain scoped by place.
- Customer cancellation is limited to a valid, non-expired PENDING own order, so its reason is optional.
- No payment gateway/state, wallet, delivery tracking, inventory, promotion, loyalty, preorder/scheduling, password reset, email verification, or unsupported analytics is introduced.
- Every task must preserve the shared JWT/API abstraction, TanStack Query server-state ownership, feature-oriented structure, generated-route workflow, semantic design tokens, and stable Batch 1 management implementation.
