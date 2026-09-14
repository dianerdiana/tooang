Below is a task decomposition designed specifically for an IDE AI Agent workflow. Each task is intentionally narrow enough that you can paste the prompt into an agent and ask it to produce an implementation plan before writing code.

I treat **SRS v1.3 as the authoritative product/behavior specification**. The current Prisma schema is already substantially aligned with it. Where `ARCHITECTURE.md` still mentions older concepts such as multi-role users, `PlaceOwner`, or JWT roles being authoritative, the SRS v1.3 model (`User.platformRole` + `PlaceMember`) takes precedence. The implementation should otherwise retain the modular-monolith `Controller → Service → Repository → Prisma` architecture and transaction boundaries described in the architecture document.

For each prompt, the agent should **plan first, not immediately implement**. I would execute them roughly in this order.

1. **TASK-001 — Reconcile implementation baseline with SRS v1.3**

```text
Study the current Tooang backend repository before proposing changes.

Authoritative requirements:
- docs/software-requirement-specification*.md — SRS v1.3 is authoritative.
- prisma/schema.prisma
- ARCHITECTURE.md
- existing source code and tests.

Goal:
Produce an implementation plan to reconcile the current codebase with the SRS v1.3 authorization/data model before feature implementation continues.

Focus only on identifying:
- stale Role/UserRole assumptions
- stale PlaceOwner assumptions
- incorrect multi-role JWT/current-user assumptions
- current User.platformRole usage
- current PlaceMember OWNER/CASHIER usage
- schema/code mismatches
- missing modules or infrastructure required by SRS v1.3
- architecture documentation that contradicts SRS v1.3

Do not redesign the application.
Preserve the modular-monolith architecture:
Controller -> Service -> Repository -> Prisma.

SRS v1.3 takes precedence if ARCHITECTURE.md contains obsolete authorization descriptions.

Return:
1. Current-state findings.
2. Exact conflicts with SRS requirement IDs.
3. Files/modules likely affected.
4. Ordered implementation steps.
5. Migration/backward-compatibility risks.
6. Tests required.
7. Explicit out-of-scope items.

Do not implement code yet.
Keep each proposed implementation step small enough for a separate commit.
```

2. **TASK-002 — Prisma constraints and database migration hardening**

```text
Create an implementation plan for database-level requirements that are still missing from the current Prisma schema/migrations.

Study:
- SRS-DATA-001 through SRS-DATA-017
- SRS-TBL-001 through SRS-TBL-011
- SRS-MNU-004 through SRS-MNU-012
- SRS-CART-001 through SRS-CART-011
- SRS-REV-001 through SRS-REV-013
- SRS-ORD-018 through SRS-ORD-023
- current prisma/schema.prisma
- existing migrations

Focus on database/schema work only:
- required check constraints
- uniqueness constraints
- indexes
- decimal constraints
- positive quantities
- rating range
- sortOrder constraints
- business-hour consistency
- idempotency storage
- active membership constraints where feasible
- order snapshot support
- retention-related indexes

Do not implement feature controllers or services.

For constraints Prisma cannot express directly, identify the SQL migration needed.

Return:
- gap analysis
- proposed Prisma changes
- proposed SQL migration changes
- data migration risks
- migration order
- rollback considerations
- integration tests for every important constraint

Do not implement yet.
```

3. **TASK-003 — Authorization permission contract**

```text
Create an implementation plan for the code-defined permission system defined by SRS v1.3.

Requirements:
SRS-AUTHZ-001 through SRS-AUTHZ-022
SRS-RBAC-001 through SRS-RBAC-024
SRS-QLT-008 through SRS-QLT-010

Implement conceptually:
- typed Permission identifiers
- one authoritative platformRole -> permissions mapping
- one authoritative PlaceMemberRole -> permissions mapping
- platform permission scopes
- place membership permission scopes
- effective permission calculation
- deny-by-default behavior
- no Role/Permission database tables

Platform roles:
SUPER_ADMIN
ADMIN
USER

Place membership roles:
OWNER
CASHIER

Permission identifiers must remain capability based and must not contain resource IDs.

Inspect existing auth/common guards and decorators before planning.

Return:
- recommended file locations
- types/constants structures
- mapping strategy
- effective-permission resolution algorithm
- how platform and place permissions combine
- what belongs in common/auth vs feature services
- unit-test matrix

Do not implement authorization guards or feature endpoints yet.
```

4. **TASK-004 — Authentication current-user resolution**

```text
Create an implementation plan for authenticated-user resolution under SRS v1.3.

Focus on:
SRS-AUTHZ-004 through SRS-AUTHZ-007
SRS-AUTHZ-012
SRS-AUTHZ-014 through SRS-AUTHZ-016
SRS-RBAC-023 through SRS-RBAC-024
SRS-SEC-012 through SRS-SEC-013

Goal:
JWT proves authentication, but privileged authorization must use current server-side state.

Plan how JwtAuthGuard/current-user resolution should:
- verify JWT
- identify the user
- load current deleted/deactivated state
- load current platformRole
- reject inactive/deleted/deletion-pending accounts
- avoid trusting role/permission claims in JWT
- expose a safe authenticated actor object
- support immediate role/membership revocation semantics

Do not build feature-specific OWNER/CASHIER authorization yet.

Return:
- current-code analysis
- proposed request/authenticated-user type
- database lookup strategy
- performance implications
- guard/decorator changes
- negative tests
- migration path from current JWT assumptions

Do not implement yet.
```

