# Users API Specification

| Attribute | Value |
| --- | --- |
| Base paths | `/api/v1/me` and `/api/v1/users` |
| Content type | `application/json; charset=utf-8` |
| Authentication | `Authorization: Bearer <access-token>` |
| Source of truth | [`software-requirement-specification.md`](../software-requirement-specification.md) and [`ARCHITECTURE.md`](../../ARCHITECTURE.md) |

This contract follows the SRS v1.3 authorization model. `platformRole` is exactly one of `USER`, `ADMIN`, or `SUPER_ADMIN`. Place authority is represented separately in `placeMemberships`, whose role is `OWNER` or `CASHIER`. Role and permission values returned to clients are capability metadata, never proof of authorization.

## Common contract

All endpoints require a valid access token and current active server-side user state. Timestamps are UTC ISO 8601 strings. Public identifiers use `userId`; internal database IDs are never returned.

Successful responses use this envelope:

```json
{
  "error": false,
  "message": "Human-readable message",
  "data": {}
}
```

Errors use this envelope. Validation errors may include field-level `details`.

```json
{
  "error": true,
  "message": "Request validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "fullName",
      "message": "Must contain at least 1 character"
    }
  ]
}
```

Common failures are `401 Unauthorized` for missing/invalid authentication, `403 Forbidden` for insufficient global permission, `404 Not Found` for an absent/inactive resource, and `409 Conflict` for uniqueness or domain-invariant conflicts.

## Get my profile

### Endpoint

`GET /api/v1/me`

Returns the authenticated user's current profile, authoritative platform role, effective platform permissions, and active place memberships.

### Request

No path parameters, query parameters, or body.

```http
Authorization: Bearer <access-token>
```

### Response

| Status | Meaning |
| --- | --- |
| `200 OK` | Active profile returned |
| `401 Unauthorized` | Token is missing/invalid or account is inactive/deletion-pending |

### JSON example of response

```json
{
  "error": false,
  "message": "Profile retrieved",
  "data": {
    "user": {
      "userId": "usr_01K4Y8Q9M4J7PV2Q8T6A3H5C1D",
      "fullName": "Dian Erdiana",
      "email": "dian@example.com",
      "platformRole": "USER",
      "permissions": [
        "profile.read",
        "profile.update",
        "account.deletion.request",
        "cart.manage",
        "order.checkout",
        "order.read",
        "order.cancel",
        "review.create",
        "review.update",
        "review.delete"
      ],
      "placeMemberships": [
        {
          "placeId": "plc_01K4Y9A83K2Q7FJ5C8VW1M6N0P",
          "role": "OWNER",
          "permissions": [
            "order.read",
            "order.cancel",
            "order.confirm",
            "order.prepare",
            "order.ready",
            "order.complete",
            "place.read",
            "place.update",
            "place.publish",
            "place.delete",
            "table.read",
            "table.create",
            "table.update",
            "table.delete",
            "menu.create",
            "menu.update",
            "menu.delete",
            "place_member.read",
            "cashier.assign",
            "cashier.revoke",
            "media.upload",
            "media.delete"
          ]
        }
      ],
      "createdAt": "2026-08-20T04:10:00.000Z",
      "updatedAt": "2026-09-12T08:20:00.000Z"
    }
  }
}
```

## Update my profile

### Endpoint

`PATCH /api/v1/me`

Updates supported fields on the authenticated user's profile. Omitted fields remain unchanged. Clients cannot update `userId`, `platformRole`, permissions, memberships, or lifecycle fields here.

### Request

At least one field is required.

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `fullName` | string | No | Trimmed; 1–100 characters |
| `email` | string | No | Valid email; maximum 254 characters; normalized to lowercase |

```json
{
  "fullName": "Dian E. Erdiana",
  "email": "dian.erdiana@example.com"
}
```

### Response

| Status | Meaning |
| --- | --- |
| `200 OK` | Profile updated |
| `400 Bad Request` | Invalid or empty update body |
| `401 Unauthorized` | Authentication failed |
| `409 Conflict` | Normalized email is already used by another account |

### JSON example of response

```json
{
  "error": false,
  "message": "Profile updated",
  "data": {
    "user": {
      "userId": "usr_01K4Y8Q9M4J7PV2Q8T6A3H5C1D",
      "fullName": "Dian E. Erdiana",
      "email": "dian.erdiana@example.com",
      "platformRole": "USER",
      "createdAt": "2026-08-20T04:10:00.000Z",
      "updatedAt": "2026-09-12T08:24:10.000Z"
    }
  }
}
```

## Request deletion of my account

### Endpoint

`POST /api/v1/me/account-deletion-requests`

Creates or returns the authenticated user's deletion-pending request. It does not hard-delete the database record. Acceptance immediately blocks login and protected access and atomically revokes active refresh sessions. Required anonymization/removal follows the retention policy and completes within 30 days.

### Request

No body is required. The operation is idempotent; retrying after acceptance does not create another request.

```http
Authorization: Bearer <access-token>
```

### Response

| Status | Meaning |
| --- | --- |
| `202 Accepted` | New or existing deletion request accepted |
| `401 Unauthorized` | Authentication failed |
| `409 Conflict` | User is the only active OWNER of an active place or another lifecycle invariant prevents deletion |

### JSON example of response

```json
{
  "error": false,
  "message": "Account deletion request accepted",
  "data": {
    "userId": "usr_01K4Y8Q9M4J7PV2Q8T6A3H5C1D",
    "status": "DELETION_PENDING",
    "deletionRequestedAt": "2026-09-12T08:30:00.000Z"
  }
}
```

## List users

### Endpoint

`GET /api/v1/users`

