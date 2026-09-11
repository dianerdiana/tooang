# Users API Specification

This document defines the version 1 user-profile and role-management contract. All paths are
relative to the `/api/v1` API prefix. Authentication uses
`Authorization: Bearer <accessToken>`.

## Conventions

- URL parameters named `userId` contain `User.userId`, the public identifier. The internal
  `User.id` primary key is never exposed or accepted as a public identifier.
- User identity and actor roles come only from a verified access token.
- Active-data operations exclude users where `deletedAt` is not `null`.
- Responses never contain `passwordHash`, refresh tokens, or internal Prisma details.
- `RoleCode` is one of `SUPER_ADMIN`, `ADMIN`, `OWNER`, or `USER`. `ADMIN` has no implied
  permissions until its policy is defined.
- Only `SUPER_ADMIN` can list all users, inspect another user's private profile, change roles,
  or deactivate users.
- Role changes are audited with the actor, action, target, timestamp, and safe before/after
  values.

Successful responses use the following envelope. List responses additionally include `meta`.

```json
{
  "error": false,
  "message": "ok",
  "data": {}
}
```

Validation and domain errors use this envelope:

```json
{
  "error": true,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "fullName",
      "message": "Full name is required"
    }
  ]
}
```

## Current User Profile

### Get My Profile

#### Endpoint

`GET /api/v1/me`

Authentication: Any authenticated active user.

#### Request

No path parameters, query parameters, or request body.

```http
Authorization: Bearer <access-token>
```

#### Response

- `200 OK` — profile returned.
- `401 Unauthorized` — the access token is missing or invalid, or the user is soft-deleted.

#### JSON example of response

```json
{
  "error": false,
  "message": "User profile retrieved",
  "data": {
    "user": {
      "userId": "usr_01K4J8X9P2Q7V6M3N5R0T1YABC",
      "fullName": "Dian Erdiana",
      "email": "dian@example.com",
      "roles": ["USER", "OWNER"],
      "createdAt": "2026-09-11T08:15:30.000Z",
      "updatedAt": "2026-09-11T09:20:10.000Z"
    }
  }
}
```

### Update My Profile

#### Endpoint

`PATCH /api/v1/me`

Authentication: Any authenticated active user.

#### Request

At least one field is required. Omitted fields are unchanged. `email` is trimmed and
lowercased. Roles and identifiers are not accepted.

```json
{
  "fullName": "Dian E. Erdiana",
  "email": "dian.erdiana@example.com"
}
```

#### Response

- `200 OK` — profile updated.
- `400 Bad Request` — request validation failed or no editable field was supplied.
- `401 Unauthorized` — the access token is missing or invalid, or the user is soft-deleted.
- `409 Conflict` — the normalized email is already used or conflicts with a retained
  soft-deleted user.

Changing an email does not change `userId` or roles. Existing access-token claims may remain
stale until a refresh; authorization-sensitive operations reload roles from the database.

#### JSON example of response

```json
{
  "error": false,
  "message": "User profile updated",
  "data": {
    "user": {
      "userId": "usr_01K4J8X9P2Q7V6M3N5R0T1YABC",
      "fullName": "Dian E. Erdiana",
      "email": "dian.erdiana@example.com",
      "roles": ["USER", "OWNER"],
      "createdAt": "2026-09-11T08:15:30.000Z",
      "updatedAt": "2026-09-11T10:05:40.000Z"
    }
  }
}
```

## User Administration

All endpoints in this section require `SUPER_ADMIN`. The service reloads the actor's active
roles from the database before performing a sensitive operation.

### List Users

#### Endpoint

`GET /api/v1/users`

#### Request

Query parameters:

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `page` | integer | No | Page number, minimum `1`; default `1`. |
| `limit` | integer | No | Items per page, minimum `1`; bounded by the application maximum. |
| `search` | string | No | Case-insensitive search by full name or email. |
| `column` | string | No | Sort field: `createdAt`, `fullName`, or `email`; default `createdAt`. |
| `sort` | string | No | `asc` or `desc`; default `desc`. |

Example: `GET /api/v1/users?page=1&limit=20&search=dian&column=createdAt&sort=desc`

#### Response

- `200 OK` — paginated active users returned.
- `400 Bad Request` — query validation failed.
- `401 Unauthorized` — the access token is missing or invalid.
- `403 Forbidden` — the actor is not a `SUPER_ADMIN`.

#### JSON example of response