5. **TASK-005 — Place-scoped authorization policy**

```text
Create an implementation plan for reusable place-scoped authorization.

Requirements:
SRS-RBAC-008 through SRS-RBAC-013
SRS-AUTHZ-008 through SRS-AUTHZ-011
SRS-AUTHZ-016 through SRS-AUTHZ-022

Goal:
Provide reusable authorization behavior for resources belonging to a Place.

Cover:
- OWNER scope
- CASHIER scope
- ADMIN/SUPER_ADMIN global permission bypass
- current active PlaceMember lookup
- 404 for foreign-tenant resources where necessary
- additive platform + membership permissions
- domain restrictions remaining mandatory
- database-constrained queries instead of unrestricted in-memory filtering

Decide whether an AuthorizationService, PlaceAccessService, policy helpers, or a combination best fits the existing architecture.

Do not move business rules into guards.

Return:
- responsibilities by guard/service/repository
- API for checking permissions
- API for resolving place scope
- expected error semantics
- repository query requirements
- representative authorization flows
- test matrix

Do not implement feature endpoints yet.
```

6. **TASK-006 — Password policy and registration**

```text
Create an implementation plan for registration and password handling.

Requirements:
SRS-AUTH-001 through SRS-AUTH-005
SRS-AUTH-014 through SRS-AUTH-019
SRS-RBAC-001 through SRS-RBAC-003

Cover:
- full name/email/password validation
- normalized email
- default platformRole USER
- registration transaction
- 8–128 Unicode character passwords
- common-password denylist
- no trimming/case normalization of password
- SHA-256 deterministic pre-hash of exact UTF-8 bytes
- bcrypt-safe representation
- configurable bcrypt work factor
- generic invalid-login behavior
- response field safety

Inspect existing BcryptHashingService and registration code before recommending replacements.

Return:
- files affected
- validation changes
- hashing pipeline
- registration transaction
- configuration changes
- migration impact on existing passwords, if any
- unit/integration/E2E tests

Do not implement refresh sessions in this task.
Do not implement yet.
```

7. **TASK-007 — Login rate limiting and access tokens**

```text
Create an implementation plan for login and access-token behavior.

Requirements:
SRS-AUTH-005
SRS-AUTH-006
SRS-AUTH-020
SRS-AUTH-024
SRS-SEC-002
SRS-SEC-004

Cover:
- login credential verification
- 15-minute access tokens
- progressive rate limiting
- baseline 10 attempts / 15 minutes / source IP
- no permanent lockout caused solely by failed attempts
- distinct signing secrets
- generic invalid credential responses
- inactive/deleted user denial
- safe logging

Do not plan refresh rotation here except for the interface needed to create an initial refresh session.

Return:
- configuration
- guard/service responsibilities
- rate-limit mechanism
- expected response behavior
- observability requirements
- tests

Do not implement yet.
```

8. **TASK-008 — Refresh session rotation and token-family reuse detection**

```text
Create an implementation plan for refresh sessions.

Requirements:
SRS-AUTH-006 through SRS-AUTH-013
SRS-AUTH-020 through SRS-AUTH-023
SRS-REL-005

Use the existing RefreshSession model unless a schema change is actually necessary.

Cover:
- raw refresh token generation
- cryptographic token hashing
- familyId
- expiresAt
- replacedById
- atomic rotation
- revoked/replaced token reuse detection
- entire family revocation
- logout
- 30-day normal session
- optional 90-day remember-me session
- concurrency behavior
- inactive/deleted account handling

Return:
- token/session lifecycle
- transaction strategy
- repository operations
- concurrent refresh strategy
- response/cookie behavior
- tests including simultaneous refresh requests

Do not implement yet.
```

9. **TASK-009 — Refresh cookie transport**

```text
Create an implementation plan specifically for refresh-token transport and cookies.

Requirements:
SRS-AUTH-022
SRS-AUTH-023
SRS-SEC-009
SRS-SEC-010
SRS-API-011

Required cookie baseline:
HttpOnly
SameSite=Lax
Path=/api/v1/auth
Secure=true in production
Secure=false only for localhost development

Cover:
- login
- refresh
- logout
- cookie creation/removal
- CORS implications
- environment configuration
- testing in development and production-like environments

Do not redesign token/session persistence.

Return:
- configuration changes
- controller/service boundaries
- cookie helper proposal if justified
- security tests
- E2E tests

Do not implement yet.
```

10. **TASK-010 — `/me` profile and effective authorization metadata**

```text
Create an implementation plan for the authenticated `/me` resource.

Requirements:
SRS-USR-001 through SRS-USR-003
SRS-AUTHZ-014 through SRS-AUTHZ-015
SRS-API-006
SRS-API-012

The response must support frontend authorization-aware rendering while backend authorization remains authoritative.

Plan:
- profile fields
- platformRole
- effective platform permissions
- active place memberships
- placeId
- membership role
- effective place permissions where appropriate
- own profile update

Do not expose sensitive/internal fields.

Return:
- endpoint contracts
- service/repository queries
- response shape
- update validation
- authorization behavior
- tests

Do not implement yet.
```

11. **TASK-011 — Platform user administration**

