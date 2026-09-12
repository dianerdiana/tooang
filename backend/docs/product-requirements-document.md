# Tooang Backend Product Requirements Document

| Attribute | Value |
| --- | --- |
| Product | Tooang Backend |
| Document type | Product Requirements Document (PRD) |
| Status | Draft baseline |
| Version | 1.0 |
| Last updated | 2026-09-12 |
| Primary references | [`../README.md`](../README.md), [`../ARCHITECTURE.md`](../ARCHITECTURE.md), [`application-rules.md`](application-rules.md), [`../prisma/schema.prisma`](../prisma/schema.prisma) |

## 1. Product summary

Tooang Backend is a versioned REST API for a web-based digital food menu platform. It enables customers to discover places to eat, browse categorized food and drink menus, review places and menu items, maintain a cart, and create orders that can be verified by a cashier using a human-readable code, QR code, or verification link.

The product uses role-based access control (RBAC). An OWNER manages only places assigned to them, while a SUPER_ADMIN can administer all data. The ordering experience does not process payment; payment and fulfillment remain operational responsibilities of the place.

## 2. Problem statement

Customers need a simple way to inspect current menus and prepare an order before interacting with a cashier. Food-place owners need to publish and maintain their own information, menus, and incoming orders without gaining access to another owner's data. Platform administrators need centralized control over users, roles, places, and moderation.

Existing paper menus, social-media posts, and chat-based ordering commonly create these problems:

- Menu information is difficult to search, categorize, and keep current.
- Customers cannot reliably distinguish food from drinks or browse by category.
- Order details must be repeated manually to a cashier.
- Owners require strong tenant isolation when using a shared platform.
- Reviews of a place and reviews of individual menu items are often mixed together.

## 3. Product goals

The backend must:

1. Provide a reliable source of published place and menu information.
2. Support customer discovery, reviews, carts, and cashier-verifiable orders.
3. Enforce multi-role RBAC and strict OWNER data isolation.
4. Preserve order history even when menu names, availability, or prices change.
5. Provide secure authentication using short-lived access tokens and rotating refresh sessions.
6. Produce auditable administrative and operational changes.
7. Remain a maintainable modular monolith until scale justifies additional infrastructure.

## 4. Non-goals

The initial product does not include:

- Payment gateway integration, wallet balances, refunds, or payment settlement.
- Food delivery dispatch, courier tracking, or delivery-fee calculation.
- Inventory, ingredient, recipe, purchasing, or supplier management.
- Full point-of-sale, accounting, taxation, or receipt-printing functionality.
- Table reservation or queue-management functionality.
- Loyalty points, coupons, promotions, or dynamic pricing.
- Public social features beyond place and menu reviews.
- Native mobile applications.
- AI-generated menu content or production Redis caching. Related environment variables are reserved and do not constitute product scope.

## 5. Personas and roles

### Visitor

An unauthenticated visitor who can browse published places, menus, categories, and visible reviews. A visitor must register or log in before creating reviews, using a cart, or placing an order.

### User

An authenticated customer with the `USER` role. A user manages their profile, reviews, carts, and orders.

### Owner

An authenticated user with the `OWNER` role and one or more `PlaceOwner` assignments. An OWNER has all normal user capabilities and may manage only assigned places and their child resources.

### Super administrator

An authenticated user with the `SUPER_ADMIN` role. A SUPER_ADMIN manages users, roles, places, ownership, moderation, and all operational data.

### Administrator

`ADMIN` remains a recognized role for compatibility. It has no implicit product permissions until its responsibilities are explicitly approved. It must never be treated automatically as `SUPER_ADMIN`.

### Cashier

Cashier is an operational responsibility rather than a dedicated role in the current data model. A cashier uses an authenticated OWNER or SUPER_ADMIN session to find and process orders for an authorized place. A dedicated cashier role may be considered in a future release.

## 6. Product scope and release status

### Available foundation

The current backend provides the foundation for:

- Registration, login, access-token authentication, refresh-token rotation, and logout.
- Current-user profile management.
- Multi-role user administration by SUPER_ADMIN.
- Zod request validation, consistent HTTP handling, application logging, and Prisma persistence.

### MVP capabilities to complete

The MVP includes:

