# Business Hours API Specification

All routes are protected and scoped to an active place.

| Route                                             | Permission                            | Request                   | Success                     |
| ------------------------------------------------- | ------------------------------------- | ------------------------- | --------------------------- |
| `GET /api/v1/places/:placeId/business-hours`      | Target-place or global `place.read`   | No query/body             | `200`, `data.businessHours` |
| `PUT /api/v1/places/:placeId/business-hours/:day` | Target-place or global `place.update` | One strict day definition | `200`, `data.businessHour`  |

`:placeId` is a UUID and `:day` is `MONDAY` through `SUNDAY`. Closed input is `{ "isClosed": true }`, optionally with explicit null times. Open input is `{ "isClosed": false, "opensAt": "HH:mm", "closesAt": "HH:mm" }`; both 24-hour times are required and must differ.

The list always represents Monday through Sunday, so it is a fixed, intrinsically bounded collection rather than a paginated endpoint. Unconfigured days are returned as closed. Times use PostgreSQL `TIME(0)`; database instants remain UTC. Opening calculations convert the supplied instant into `Place.timezone`, are opening-inclusive/closing-exclusive, support overnight intervals, and do not use the server or client timezone.

Missing, deleted, foreign, or revoked membership scope returns hidden `404`; impossible capability paths return `403`; invalid days/times return `400`.

Traceability: SRS-HRS-001–008, SRS-PLC-014/022, SRS-API-003/006/007/009, and SRS-AUTHZ-004/008–011.