```text
Create an implementation plan for ADMIN/SUPER_ADMIN user administration.

Requirements:
SRS-USR-004 through SRS-USR-011
SRS-RBAC-014 through SRS-RBAC-015
SRS-AUTHZ permission matrix

Cover:
- bounded user listing
- user detail
- platformRole changes by SUPER_ADMIN only
- deterministic/idempotent same-role assignment behavior
- last active SUPER_ADMIN invariant
- ADMIN may deactivate USER only
- ADMIN cannot deactivate ADMIN/SUPER_ADMIN
- SUPER_ADMIN deactivation rules
- session revocation atomically with deactivation
- auditing

Do not implement self-service deletion in this task.

Return:
- endpoint proposal
- schemas
- service rules
- transaction boundaries
- repository queries
- audit events
- negative authorization tests

Do not implement yet.
```

12. **TASK-012 — Self-service account deletion lifecycle**

```text
Create an implementation plan for self-service account deletion.

Requirements:
SRS-USR-012 through SRS-USR-016
SRS-DATA-013 through SRS-DATA-015
SRS-RBAC-016
SRS-AUD-001

Cover:
- idempotent deletion request
- sole active OWNER conflict
- deletion-pending state
- immediate login/protected-access denial
- atomic session revocation
- delayed anonymization/removal within 30 days
- retained order/audit history
- anonymized customer data rules
- auditing

This task should plan the request workflow and state transition.
A separate task will cover the scheduled anonymization worker.

Return:
- endpoint
- transaction
- state model
- repository queries
- conflict behavior
- audit record
- tests

Do not implement yet.
```

13. **TASK-013 — Place creation, public discovery, and basic management**

```text
Create an implementation plan for core PlacesModule behavior.

Requirements:
SRS-PLC-001 through SRS-PLC-009
SRS-PLC-015 through SRS-PLC-021

Cover:
- public place list
- public detail by slug
- pagination and filters
- create place
- atomic initial OWNER membership
- place update
- soft deletion baseline
- slug normalization/reserved routes
- input lengths
- valid IANA timezone
- ADMIN/SUPER_ADMIN global management
- OWNER owned-place management

Do not implement publishing readiness, business-hour evaluation, or ordering enablement in this task.

Follow Controller -> Service -> Repository -> Prisma.

Return:
- routes
- schemas
- repository queries
- transaction boundaries
- authorization
- expected errors
- tests

Do not implement yet.
```

14. **TASK-014 — Place membership management**

```text
Create an implementation plan for PlaceMember administration.

Requirements:
SRS-RBAC-004 through SRS-RBAC-007
SRS-RBAC-016 through SRS-RBAC-024
permission matrix for:
place_member.read
cashier.assign
cashier.revoke
owner.assign
owner.revoke

Cover:
- active membership lookup
- OWNER assigning/removing CASHIER in owned places
- OWNER forbidden from OWNER assignment/revocation
- ADMIN global CASHIER assignment/revocation
- ADMIN forbidden from OWNER assignment/revocation
- SUPER_ADMIN OWNER/CASHIER administration
- last active OWNER invariant
- revoked membership semantics
- membership auditing
- account deactivation interaction

Return:
- endpoints
- service rules
- transaction requirements
- repository methods
- concurrency strategy for last-owner protection
- audit events
- negative tenant tests

Do not implement yet.
```

15. **TASK-015 — Business hours and place-local opening state**

```text
Create an implementation plan for business-hour management and opening-state calculation.

Requirements:
SRS-HRS-001 through SRS-HRS-008
SRS-PLC-014
SRS-PLC-022

Cover:
- one record/day
- closed-day validation
- open-day validation
- overnight hours
- IANA timezone handling
- UTC database timestamps
- place-local calculations
- DST/timezone-library considerations
- reusable isPlaceOpen behavior
- OWNER/global ADMIN management

Do not implement checkout integration yet.

Return:
- schemas
- service helper design
- repository behavior
- timezone dependency recommendation using existing project dependencies where possible
- edge cases
- deterministic tests with fixed clocks

Do not implement yet.
```

16. **TASK-016 — Place publishing and ordering-state rules**

```text
Create an implementation plan for place publishing and ordering enablement.

Requirements:
SRS-PLC-010 through SRS-PLC-015
SRS-PLC-022

Cover:
- minimum publish readiness
- required identity fields
- at least one owner
- minimum menu content
- ordering enabled only for active + published + available menu
- disabling ordering without cancelling existing orders
- soft-delete restrictions around unresolved orders
- OWNER scope
- ADMIN/SUPER_ADMIN global scope
- auditing of ordering-setting changes

Inspect existing requirements/source to determine what "configured minimum menu content" currently means. Do not invent additional requirements if the source does not define them; identify any unresolved implementation constant explicitly.

Return:
- business predicates
- repository queries
- mutation flow
- audit events
- conflicts/errors
- tests

Do not implement yet.
```

17. **TASK-017 — Dining table management**

```text
Create an implementation plan for dining-table master data.

Requirements:
SRS-TBL-001 through SRS-TBL-011

Cover:
- list/read
- OWNER create/update
- activate/deactivate
- soft delete
- normalized case-insensitive names
- uniqueness per place
- CASHIER read-only access to active tables
- ADMIN/SUPER_ADMIN global management
- preserving historical order snapshots

Do not implement checkout behavior here.

Return:
- endpoints
- schemas
- normalization
- repository predicates
- authorization
- soft deletion rules
- tests

Do not implement yet.
```