Returns active users for platform-support workflows. Requires `user.read`, available to `ADMIN` and `SUPER_ADMIN`. The query is bounded and evaluated in the database.

### Request

| Query parameter | Type | Required | Default | Rules |
| --- | --- | --- | --- | --- |
| `page` | integer | No | `1` | Minimum `1` |
| `limit` | integer | No | `20` | `1`–`100` |
| `search` | string | No | — | Matches normalized email or full name; maximum 100 characters |
| `platformRole` | enum | No | — | `USER`, `ADMIN`, or `SUPER_ADMIN` |
| `sortBy` | enum | No | `createdAt` | `createdAt`, `fullName`, or `email` |
| `sortOrder` | enum | No | `desc` | `asc` or `desc` |

```http
GET /api/v1/users?page=1&limit=20&platformRole=USER&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <access-token>
```

### Response

| Status | Meaning |
| --- | --- |
| `200 OK` | Page returned |
| `400 Bad Request` | Invalid query |
| `401 Unauthorized` | Authentication failed |
| `403 Forbidden` | Actor lacks `user.read` |

### JSON example of response

```json
{
  "error": false,
  "message": "Users retrieved",
  "data": {
    "users": [
      {
        "userId": "usr_01K4Y8Q9M4J7PV2Q8T6A3H5C1D",
        "fullName": "Dian Erdiana",
        "email": "dian@example.com",
        "platformRole": "USER",
        "createdAt": "2026-08-20T04:10:00.000Z",
        "updatedAt": "2026-09-12T08:20:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

## Get a user

### Endpoint

`GET /api/v1/users/{userId}`

Returns one active user. Requires `user.read`, available to `ADMIN` and `SUPER_ADMIN`.

### Request

| Path parameter | Type | Required | Rules |
| --- | --- | --- | --- |
| `userId` | string | Yes | Public user identifier |

No body or query parameters.

### Response

| Status | Meaning |
| --- | --- |
| `200 OK` | User returned |
| `401 Unauthorized` | Authentication failed |
| `403 Forbidden` | Actor lacks `user.read` |
| `404 Not Found` | Active user does not exist |

### JSON example of response

```json
{
  "error": false,
  "message": "User retrieved",
  "data": {
    "user": {
      "userId": "usr_01K4Y8Q9M4J7PV2Q8T6A3H5C1D",
      "fullName": "Dian Erdiana",
      "email": "dian@example.com",
      "platformRole": "USER",
      "createdAt": "2026-08-20T04:10:00.000Z",
      "updatedAt": "2026-09-12T08:20:00.000Z"
    }
  }
}
```

## Change a user's platform role

### Endpoint

`PUT /api/v1/users/{userId}/platform-role`

Sets the user's single platform role. Requires `platform_role.update` and is restricted to `SUPER_ADMIN`. The service reloads current server-side state and enforces the last-active-SUPER_ADMIN invariant. Place memberships are unaffected.

### Request

| Field | Location | Type | Required | Rules |
| --- | --- | --- | --- | --- |
| `userId` | Path | string | Yes | Public user identifier |
| `platformRole` | Body | enum | Yes | `USER`, `ADMIN`, or `SUPER_ADMIN` |

```json
{
  "platformRole": "ADMIN"
}
```

### Response

Setting the role to its current value is idempotent and returns `200 OK`. The mutation and audit record are committed atomically when feasible.

| Status | Meaning |
| --- | --- |
| `200 OK` | Role set, or already had requested value |
| `400 Bad Request` | Unsupported role or invalid request |
| `401 Unauthorized` | Authentication failed |
| `403 Forbidden` | Actor is not authorized to change platform roles |
| `404 Not Found` | Active user does not exist |
| `409 Conflict` | Change would violate the last-active-SUPER_ADMIN or another invariant |

### JSON example of response

```json
{
  "error": false,
  "message": "Platform role updated",
  "data": {
    "user": {
      "userId": "usr_01K4Y8Q9M4J7PV2Q8T6A3H5C1D",
      "fullName": "Dian Erdiana",
      "email": "dian@example.com",
      "platformRole": "ADMIN",
      "createdAt": "2026-08-20T04:10:00.000Z",
      "updatedAt": "2026-09-12T08:40:00.000Z"
    }
  }
}
```

## Deactivate a user

### Endpoint

`DELETE /api/v1/users/{userId}`

Soft-deactivates an eligible account and revokes all active refresh sessions atomically. The record is not hard-deleted. The action is audited.

- `ADMIN` may deactivate only a user whose current `platformRole` is `USER`.
- `SUPER_ADMIN` may deactivate eligible `USER`, `ADMIN`, or `SUPER_ADMIN` accounts, but cannot deactivate the last active `SUPER_ADMIN`.
- Current role and lifecycle state are loaded from the server; token claims and client-supplied roles are not authoritative.

### Request

| Path parameter | Type | Required | Rules |
| --- | --- | --- | --- |
| `userId` | string | Yes | Public user identifier |

No body or query parameters.

### Response

| Status | Meaning |
| --- | --- |
| `200 OK` | Account deactivated and sessions revoked |
| `401 Unauthorized` | Authentication failed |
| `403 Forbidden` | Actor cannot deactivate the target account |
| `404 Not Found` | Active user does not exist |
| `409 Conflict` | Deactivation would violate the last-active-SUPER_ADMIN or another invariant |

### JSON example of response

```json
{
  "error": false,
  "message": "User deactivated",
  "data": {
    "userId": "usr_01K4Y8Q9M4J7PV2Q8T6A3H5C1D",
    "deletedAt": "2026-09-12T08:45:00.000Z"
  }
}
```