- Place profiles, ownership, publishing, ordering configuration, and business hours.
- Menu categories and food/drink menu items.
- Place and menu-item reviews.
- One cart per user per place.
- Checkout and immutable order-item snapshots.
- User order history and OWNER place-order queue.
- Human-readable order code and secure verification token for QR/link use.
- Controlled order-status transitions and automatic expiry of pending orders.
- Audit records for sensitive actions.

## 7. Core user journeys

### 7.1 Discover a place and menu

1. A visitor requests a paginated list of published places.
2. The visitor filters or selects a place using its slug.
3. The visitor views place details, business hours, rating summary, and visible reviews.
4. The visitor views available menu items filtered by food/drink type or category.

Success means unpublished, deleted, inactive, or unavailable information is not exposed through public discovery.

### 7.2 Register and maintain a session

1. A visitor registers with name, unique email, and password.
2. The backend creates the user and assigns the `USER` role atomically.
3. The user logs in and receives an access token plus a refresh session.
4. When refreshing, the backend rotates the refresh token and invalidates the previous token.
5. Logout revokes the relevant refresh session or token family according to the authentication policy.

Success means passwords and raw refresh tokens are never persisted, and reuse of an invalidated refresh token is detected and contained.

### 7.3 Manage a place and its menu

1. A SUPER_ADMIN creates or assigns an OWNER and a place, or follows the approved place-onboarding flow.
2. The OWNER maintains the place profile, hours, categories, and menu items.
3. The OWNER publishes the place after minimum completeness requirements are met.
4. The OWNER enables ordering only when the place has at least one available menu item.

Success means the OWNER cannot read or mutate private operational data belonging to any unassigned place.

### 7.4 Review a place or menu item

1. An authenticated user opens a published place or non-deleted menu item.
2. The user submits an integer rating from 1 through 5 with an optional comment.
3. The user may update or soft-delete their own review.
4. SUPER_ADMIN may moderate reviews.

Success means one user has at most one stored review per target under the current data model, and deleted reviews are excluded from summaries.

### 7.5 Build a cart and place an order

1. An authenticated user adds an available menu item to a cart scoped to one place.
2. The user changes quantity or notes and reviews current prices.
3. The user checks out while ordering is enabled.
4. The backend reloads current menu data, recalculates totals, creates an order and item snapshots, and clears the cart atomically.
5. The user receives an order code and a QR/link derived from a verification token.

Success means retries do not produce duplicate orders and the backend never trusts client-submitted prices or totals.

### 7.6 Verify and process an order

1. A customer presents an order code, QR code, or verification link.
2. An OWNER/cashier authenticated for that place retrieves the order.
3. The OWNER advances the order only through permitted status transitions.
4. Completed, cancelled, and expired orders become terminal records.

Success means possession of a code or link alone does not grant mutation rights.

## 8. Product requirements

### Authentication and accounts

- PR-AUTH-001: A visitor can register using a unique normalized email, full name, and password.
- PR-AUTH-002: Every new active account receives at least the `USER` role in the same transaction as account creation.
- PR-AUTH-003: A user can log in, refresh their session through token rotation, and log out.
- PR-AUTH-004: A deactivated user cannot authenticate or refresh a session.
- PR-AUTH-005: A user can view and update their own supported profile fields.

### RBAC and administration

- PR-RBAC-001: A user may hold more than one role.
- PR-RBAC-002: Only SUPER_ADMIN can assign or revoke roles.
- PR-RBAC-003: The last role of an active user cannot be removed.
- PR-RBAC-004: An OWNER role cannot be removed while the user owns a place.
- PR-RBAC-005: Sensitive role, ownership, ordering, moderation, and status changes are auditable.

### Places

- PR-PLC-001: Visitors can list and view published, non-deleted places.
- PR-PLC-002: Place details support restaurant/cafe/food-stall/other type, description, address, location, contact information, imagery, and business hours.
- PR-PLC-003: OWNER can manage only assigned places; SUPER_ADMIN can manage every place.
- PR-PLC-004: An active place retains at least one owner unless governed by an explicit administrative exception.
- PR-PLC-005: Ordering can be enabled or disabled independently per place.

### Menus