18. **TASK-018 — Menu category management**

```text
Create an implementation plan for menu categories only.

Requirements:
Relevant portions of SRS-MNU-001 through SRS-MNU-014.

Cover:
- categories scoped to place
- normalized case-insensitive unique names
- name 1–100 characters
- sortOrder >= 0
- active/inactive
- soft deletion
- OWNER owned-place mutations
- ADMIN/SUPER_ADMIN global mutations
- public category filtering behavior as needed by menus

Do not implement MenuItem CRUD in this task.

Return:
- routes
- schemas
- repository methods
- authorization
- normalization
- uniqueness/conflict behavior
- tests

Do not implement yet.
```

19. **TASK-019 — Menu item management and public menu**

```text
Create an implementation plan for MenuItem CRUD and public menu queries.

Requirements:
SRS-MNU-001 through SRS-MNU-014

Assume category management is handled separately.

Cover:
- place/category consistency
- FOOD/DRINK
- Decimal(15,2) IDR price
- non-negative price
- availability
- sorting
- soft deletion
- names/descriptions limits
- public filters by place/type/category
- only published place
- only active category
- only available/non-deleted items
- preserving OrderItem snapshots
- invalidating/removing active cart items after soft deletion
- OWNER/global ADMIN authorization

Do not implement media upload itself in this task.

Return:
- routes
- schemas
- service rules
- repository queries
- Prisma.Decimal handling
- tests

Do not implement yet.
```

20. **TASK-020 — ImageKit infrastructure and upload authorization**

```text
Create an implementation plan for ImageKit integration and upload authorization.

Requirements:
SRS-MED-001 through SRS-MED-012
SRS-MED-016 through SRS-MED-018
SRS-CON-010
SRS-SEC-014 through SRS-SEC-015

Cover:
- backend ImageKit adapter
- configuration/secrets
- short-lived client upload authorization
- media.upload permission checks
- target-resource scope
- OWNER owned-resource uploads
- ADMIN/SUPER_ADMIN global access
- no USER/CASHIER upload management
- allowed MIME types
- 5 MB limit
- rejecting SVG/GIF/video/arbitrary files
- persistence of ImageKit file ID/delivery URL/path
- sanitized provider errors

Do not plan asset cleanup/retry worker in this task.

Return:
- lib vs feature-module responsibilities
- endpoint
- schemas
- asset metadata lifecycle
- security considerations
- tests

Do not implement yet.
```

21. **TASK-021 — Media replacement and cleanup lifecycle**

```text
Create an implementation plan for replacing/deleting ImageKit-managed media.

Requirements:
SRS-MED-011 through SRS-MED-015
SRS-REL-006
SRS-REL-013 through SRS-REL-014

Use existing MediaAsset status fields where appropriate.

Cover:
- association replacement
- PENDING_DELETE
- provider deletion
- DELETE_FAILED
- retries
- DELETED
- provider operations outside PostgreSQL transactions
- avoiding metadata that intentionally references known-failed uploads
- observable failures
- orphan prevention
- idempotent retry

Return:
- state machine
- database mutations
- provider call ordering
- compensation/retry strategy
- worker responsibilities
- logging
- tests

Do not implement yet.
```

22. **TASK-022 — Shopping cart CRUD and validation**

```text
Create an implementation plan for CartsModule.

Requirements:
SRS-CART-001 through SRS-CART-011
SRS-MNU-009
SRS-MNU-011

Cover:
- one cart/user/place
- owner-only access
- adding item
- updating existing quantity rather than duplicate row
- quantity zero removes item
- item/place consistency
- notes <= 500
- max 50 distinct items
- quantity <= 99/item
- aggregate quantity <= 200
- retrieval with current server-side prices
- unavailable/deleted/inactive-category handling
- cart retained while ordering disabled/closed

Do not implement checkout.

Return:
- routes
- schemas
- service rules
- repository operations
- concurrency considerations
- response behavior for invalid items
- tests

Do not implement yet.
```

23. **TASK-023 — Checkout request validation and deterministic idempotency hashing**

```text
Create an implementation plan for the checkout API contract and idempotency request identity.

Requirements:
SRS-ORD-001 through SRS-ORD-004
SRS-ORD-010 through SRS-ORD-015
SRS-ORD-017
SRS-ORD-020
SRS-ORD-023

Focus only on:
- checkout request schema
- fulfillment type
- customerName
- customerNote
- DINE_IN tableId requirements
- TAKEAWAY table exclusion
- idempotency-key transport
- validation/normalization
- deterministic request hash
- same-key/same-payload semantics
- same-key/different-payload 409 semantics

Do not implement order creation transaction yet.

Return:
- API contract
- normalization algorithm
- canonical hash input
- idempotency lookup behavior
- errors
- unit-test vectors

Do not implement yet.
```

24. **TASK-024 — Atomic checkout transaction**

