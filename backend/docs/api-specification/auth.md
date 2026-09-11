# Authentication API Specification

This document defines the version 1 authentication contract. All paths are relative to the
`/api/v1` API prefix. JSON requests must send `Content-Type: application/json`.

## Conventions

- Access tokens are sent as `Authorization: Bearer <accessToken>`.
- A token represents the user's public `userId` and all active roles in `roles`.
- `role` or `userId` values supplied by a client are never used as an authorization source.
- Soft-deleted users cannot authenticate or refresh a session.
- Password hashes and refresh tokens are never returned as user properties or written to logs.
- Refresh tokens are rotated on refresh and revoked on logout. Only a hash or another
  non-reversible representation of a refresh token is stored server-side.
- Token lifetime values are expressed in seconds.
- `RoleCode` is one of `SUPER_ADMIN`, `ADMIN`, `OWNER`, or `USER`. `ADMIN` has no implied
  `SUPER_ADMIN` privileges.

Successful responses use this envelope:

```json
{
  "error": false,
  "message": "ok",
  "data": {}
}
```

Error responses use this envelope:

```json
{
  "error": true,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

## Register

### Endpoint

`POST /api/v1/auth/register`

Authentication: Public.

### Request

```json
{
  "fullName": "Dian Erdiana",
  "email": "dian@example.com",
  "password": "correct-horse-battery-staple"
}
```

`fullName` is trimmed and `email` is trimmed and lowercased. The request must not accept a
role or user identifier. The user and initial `USER` role are created atomically.

### Response

- `201 Created` — user registered.
- `400 Bad Request` — request validation failed.
- `409 Conflict` — the email is already used by an active user, or conflicts with a retained
  soft-deleted user.

The response contains the safe user projection and a token pair. `userId` is the public user
identifier; the internal database primary key is not exposed.

### JSON example of response

```json
{
  "error": false,
  "message": "User registered",
  "data": {
    "user": {
      "userId": "usr_01K4J8X9P2Q7V6M3N5R0T1YABC",
      "fullName": "Dian Erdiana",
      "email": "dian@example.com",
      "roles": ["USER"],
      "createdAt": "2026-09-11T08:15:30.000Z",
      "updatedAt": "2026-09-11T08:15:30.000Z"
    },
    "tokens": {
      "tokenType": "Bearer",
      "accessToken": "<access-token>",
      "accessTokenExpiresIn": 900,
      "refreshToken": "<refresh-token>",
      "refreshTokenExpiresIn": 604800
    }
  }
}
```

## Login

### Endpoint

`POST /api/v1/auth/login`

Authentication: Public.

### Request

```json
{
  "email": "dian@example.com",
  "password": "correct-horse-battery-staple"
}
```

The email is trimmed and lowercased before lookup.

### Response

- `200 OK` — credentials are valid.
- `400 Bad Request` — request validation failed.
- `401 Unauthorized` — credentials are invalid, the user is soft-deleted, or the user has no
  active role.

The same generic `401` response must be used for an unknown email and an incorrect password
to avoid account enumeration.

### JSON example of response

```json
{
  "error": false,
  "message": "Login successful",
  "data": {
    "user": {
      "userId": "usr_01K4J8X9P2Q7V6M3N5R0T1YABC",
      "fullName": "Dian Erdiana",
      "email": "dian@example.com",
      "roles": ["USER", "OWNER"]
    },
    "tokens": {
      "tokenType": "Bearer",
      "accessToken": "<access-token>",
      "accessTokenExpiresIn": 900,
      "refreshToken": "<refresh-token>",
      "refreshTokenExpiresIn": 604800
    }
  }
}
```

## Refresh Token

### Endpoint

`POST /api/v1/auth/refresh`

Authentication: Valid refresh token in the request body; an access token is not required.

### Request

```json
{
  "refreshToken": "<refresh-token>"
}
```

### Response

- `200 OK` — a new access token and rotated refresh token are issued.
- `400 Bad Request` — request validation failed.
- `401 Unauthorized` — the refresh token is invalid, expired, reused, or revoked; or its user
  is soft-deleted or has no active role.

The service reloads the active user and all active roles before issuing the pair. A successfully
used refresh token is revoked atomically with creation of its replacement. Reuse of a rotated
token revokes the affected refresh-token family.

### JSON example of response

```json
{
  "error": false,
  "message": "Token refreshed",
  "data": {
    "tokens": {
      "tokenType": "Bearer",
      "accessToken": "<new-access-token>",
      "accessTokenExpiresIn": 900,
      "refreshToken": "<new-refresh-token>",
      "refreshTokenExpiresIn": 604800
    }
  }
}
```

## Logout

### Endpoint

`POST /api/v1/auth/logout`

Authentication: Bearer access token.

### Request

```json
{
  "refreshToken": "<refresh-token>"
}
```

The refresh token must belong to the authenticated user. Logging out revokes that refresh
session; already-issued access tokens remain valid until their short expiration time.

### Response

- `200 OK` — the refresh session is revoked. The operation is idempotent when the supplied
  refresh token has already been revoked.
- `400 Bad Request` — request validation failed.
- `401 Unauthorized` — the access token is missing or invalid, or the refresh token belongs
  to another user.

### JSON example of response

```json
{
  "error": false,
  "message": "Logout successful"
}
```

## Me

The current-user profile is owned by `UsersModule`, not `AuthModule`, but is included here as
part of the minimum authentication flow.

### Endpoint

`GET /api/v1/me`

Authentication: Bearer access token.

### Request

No path parameters, query parameters, or request body.

```http
Authorization: Bearer <access-token>
```

### Response

- `200 OK` — the active user's current profile and roles are returned.
- `401 Unauthorized` — the access token is missing or invalid, or the user is soft-deleted.

The user is loaded by the verified token identity. Profile and role data are reloaded from the
database rather than copied from the request or returned solely from JWT claims.

### JSON example of response

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

See [Users API Specification](users.md#current-user-profile) for the profile update contract.
