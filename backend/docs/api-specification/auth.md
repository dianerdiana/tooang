# Authentication API Specification

| Attribute | Value |
| --- | --- |
| Base path | `/api/v1/auth` |
| Content type | `application/json; charset=utf-8` |
| Authentication | Public endpoints; refresh and logout authenticate with the refresh cookie |
| Source of truth | [`software-requirement-specification.md`](../software-requirement-specification.md) and [`ARCHITECTURE.md`](../../ARCHITECTURE.md) |

This contract uses the SRS v1.3 authorization model: each user has one `platformRole` (`USER`, `ADMIN`, or `SUPER_ADMIN`). `OWNER` and `CASHIER` are place-membership roles and are not platform roles.

## Common contract

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
      "field": "email",
      "message": "Must be a valid email address"
    }
  ]
}
```

The API returns the access token in the response body and the refresh token only in a `refresh_token` cookie. The cookie is `HttpOnly`, `SameSite=Lax`, and has `Path=/api/v1/auth`. It is `Secure` in production and may be non-secure only for localhost development.

- Access-token lifetime: 15 minutes.
- Standard refresh-session lifetime: 30 days.
- Remember-me refresh-session lifetime: up to 90 days.
- Passwords are 8–128 Unicode characters. Password input is not trimmed or normalized.
- Emails are trimmed and normalized to lowercase before lookup or storage.
- Authentication responses never expose password hashes, refresh-token hashes, session IDs, token-family relationships, or internal database IDs.

## Register

### Endpoint

`POST /api/v1/auth/register`

Creates an active user with `platformRole = USER`. User creation and initial role assignment are atomic. Registration does not create a login session.

### Request

No authentication is required.

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `fullName` | string | Yes | Trimmed; 1–100 characters |
| `email` | string | Yes | Valid email; maximum 254 characters; normalized to lowercase |
| `password` | string | Yes | 8–128 Unicode characters; must not be a configured common password |

```json
{
  "fullName": "Dian Erdiana",
  "email": "DIAN@example.com",
  "password": "correct-horse-battery-staple"
}
```

### Response

| Status | Meaning |
| --- | --- |
| `201 Created` | User created |
| `400 Bad Request` | Invalid input or disallowed password |
| `409 Conflict` | Normalized email is already registered |
| `429 Too Many Requests` | Registration rate limit exceeded |

### JSON example of response

```json
{
  "error": false,
  "message": "Registration successful",
  "data": {
    "user": {
      "userId": "usr_01K4Y8Q9M4J7PV2Q8T6A3H5C1D",
      "fullName": "Dian Erdiana",
      "email": "dian@example.com",
      "platformRole": "USER",
      "createdAt": "2026-09-12T08:15:30.000Z",
      "updatedAt": "2026-09-12T08:15:30.000Z"
    }
  }
}
```

## Login

### Endpoint

`POST /api/v1/auth/login`

Validates credentials, returns a short-lived access token, and establishes a refresh session. Invalid credentials always produce the same response, whether or not the email exists.

Baseline rate limit: 10 attempts per 15 minutes per source IP, with progressively stricter throttling for repeated abuse.

### Request

No authentication is required.

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `email` | string | Yes | Valid email; normalized to lowercase |
| `password` | string | Yes | Exact value is used; not trimmed or normalized |
| `rememberMe` | boolean | No | Defaults to `false`; permits a refresh lifetime of up to 90 days |

```json
{
  "email": "dian@example.com",
  "password": "correct-horse-battery-staple",
  "rememberMe": false
}
```

### Response

On success, the response also includes a `Set-Cookie` header containing the opaque refresh token.

| Status | Meaning |
| --- | --- |
| `200 OK` | Authentication succeeded |
| `400 Bad Request` | Invalid request shape |
| `401 Unauthorized` | Invalid credentials or inactive/deleted/deletion-pending account |
| `429 Too Many Requests` | Login rate limit exceeded |

### JSON example of response

```json
{
  "error": false,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "userId": "usr_01K4Y8Q9M4J7PV2Q8T6A3H5C1D",
      "fullName": "Dian Erdiana",
      "email": "dian@example.com",
      "platformRole": "USER"
    }
  }
}
```

Example response cookie:

```http
Set-Cookie: refresh_token=<opaque-token>; Max-Age=2592000; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Lax
```

## Refresh token

### Endpoint

`POST /api/v1/auth/refresh`

Rotates the current refresh token and returns a new access token. Rotation revokes/replaces the current session atomically. Reuse of a previously rotated token revokes the affected token family.

### Request

The request has no JSON body. The client sends the `refresh_token` cookie automatically.

```http
Cookie: refresh_token=<opaque-token>
```

### Response

On success, `Set-Cookie` replaces the old refresh token with a newly rotated token while preserving the session's standard or remember-me lifetime policy.

| Status | Meaning |
| --- | --- |
| `200 OK` | Token rotated and new access token issued |
| `401 Unauthorized` | Cookie is missing, malformed, expired, revoked, unknown, reused, or belongs to an inactive account |
| `429 Too Many Requests` | Refresh rate limit exceeded |

### JSON example of response

```json
{
  "error": false,
  "message": "Token refreshed",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.NEW...",
    "tokenType": "Bearer",
    "expiresIn": 900
  }
}
```

## Logout

### Endpoint

`POST /api/v1/auth/logout`

Revokes the refresh session represented by the cookie and clears the cookie. An access token is not required, allowing logout when the access token has expired.

### Request

The request has no JSON body. When present, the `refresh_token` cookie identifies the session to revoke.

```http
Cookie: refresh_token=<opaque-token>
```

### Response

Logout is idempotent: a missing, expired, or already revoked cookie still returns success and clears the cookie. This does not make a stolen access token revocable; access tokens remain valid for at most their 15-minute lifetime, subject to current server-side user state checks.

| Status | Meaning |
| --- | --- |
| `200 OK` | Session revoked if present; cookie cleared |
| `429 Too Many Requests` | Logout rate limit exceeded |

### JSON example of response

```json
{
  "error": false,
  "message": "Logout successful"
}
```

Example response cookie:

```http
Set-Cookie: refresh_token=; Max-Age=0; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Lax
```