```text
Create an implementation plan for atomic cart-to-order checkout.

Requirements:
SRS-ORD-001 through SRS-ORD-009
SRS-ORD-014 through SRS-ORD-023
SRS-HRS-007
SRS-REL-002
SRS-PERF-007

Checkout must re-read authoritative server state.

Cover:
- user/cart validation
- current place state
- current opening state
- ordering enabled
- category/menu availability
- current prices
- quantities
- dining table
- Prisma.Decimal calculations
- Order creation
- OrderItem snapshots
- DINE_IN table snapshot
- PENDING status
- expiresAt = creation + 15 minutes
- unique orderCode
- opaque verificationToken
- successful IdempotencyKey persistence
- cart clearing
- single atomic PostgreSQL transaction
- no remote provider calls inside transaction
- bounded orderCode collision retry

A successful order and successful idempotency result must not commit independently.

Return:
- transaction sequence
- repository operations
- Decimal calculation strategy
- collision strategy
- concurrency strategy
- failure rollback behavior
- integration/E2E tests

Do not implement yet.
```

25. **TASK-025 — User and place-scoped order retrieval**

```text
Create an implementation plan for authenticated order queries.

Requirements:
SRS-STS-001 through SRS-STS-004
SRS-STS-024 through SRS-STS-025
permission matrix for order.read

Cover:
- USER own order list/detail
- CASHIER assigned-place queue/detail
- OWNER owned-place queue/detail
- ADMIN/SUPER_ADMIN global queries
- bounded pagination
- safe response selection
- tenant isolation
- database filtering rather than unrestricted in-memory filtering
- effective current authorization

Do not implement status mutation in this task.

Return:
- routes
- query schemas
- repository predicates
- response contracts
- authorization behavior
- 403 vs 404 behavior
- tests

Do not implement yet.
```

26. **TASK-026 — Order status-transition engine**

```text
Create an implementation plan for the order status state machine.

Requirements:
SRS-STS-005 through SRS-STS-019
SRS-REL-003 through SRS-REL-004

Allowed transitions:

PENDING -> CONFIRMED | CANCELLED | EXPIRED
CONFIRMED -> PREPARING | CANCELLED
PREPARING -> READY | CANCELLED
READY -> COMPLETED | CANCELLED

COMPLETED, CANCELLED, EXPIRED are terminal.

Cover:
- transition validation
- expired PENDING source-of-truth behavior
- conditional database update based on expected previous status
- statusUpdatedAt
- confirmedAt
- completedAt
- cancelledAt
- cancellationReason rules
- immutable terminal state
- race conditions

Keep authorization separate enough that the transition engine can be unit tested independently.

Return:
- transition model/helper
- service flow
- repository conditional update strategy
- error mapping
- race behavior
- exhaustive unit-test matrix

Do not implement yet.
```

27. **TASK-027 — Order mutation authorization and cancellation matrix**

```text
Create an implementation plan for authorization around order transitions.

Requirements:
SRS-STS-013 through SRS-STS-018
permission matrix:
order.cancel
order.confirm
order.prepare
order.ready
order.complete

Rules include:
- USER may cancel only own non-expired PENDING order
- CASHIER operates assigned places
- OWNER operates owned places
- ADMIN/SUPER_ADMIN global permission
- CASHIER/OWNER may cancel non-terminal operational orders
- expired PENDING cannot be treated as valid PENDING
- after-PENDING cancellation requires reason
- PENDING cancellation reason optional

Assume a separate order-state transition engine exists.

Return:
- actor/action matrix
- service authorization sequence
- scope lookup requirements
- 403/404/409 decisions
- negative tests
- E2E scenarios

Do not implement yet.
```

28. **TASK-028 — Public order verification**

```text
Create an implementation plan for public order verification.

Requirements:
SRS-STS-020 through SRS-STS-027
SRS-SEC-003 through SRS-SEC-004

Public verification by opaque token must expose ONLY:
- orderCode
- place display name
- status
- fulfillment type
- createdAt
- expiresAt
- statusUpdatedAt

Must not expose:
- customer data
- dining table
- items
- notes
- prices
- IDs
- token

Cover:
- unguessable token
- read-only endpoint
- rate limiting
- no token logging
- terminal-state + 30-day public retention
- same not-found response for invalid/expired/disabled tokens

Return:
- endpoint contract
- repository select
- retention condition
- logging/redaction
- rate limiting
- security/E2E tests

Do not implement yet.
```

29. **TASK-029 — Order expiry scheduler**

```text
Create an implementation plan for scheduled PENDING order expiry.

Requirements:
SRS-STS-010 through SRS-STS-012
SRS-REL-004
SRS-REL-006

Cover:
- selecting PENDING orders where expiresAt <= now
- idempotent batch update
- status = EXPIRED
- statusUpdatedAt
- concurrency with interactive status mutations
- batching
- scheduling frequency
- observability
- safe retry

The scheduler is not the source of truth for whether a PENDING order has expired; expiresAt remains authoritative.

Return:
- job structure
- repository update strategy
- concurrency handling
- batching/index usage
- tests

Do not implement yet.
```

30. **TASK-030 — Verified-purchase place reviews**

```text
Create an implementation plan for place reviews only.

Requirements:
Relevant portions of SRS-REV-001 through SRS-REV-013.

Cover:
- authenticated active user
- own COMPLETED order
- order/place consistency
- rating 1–5
- comment <= 2000
- one place review/order
- restoring a soft-deleted review instead of inserting another
- update own review
- soft delete own review
- public queries exclude deleted reviews
- rating summaries exclude deleted reviews

Do not implement menu-item reviews or moderation in this task.

Return:
- routes
- schemas
- qualification queries
- restore/update transaction
- repository methods
- tests

Do not implement yet.
```

31. **TASK-031 — Verified-purchase menu-item reviews**

