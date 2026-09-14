# Tooang Backend Architecture

## 1. Purpose

The backend uses a NestJS- and Prisma-based **modular monolith**. Each business feature is placed in a feature module to keep responsibility boundaries clear while remaining simple to develop and deploy as a single application.

The standard architecture of a module follows the minimum pattern already used by `src/modules/auth`:

```text
HTTP request
    ↓
Controller
    ↓
Service
    ↓
Repository
    ↓
Prisma / PostgreSQL
```

Separate `use-case`, `domain entity`, `mapper`, or `repository interface` layers are unnecessary until the application's complexity requires them.

## 2. Responsibilities of Each Layer

### Controller

Controllers are responsible only for HTTP transport:

- Define routes, HTTP methods, status codes, and NestJS decorators.
- Obtain the authenticated user through decorators such as `@CurrentUser()`.
- Apply validation schemas through pipes.
- Call one or more service methods.
- Return responses prepared by the service.
- Do not access `PrismaService` or repositories directly.
- Do not contain business rules, ownership checks, or price calculations.

### Schema

`*.schema.ts` files contain Zod schemas and the types inferred from those schemas:

- Validate request bodies, parameters, and queries.
- Perform simple input normalization such as trimming, lowercasing email addresses, pagination, and number coercion.
- Do not query the database.
- Do not serve as the source of authorization rules.

Separate DTO classes are unnecessary if Zod schemas and inferred types already meet the requirements.

### Service

Services are the center of use cases and business rules:

- Check permissions, resource scope, and domain invariants.
- Coordinate the flow of a use case.
- Calculate prices and totals using `Prisma.Decimal`.
- Open transactions for operations that must be atomic.
- Determine status changes and side effects.
- Call repositories belonging to their own module or public services from other modules.
- Convert domain failures into appropriate NestJS exceptions.

Services must not trust `userId`, roles, prices, subtotals, or statuses submitted by the client.

### Repository

A repository is the feature module's sole regular database-access layer:

- Contains Prisma queries, filters, include/select clauses, pagination, and persistence logic.
- Has no knowledge of HTTP requests, responses, decorators, or transport exceptions.
- Does not make authorization decisions.
- Always applies the `deletedAt: null` filter to active-data queries.
- Provides methods tailored to service requirements rather than one-to-one wrappers for every Prisma method.
- May accept a Prisma transaction client so multiple operations can run within the same transaction.

Repositories may be bypassed only by infrastructure services that wrap Prisma, not by regular feature modules.

### Module

`*.module.ts` files are responsible for dependency wiring:

- Register the module's controllers, services, and repositories.
- Export services that serve as internal APIs for other modules.
- Do not export repositories unless there is a strong technical reason.
- Do not use `forwardRef` as the default solution; resolve circular dependencies by clarifying ownership of the use case.

## 3. Directory Structure

```text
backend/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── docs/
│   └── application-rules.md
├── src/
│   ├── common/
│   │   ├── auth/
│   │   ├── constants/
│   │   ├── decorators/
│   │   ├── guards/
│   │   ├── pipes/
│   │   └── responses/
│   ├── config/
│   ├── lib/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── places/
│   │   ├── menus/
│   │   ├── reviews/
│   │   ├── carts/
│   │   └── orders/
│   ├── app.module.ts
│   └── main.ts
├── test/
└── ARCHITECTURE.md
```

Minimum structure for each feature module:

```text
modules/places/
├── places.controller.ts
├── places.service.ts
├── places.repository.ts
├── places.schema.ts
└── places.module.ts
```

Add files only when they are genuinely needed, for example:

```text
modules/orders/
├── orders.controller.ts
├── orders.service.ts
├── orders.repository.ts
├── orders.schema.ts
├── orders.module.ts
└── order-code.service.ts       # Code generator that can be tested separately
```

Do not create `controllers`, `services`, or `repositories` directories within a module merely to hold a single file.

## 4. Feature Module Boundaries

### AuthModule

Responsibilities:

- Registration, login, token refresh, and logout when refresh tokens are stored server-side.
- Password hashing and verification through `BcryptHashingService`.
- JWT creation and verification through `UserJwtService`.
- Build identity-only access-token payloads; current roles and memberships are resolved server-side.

Auth does not manage profiles, role assignments, places, or place ownership.

### UsersModule

Responsibilities:

- User profiles.
- Singular `User.platformRole` updates by `SUPER_ADMIN`.
- User deactivation or soft deletion, including the last-active-SUPER_ADMIN invariant.

Platform roles are schema-defined values. Version 1 does not have dynamic roles or a `RolesModule`.

### PlacesModule