```json
{
  "error": false,
  "message": "Users retrieved",
  "data": {
    "users": [
      {
        "userId": "usr_01K4J8X9P2Q7V6M3N5R0T1YABC",
        "fullName": "Dian Erdiana",
        "email": "dian@example.com",
        "roles": ["USER", "OWNER"],
        "createdAt": "2026-09-11T08:15:30.000Z",
        "updatedAt": "2026-09-11T09:20:10.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "search": "dian",
    "column": "createdAt",
    "sort": "desc",
    "totalItems": 1,
    "totalPages": 1
  }
}
```

### Get User

#### Endpoint

`GET /api/v1/users/:userId`

#### Request

Path parameter:

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `userId` | string | Yes | Public user identifier. |

No query parameters or request body.

#### Response

- `200 OK` — active user returned.
- `400 Bad Request` — path parameter validation failed.
- `401 Unauthorized` — the access token is missing or invalid.
- `403 Forbidden` — the actor is not a `SUPER_ADMIN`.
- `404 Not Found` — the user does not exist or is soft-deleted.

#### JSON example of response

```json
{
  "error": false,
  "message": "User retrieved",
  "data": {
    "user": {
      "userId": "usr_01K4J8X9P2Q7V6M3N5R0T1YABC",
      "fullName": "Dian Erdiana",
      "email": "dian@example.com",
      "roles": ["USER", "OWNER"],
      "createdAt": "2026-09-11T08:15:30.000Z",
      "updatedAt": "2026-09-11T09:20:10.000Z"
    }
  }
}
```

### Assign Role

#### Endpoint

`POST /api/v1/users/:userId/roles`

#### Request

```json
{
  "role": "OWNER"
}
```

`userId` is the target user's public identifier. The role must already exist in the seeded
`Role` table. Assigning an existing role is idempotent.

#### Response

- `200 OK` — role assigned or already assigned.
- `400 Bad Request` — request or path validation failed.
- `401 Unauthorized` — the access token is missing or invalid.
- `403 Forbidden` — the actor is not a `SUPER_ADMIN`.
- `404 Not Found` — the active user or seeded role does not exist.

#### JSON example of response

```json
{
  "error": false,
  "message": "Role assigned",
  "data": {
    "user": {
      "userId": "usr_01K4J8X9P2Q7V6M3N5R0T1YABC",
      "roles": ["USER", "OWNER"]
    }
  }
}
```

### Revoke Role

#### Endpoint

`DELETE /api/v1/users/:userId/roles/:role`

#### Request

Path parameters:

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `userId` | string | Yes | Target user's public identifier. |
| `role` | `RoleCode` | Yes | Role to revoke. |

No query parameters or request body.

#### Response

- `200 OK` — role revoked.
- `400 Bad Request` — path parameter validation failed.
- `401 Unauthorized` — the access token is missing or invalid.
- `403 Forbidden` — the actor is not a `SUPER_ADMIN`.
- `404 Not Found` — the active user, seeded role, or assignment does not exist.
- `409 Conflict` — revocation would remove the user's last role, or attempts to remove `OWNER`
  while the user still has a `PlaceOwner` relationship.

The invariant check and deletion occur in one transaction. Active users always retain at least
one role.

#### JSON example of response

```json
{
  "error": false,
  "message": "Role revoked",
  "data": {
    "user": {
      "userId": "usr_01K4J8X9P2Q7V6M3N5R0T1YABC",
      "roles": ["USER"]
    }
  }
}
```

### Deactivate User

#### Endpoint

`DELETE /api/v1/users/:userId`

#### Request

`userId` is the target user's public identifier. There are no query parameters or request
body.

#### Response

- `200 OK` — `deletedAt` set and all refresh sessions revoked.
- `400 Bad Request` — path parameter validation failed.
- `401 Unauthorized` — the access token is missing or invalid.
- `403 Forbidden` — the actor is not a `SUPER_ADMIN`.
- `404 Not Found` — the active user does not exist.
- `409 Conflict` — deactivation would violate an ownership or another protected business
  invariant.

Deactivation is a soft delete. Historical order relationships are retained, and the user can
no longer log in, refresh tokens, review, modify carts, or create orders. Any related changes
and refresh-session revocation must be atomic.

#### JSON example of response

```json
{
  "error": false,
  "message": "User deactivated",
  "data": {
    "userId": "usr_01K4J8X9P2Q7V6M3N5R0T1YABC",
    "deletedAt": "2026-09-11T11:30:00.000Z"
  }
}
```