```text
Create an implementation plan for menu-item reviews.

Requirements:
SRS-REV-001 through SRS-REV-013 as applicable to MenuItemReview.

Cover:
- own COMPLETED order
- target item must exist in that Order's item snapshots
- rating 1–5
- comment <= 2000
- one review per order/menuItem
- restore soft-deleted matching review
- multiple different completed orders may review same menu item
- own update/delete
- public exclusion of deleted reviews

Return:
- routes
- schema
- qualifying-purchase query
- restore behavior
- repository methods
- tests

Do not implement place reviews or moderation.
Do not implement yet.
```

32. **TASK-032 — Review moderation**

```text
Create an implementation plan for ADMIN/SUPER_ADMIN review moderation.

Requirements:
SRS-REV-008
SRS-AUD-001 through SRS-AUD-006
review.moderate permission matrix

Cover:
- place reviews
- menu-item reviews
- current permission lookup
- moderation action semantics based on existing API/application rules
- soft deletion where applicable
- audit record
- safe before/after data

Do not invent moderation features not supported by the SRS.

Return:
- endpoint/API plan
- service flow
- repository operation
- audit transaction strategy
- tests

Do not implement yet.
```

33. **TASK-033 — Audit logging infrastructure**

```text
Create an implementation plan for the audit logging capability.

Requirements:
SRS-AUD-001 through SRS-AUD-006

Audited operations include:
- platform-role changes
- OWNER/CASHIER membership changes
- ordering-setting changes
- ADMIN cross-place mutations
- review moderation
- user deactivation
- accepted deletion requests
- order-status changes

Cover:
- AuditLog service/repository placement
- append-only behavior
- actor/action/target
- safe beforeData/afterData
- sensitive-field sanitization
- transaction participation
- use by feature services without creating circular dependencies

Return:
- module design
- audit action constants
- safe serialization approach
- transaction API
- prohibited fields
- integration pattern
- tests

Do not retrofit every feature in this task; plan the infrastructure first.
Do not implement yet.
```

34. **TASK-034 — Apply auditing to security-sensitive mutations**

```text
Create an implementation plan to integrate the existing audit infrastructure into SRS-required mutations.

Requirements:
SRS-AUD-001 through SRS-AUD-006

Inspect the repository and identify every existing or planned operation requiring auditing:
- role changes
- membership changes
- ordering settings
- ADMIN cross-place mutations
- review moderation
- deactivation
- deletion request
- order status transition

For each operation determine whether state mutation + audit record can share a transaction.

Return:
- complete operation matrix
- files affected
- transaction changes
- before/after data
- security redaction requirements
- tests

Do not redesign AuditLog infrastructure.
Do not implement yet.
```

35. **TASK-035 — Account anonymization retention worker**

```text
Create an implementation plan for the deletion-pending anonymization worker.

Requirements:
SRS-USR-016
SRS-DATA-012 through SRS-DATA-015
SRS-REL-006

Cover:
- accounts whose accepted deletion request reaches its processing deadline
- idempotency
- anonymizing/removing personal user data
- order customerName -> "Deleted User"
- clearing retained phone/email values if present
- preserving transaction snapshots/totals/items
- audit requirements
- failure recovery
- batching
- backup lifecycle implications

Do not implement the initial deletion-request endpoint.

Return:
- eligible-record query
- anonymization transaction
- fields affected
- audit behavior
- retry strategy
- tests

Do not implement yet.
```

36. **TASK-036 — Retention cleanup jobs**

```text
Create an implementation plan for automated retention cleanup.

Requirements:
SRS-DATA-012 through SRS-DATA-015
SRS-REL-006

Retention:
- access/session logs: 90 days
- authentication sessions: expiry + 30 days
- audit logs: 1 year
- orders: 5 years
- idempotency keys: 24 hours
- anonymous analytics: 1 year

Focus only on retention jobs whose backing data exists in the current repository.

Do not invent tables for unspecified analytics/log storage.

Return:
- supported cleanup jobs
- unsupported/not-yet-applicable requirements
- batch-delete strategy
- scheduling
- idempotency
- observability
- tests

Do not implement yet.
```

37. **TASK-037 — API error and response hardening**

```text
Create an implementation plan for consistent API validation/error behavior.

Requirements:
SRS-API-001 through SRS-API-012
SRS-SEC-006 through SRS-SEC-008

Required semantic mapping:
400 invalid input
401 invalid authentication
403 global permission denial
404 absent/hidden/foreign tenant
409 state/invariant/idempotency/uniqueness conflict

Cover:
- Zod validation failures
- Prisma known errors
- unknown errors
- ImageKit sanitized errors
- stack trace protection
- machine-readable error format
- pagination bounds
- sensitive field filtering

Inspect existing exception filters/pipes before proposing new infrastructure.

Return:
- current gaps
- error contract
- filter/helper changes
- Prisma mapping
- provider error mapping
- tests

Do not implement feature business logic.
Do not implement yet.
```

38. **TASK-038 — Security logging and sensitive-value redaction**

```text
Create an implementation plan for application logging redaction.

Requirements:
SRS-SEC-003
SRS-AUD-003
SRS-OPS-001 through SRS-OPS-004
SRS-OPS-007

Never log:
- Authorization headers
- authentication cookies
- raw tokens
- refresh-token hashes
- passwords
- verification tokens
- ImageKit credentials
- unnecessary personal information

Cover:
- Winston configuration
- request logging
- exception logging
- structured metadata
- redaction
- safe actor/resource IDs
- provider failures

Return:
- logging pipeline
- redaction rules
- middleware/interceptor strategy
- examples of allowed/disallowed fields
- tests

Do not implement yet.
```