Responsibilities:

- Restaurant, cafe, or dining-place profiles.
- Publishing and `isOrderingEnabled` settings.
- OWNER and CASHIER assignments through `PlaceMember`.
- Business hours.
- Public place searches and details.
- Provide `PlaceAccessService` to check an OWNER's access to a `placeId`.

`PlaceAccessService` may be exported by `PlacesModule`. It accepts an authenticated user, target `placeId`, and permission. It allows an explicitly global ADMIN/SUPER_ADMIN permission or a current `PlaceMember` whose role grants the requested capability. Membership predicates are applied in the repository, and foreign-tenant resources are returned as not found.

### MenusModule

Responsibilities:

- Place-specific menu categories.
- Food and drink items.
- Availability, prices, images, and display order.
- Filtering by place, `FOOD`/`DRINK` type, and category.

Menu mutation use cases use `PlaceAccessService`. Categories and menu items belong in the same module because their lifecycles and validations are closely related.

### ReviewsModule

Responsibilities:

- Place reviews through `PlaceReview`.
- Food or drink reviews through `MenuItemReview`.
- Editing and soft-deleting a user's own reviews.
- Review moderation by `SUPER_ADMIN`.
- Calculating rating summaries.

Place and menu reviews do not need separate modules because their flows and access policies are the same.

### CartsModule

Responsibilities:

- User carts per place.
- Adding items, changing quantities and notes, and removing items.
- Ensure every item belongs to the same place as the cart.
- Display current prices and availability.

This module does not create orders. Checkout is the responsibility of `OrdersModule` because the final transaction produces the order aggregate.

### OrdersModule

Responsibilities:

- Checkout a cart into an order.
- Item snapshots and subtotal calculations.
- Generate `orderCode` and use `verificationToken` for QR codes/links.
- User order history.
- Per-place order queues for OWNER and CASHIER members, plus explicitly granted global administration.
- Order verification by cashiers.
- Status-transition validation and order expiry.

`OrdersService` coordinates checkout and may use public services from CartsModule/PlacesModule. Reloading all menu data, creating the order, and emptying the cart must occur within a single Prisma transaction.

## 5. Dependency Direction

Dependencies between modules must be unidirectional and kept to a minimum:

```text
Auth ───────────────→ Users
Menus ──────────────→ Places
Carts ──────────────→ Menus
Reviews ────────────→ Places / Menus
Orders ─────────────→ Carts / Menus / Places
```

Rules:

- Controllers call only services within the same module.
- Other modules use exported services, not internal repositories.
- Avoid large services that become a dumping ground for every feature.
- If two modules depend on each other, move the coordination to the module that owns the use case or extract a small, neutral helper.
- `common` and `lib` must not import feature modules.

In a simple implementation, the Orders repository may read cart/menu tables within the checkout transaction if doing so prevents circular dependencies. Business decisions and validation remain in `OrdersService`.

## 6. Common and Lib

### `src/common`

Contains framework-facing code that can be used across features:

- Authenticated user and role types.
- `@CurrentUser()` and `@Public()` decorators.
- Authentication and permission guards.
- Zod validation pipe.
- Response shapes and application constants.

Do not place business services, Prisma queries, or module-specific types in `common`.

### `src/lib`

Contains adapters for technologies or external services:

- `PrismaService`.
- `UserJwtService`.
- `BcryptHashingService`.
- `WinstonLoggerService`.

`LibModule` may be global if all its providers are genuinely used widely. Adapters must not make business decisions, such as whether an OWNER may modify a menu item.

## 7. Authentication and Authorization

Authentication and authorization are two distinct stages:

1. `JwtAuthGuard` verifies the token and attaches the authenticated user to the request.
2. `PermissionsGuard` checks code-defined platform permissions for endpoint-level access.
3. The service checks target-resource scope using current database state.

Example menu mutation flow:

```text
PATCH /places/:placeId/menu-items/:menuItemId
  → JwtAuthGuard
  → PermissionsGuard(menu.update)
  → MenusController
  → MenusService.updateMenuItem()
  → PlaceAccessService.assertPermission(actor, placeId, menu.update)
  → MenusRepository.updateOwnedMenuItem(placeId, menuItemId, data)
```

Access JWTs carry identity only. `JwtAuthGuard` reloads the active user and current `User.platformRole` on every protected request. Place-scoped services load the relevant current `PlaceMember` record for the target place. Token claims, request bodies, and frontend permission metadata are never authoritative for authorization.

## 8. Transaction Pattern

The service owns the transaction boundary. Repositories accept either a regular client or a transaction client:

```ts
type DbClient = PrismaService | Prisma.TransactionClient;

async createOrder(data: CreateOrderData, db: DbClient = this.prisma) {
  return db.order.create({ data });
}
```

Example checkout structure:

```ts
return this.prisma.$transaction(async (tx) => {
  const cart = await this.ordersRepository.findCheckoutCart(userId, cartId, tx);

  this.assertCartCanBeCheckedOut(cart);
  const totals = this.calculateTotals(cart.items);

  const order = await this.ordersRepository.createFromCart(cart, totals, tx);
  await this.ordersRepository.clearCart(cart.id, tx);

  return order;
});
```

Operations that must be atomic include:

- User registration with the default `User.platformRole = USER`.
- Place creation and initial `PlaceMember(role=OWNER)` assignment.
- Platform-role changes and membership changes after checking last-SUPER_ADMIN/last-OWNER invariants.
- Checkout, order-item snapshots, and cart clearing.
- Order-status transitions and their associated timestamps.
- Soft deletion/restoration that affects multiple records.

Do not perform HTTP calls or slow processes such as generating QR-code images inside a database transaction. The QR code can be generated from the token URL after the transaction completes.

## 9. Queries and Data Security

- Public endpoints return only places where `isPublished = true` and `deletedAt = null`.
- Public menu items must have `deletedAt = null`, `isAvailable = true`, and an active category.
- All list endpoints use pagination with a maximum limit.
- Use `select` for sensitive data so `passwordHash` and `verificationToken` are not exposed.
- Do not expose raw Prisma models as response contracts if those models contain internal fields.
- OWNER queries must be constrained by ownership relationships in the database instead of loading all data and filtering it in memory.
- Use conditional updates or transactions to prevent race conditions in order statuses.
- Ownership errors involving another tenant's entity are returned as `404 Not Found`.

For the complete business rules, refer to [`docs/application-rules.md`](docs/application-rules.md).

## 10. Responses and Errors

Use built-in NestJS exceptions consistently:

- `BadRequestException`: invalid input format or rules.
- `UnauthorizedException`: missing or invalid token.
- `ForbiddenException`: the role lacks the required global capability.
- `NotFoundException`: the entity does not exist, has been deleted, or belongs to another tenant.
- `ConflictException`: a unique-constraint or state-transition conflict.

A global exception filter may be added after the error format has been agreed upon. Do not catch every error in each controller. Known database errors are translated in the service or a shared helper; unknown errors are passed to the global handler and logger.

## 11. API Conventions

- API prefix: `/api/v1`.
- Resources use plural nouns and kebab-case.
- Places serve as the scope for resources managed by OWNERs.
- The `/me` endpoint is used for data belonging to the authenticated user.

Examples:

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/places
GET    /api/v1/places/:slug
PATCH  /api/v1/places/:placeId
GET    /api/v1/places/:placeId/menu-items
POST   /api/v1/places/:placeId/menu-items
POST   /api/v1/places/:placeId/reviews
GET    /api/v1/me/carts
POST   /api/v1/me/carts/:placeId/items
POST   /api/v1/me/orders
GET    /api/v1/me/orders
GET    /api/v1/places/:placeId/orders
PATCH  /api/v1/places/:placeId/orders/:orderId/status
GET    /api/v1/order-verifications/:token
```

## 12. Testing

Minimum testing for each module:

- Unit tests for service business rules and authorization.
- Unit tests for important valid and invalid schema inputs.
- Repository integration tests for ownership queries, soft deletion, and transactions.
- E2E tests for critical flows: registration/login, OWNER isolation, cart-to-order, QR verification, and status transitions.

Repositories and the database do not need to be mocked in integration tests. In service unit tests, repositories and public services from other modules may be mocked so business cases can be tested in isolation.

## 13. Recommended Implementation Order

1. Complete identity-only JWT authentication and current server-side principal resolution.
2. Implement UsersModule and singular platform-role administration.
3. Implement PlacesModule and `PlaceAccessService`.
4. Implement MenusModule.
5. Implement ReviewsModule.
6. Implement CartsModule.
7. Implement OrdersModule and the checkout transaction.
8. Add the order-expiry job, audit logging, and hardening after the primary flow is stable.

## 14. When to Evolve the Architecture

Consider additional layers or components only when there is a genuine need:

- Separate use-case classes if a service becomes too large or has too many dependencies.
- Add events/an outbox if external side effects must be reliable.
- Add caching when profiling shows that read queries have become a bottleneck.
- Split a module or service into another application only when scaling, deployment, or team-ownership requirements differ.

Until those conditions arise, `controller → service → repository` is the standard structure for this project.
