# Readiness API Specification

`GET /api/v1/health/ready` is public and accepts no parameters or body. It verifies critical configuration access and PostgreSQL connectivity without returning configuration values, connection strings, credentials, or database details.

Ready response (`200 OK`):

```json
{
  "error": false,
  "message": "Service is ready",
  "data": {
    "status": "ok",
    "checks": { "configuration": "up", "database": "up" }
  }
}
```

Failure response (`503 Service Unavailable`):

```json
{
  "error": true,
  "message": "Service is not ready",
  "code": "SERVICE_NOT_READY"
}
```

The detailed failure remains in secure server logs. Readiness is not an authorization or liveness endpoint and must not expose secrets.

Traceability: SRS-REL-009, SRS-OPS-005–007, SRS-API-003/008/009, and SRS-SEC-003/006.