39. **TASK-039 — Request correlation and observability**

```text
Create an implementation plan for operational observability.

Requirements:
SRS-OPS-001 through SRS-OPS-008
SRS-REL-009

Cover:
- request/correlation ID
- route/method/status/duration logging
- authentication failures
- authorization denials
- refresh reuse
- server errors
- verification failures
- deletion workflow failures
- media provider failures
- readiness check
- database connectivity
- configuration validation
- no secret disclosure

For metrics, define an abstraction compatible with the current app without overengineering a monitoring stack that the repository does not yet use.

Return:
- files/modules
- request lifecycle
- readiness endpoint
- metric names
- logging integration
- tests

Do not implement yet.
```

40. **TASK-040 — Environment configuration validation**

```text
Create an implementation plan for startup configuration validation.

Requirements:
SRS-OPS-006
SRS-SEC-002
SRS-SEC-009
SRS-CON-010

Validate at least:
- DATABASE_URL
- access JWT secret
- refresh JWT/token secret material
- bcrypt work factor
- CORS origins
- environment
- ImageKit configuration when enabled
- cookie security configuration

The application must fail fast for missing required configuration.

Return:
- config schema
- environment-specific rules
- secret handling
- startup integration
- test cases

Do not implement yet.
```

41. **TASK-041 — Database indexes and query-performance review**

```text
Create an implementation plan for query/index performance against the SRS prototype targets.

Requirements:
SRS-PERF-001 through SRS-PERF-009

Inspect actual Prisma queries/schema.

Focus on indexes needed for:
- public place list
- public menus
- review lists
- own order list
- place order queue
- platformRole lookup
- OWNER membership lookup
- CASHIER membership lookup
- expired order scans
- idempotency cleanup

Do not introduce caching.

Return:
- current indexes
- missing/redundant indexes
- query patterns
- recommended schema/migration changes
- EXPLAIN/benchmark strategy
- risks

Do not implement yet.
```

42. **TASK-042 — Prototype load-test suite**

```text
Create an implementation plan for the prototype load-test suite.

Requirements:
SRS-PERF-001 through SRS-PERF-013
SRS-TST-006

Required scenarios:
- 25 RPS general API for 10 minutes
- 50 RPS burst for 1 minute
- 100 concurrent users for 10 minutes
- checkout at 5 RPS for at least 5 minutes

Pass conditions:
- error rate < 1%
- API p95 < 750 ms
- API p99 < 1.5 s
- no duplicate orders
- no invalid order-state transitions

Use an appropriate load-testing tool consistent with the repository/tooling.

Return:
- recommended tool
- test scenarios
- seed/test-data strategy
- metrics
- assertions
- environment assumptions
- how duplicate/inconsistent order state will be detected

Do not implement yet.
```

43. **TASK-043 — Authorization test matrix**

```text
Create an implementation plan specifically for automated authorization testing.

Requirements:
SRS-SEC-012
SRS-AUTHZ-017
SRS-TST-005
section 13 verification strategy

Create a matrix covering:
- USER
- CASHIER
- OWNER
- ADMIN
- SUPER_ADMIN
- inactive users

Must include:
- OWNER cross-place attempts
- CASHIER cross-place attempts
- ADMIN targeting SUPER_ADMIN security operations
- last SUPER_ADMIN
- last OWNER
- frontend-supplied permission bypass
- stale JWT role/permission claims
- revoked PlaceMember
- deactivated account with historical membership
- global permission vs membership permission
- 403 vs hidden 404 behavior

Return:
- unit-test cases
- integration-test cases
- E2E cases
- reusable fixtures
- priority/criticality

Do not implement yet.
```

44. **TASK-044 — Checkout concurrency and idempotency integration tests**

```text
Create an implementation plan for concurrency/integration tests around checkout.

Requirements:
SRS-ORD-009 through SRS-ORD-023
SRS-REL-002
SRS-PERF-009
SRS-TST-003

Test:
- same user + same idempotency key + same payload
- same user + same key + different payload
- simultaneous same-key requests
- orderCode collision retry
- cart changed during checkout
- menu price/availability changed before transaction
- dining table deactivated before transaction
- place closes before transaction
- transaction failure after order insert but before idempotency result
- transaction failure before cart clearing
- no duplicate order

Use real PostgreSQL integration tests where concurrency matters.

Return:
- test architecture
- scenarios
- expected outcomes
- concurrency orchestration
- database cleanup
- assertions

Do not implement yet.
```

45. **TASK-045 — Order-state concurrency integration tests**

```text
Create an implementation plan for concurrent order-state transition tests.

Requirements:
SRS-STS-006 through SRS-STS-012
SRS-REL-003 through SRS-REL-004

Test at minimum:
- simultaneous CONFIRM operations
- CONFIRM vs CANCEL
- PREPARE vs CANCEL
- READY vs CANCEL
- expiry boundary race
- scheduler expiry vs interactive transition
- repeated same transition
- terminal state mutation

Use a real PostgreSQL integration environment where appropriate.

Return:
- scenarios
- concurrency mechanism
- expected row state
- expected HTTP/service outcome
- assertions for timestamps
- cleanup strategy

Do not implement yet.
```