- PR-MNU-001: Visitors can browse available menu items for a published place.
- PR-MNU-002: Menu items can be filtered by `FOOD`, `DRINK`, and category.
- PR-MNU-003: OWNER can manage categories and menu items only for assigned places.
- PR-MNU-004: Each menu item belongs to a category from the same place.
- PR-MNU-005: Menu prices use decimal monetary values and historical orders remain unchanged after menu updates.

### Reviews

- PR-REV-001: Authenticated users can create, update, and delete their own place reviews.
- PR-REV-002: Authenticated users can create, update, and delete their own food or drink reviews.
- PR-REV-003: Visitors can view active reviews and rating summaries for public resources.
- PR-REV-004: Ratings are integers from 1 through 5.
- PR-REV-005: SUPER_ADMIN can moderate any review.

### Carts and orders

- PR-ORD-001: A user can maintain a separate cart for each place.
- PR-ORD-002: One cart cannot contain menu items from different places.
- PR-ORD-003: Checkout is allowed only when the place enables ordering and every selected item remains orderable.
- PR-ORD-004: Checkout produces an order code, verification token, order-item snapshots, and server-calculated subtotal.
- PR-ORD-005: Checkout is atomic and idempotent from the customer's perspective.
- PR-ORD-006: A user can view their own order history.
- PR-ORD-007: OWNER can view and process only orders for assigned places.
- PR-ORD-008: Pending orders can expire automatically.
- PR-ORD-009: The backend does not collect or confirm payment.

## 9. MVP acceptance criteria

The MVP is product-complete when:

- All PRD capabilities marked as MVP are implemented through `/api/v1` endpoints.
- Public discovery never returns unpublished or soft-deleted places.
- OWNER isolation is proven by E2E tests using at least two owners and two places.
- Registration and first-role assignment are atomic.
- Refresh-token rotation and reuse handling are covered by automated tests.
- Cross-place category, menu, cart, and order operations are rejected.
- Checkout recalculates prices and creates a single consistent order under retry/concurrency scenarios.
- Orders can be retrieved from an order code or verification token without exposing unnecessary personal data.
- Illegal order-state transitions are rejected.
- Sensitive administrative and order-processing actions produce safe audit records.
- Unit, integration, and critical E2E tests pass in CI against PostgreSQL.

## 10. Product success measures

Initial measures should be captured after the relevant modules are released:

- Successful checkout rate, excluding deliberate validation failures.
- Duplicate-order rate caused by retries: target zero.
- Cross-tenant authorization incidents: target zero.
- Percentage of published places with at least one available menu item.
- Median time from `PENDING` to `CONFIRMED` and from `CONFIRMED` to `COMPLETED`.
- Percentage of pending orders that expire without owner action.
- Authentication refresh failure and detected token-reuse rates.
- API error rate grouped by endpoint and error category.

These measures must not require logging passwords, raw tokens, verification tokens, or unnecessary personal data.

## 11. Assumptions and dependencies

- The frontend consumes a JSON REST API under `/api/v1`.
- PostgreSQL is the authoritative datastore and Prisma is the persistence client.
- A place currently operates in the application timezone unless place-specific timezone support is added.
- QR images may be generated client-side or after checkout from a backend verification URL; the database stores the token, not an image.
- Cashiers operate through an OWNER-authorized place session in the MVP.
- Product stakeholders must define retention periods, password policy details, maximum quantities, review-verification policy, and any future `ADMIN` permissions before production launch.

## 12. Risks and product decisions pending

- A dedicated cashier role may be required when owners do not want to share OWNER access with staff.
- A place-specific timezone field may be required if the product expands across timezones.
- The current one-review-per-target constraint requires restoring a soft-deleted review rather than creating a new row.
- The method for generating and distributing idempotency keys must be agreed with the frontend.
- Public verification-link behavior must balance customer convenience with minimal disclosure.
- Audit-log retention and personal-data anonymization require an approved privacy policy.

## 13. Related documents

- Technical requirements: [`software-requirement-specification.md`](software-requirement-specification.md)
- Backend architecture: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
- Application invariants: [`application-rules.md`](application-rules.md)
- Database schema: [`../prisma/schema.prisma`](../prisma/schema.prisma)
- API contracts: [`api-specification/`](api-specification/)