46. **TASK-046 — Backup, restore, RPO/RTO operational plan**

```text
Create an implementation plan for database backup/restore readiness.

Requirements:
SRS-REL-008
SRS-REL-010
SRS-REL-011
SRS-DATA-010
SRS-TST-004

Targets:
RPO <= 24 hours
RTO <= 4 hours

This is an operational implementation/documentation task, not application feature code.

Inspect the actual deployment documentation/environment in the repository first.

Return:
- backup strategy
- retention assumptions
- restore procedure
- test/verification procedure
- secrets/config needed
- failure scenarios
- documentation files to add/update
- evidence required for release gate

Do not invent a cloud provider if the repository does not establish one.
Do not implement yet.
```

47. **TASK-047 — CI release gates**

```text
Create an implementation plan for SRS release gates in CI.

Requirements:
SRS-TST-001 through SRS-TST-007
SRS-QLT-001 through SRS-QLT-007

CI should cover as appropriate:
- Prisma validation
- Prisma generation
- TypeScript build
- lint
- formatting/check
- unit tests
- integration tests
- critical E2E tests
- authorization matrix
- migration verification

Prototype load tests may run in a separate pipeline if unsuitable for every pull request.

Return:
- current CI assessment
- required jobs
- job ordering
- database service needs
- environment variables/secrets
- failure conditions
- proposed scripts
- files affected

Do not implement yet.
```

48. **TASK-048 — API specification synchronization**

```text
Create an implementation plan for keeping docs/api-specification synchronized with the implemented SRS v1.3 API.

Requirements:
SRS-API-009
SRS-API-010
SRS-QLT-007

Inspect:
- existing controllers
- existing api-specification docs
- SRS v1.3
- current implemented endpoints

Identify:
- missing API docs
- stale routes
- stale role terminology
- request/response mismatches
- missing error cases
- missing permission/scope requirements
- missing pagination behavior
- missing idempotency header/behavior
- missing authentication cookie behavior

Return:
- document-by-document update plan
- API contracts needing clarification
- stale documents to remove/update
- traceability back to SRS requirement IDs

Do not write the final documentation yet.
```

49. **TASK-049 — Update architecture documentation to SRS v1.3 authorization model**

```text
Create an implementation plan to update ARCHITECTURE.md so it no longer contradicts SRS v1.3.

SRS v1.3 is authoritative.

The architecture must use:

User.platformRole:
SUPER_ADMIN | ADMIN | USER

PlaceMember.role:
OWNER | CASHIER

Remove or correct obsolete architectural assumptions such as:
- UserRole / multiple persisted platform roles
- PlaceOwner
- building JWT payloads from all active roles
- OWNER as a platform role
- using role claims as authoritative privileged authorization state

Preserve valid architectural principles:
- NestJS modular monolith
- Controller -> Service -> Repository -> Prisma
- service-owned transactions
- feature module boundaries
- repositories as DB access layer
- common/lib dependency rules

Return:
- every stale section found
- replacement concepts
- sections requiring only terminology updates
- sections requiring behavioral changes
- proposed documentation edit order

Do not modify the file yet.
```

50. **TASK-050 — Final SRS implementation completeness audit**

```text
Perform a requirements-to-code implementation audit for Tooang SRS v1.3.

This task must be executed only after the primary feature tasks have been implemented.

Study every SRS requirement ID and inspect actual:
- source code
- Prisma schema/migrations
- tests
- API documentation
- configuration
- CI
- operational documentation

For every requirement classify it as:
IMPLEMENTED
PARTIALLY_IMPLEMENTED
NOT_IMPLEMENTED
NOT_APPLICABLE
REQUIRES_OPERATIONAL_VERIFICATION

For IMPLEMENTED requirements, provide concrete evidence:
- file
- class/function/schema/model/test
- relevant behavior

For partial/missing requirements:
- describe the exact gap
- create a small follow-up task
- estimate dependency ordering, not time

Pay special attention to:
- authorization
- tenant isolation
- account lifecycle
- checkout atomicity
- idempotency
- order concurrency
- retention
- ImageKit lifecycle
- auditing
- security redaction
- performance/reliability release gates

Do not implement fixes during this audit.

Output:
1. Requirement coverage table.
2. Critical release blockers.
3. High-priority gaps.
4. Non-blocking gaps.
5. Proposed follow-up task sequence.
```

### Recommended execution sequence

The 50 tasks are deliberately more granular than the SRS sections. I would execute them in these phases:

**Foundation:** TASK-001 → 005 → 002
**Authentication:** TASK-006 → 009
**Users:** TASK-010 → 012
**Places:** TASK-013 → 017
**Menus & media:** TASK-018 → 021
**Cart & checkout:** TASK-022 → 024
**Orders:** TASK-025 → 029
**Reviews:** TASK-030 → 032
**Cross-cutting infrastructure:** TASK-033 → 040
**Performance/testing/operations:** TASK-041 → 047
**Documentation and final verification:** TASK-048 → 050

The main reason for separating them this finely is that requests such as **“implement OrdersModule according to SRS”** are too broad for an IDE agent: they combine authorization, query scoping, state machines, checkout transactionality, idempotency, expiry, verification, and concurrency. Splitting those concerns gives the agent enough context to inspect the repository and generate a substantially more reliable implementation plan without attempting a large architectural rewrite.
