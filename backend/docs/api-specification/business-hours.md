# Business Hours API Specification

- `GET /api/v1/places/:placeId/business-hours` requires target-place `place.read`. CASHIER can read hours for an active assigned place.
- `PUT /api/v1/places/:placeId/business-hours/:day` requires target-place `place.update` and upserts one `MONDAY` through `SUNDAY` record.

Closed input is `{ "isClosed": true }`, with optional explicit null times. Open input is `{ "isClosed": false, "opensAt": "HH:mm", "closesAt": "HH:mm" }`; both times are required and unequal. An unconfigured day is represented as closed. Responses are ordered Monday through Sunday.

Times are stored using PostgreSQL `TIME(0)`. The place timezone is an IANA identifier; database instants remain UTC. Opening state converts a supplied UTC instant into place-local weekday and wall time with Node 22 `Intl.DateTimeFormat`. Intervals are opening-inclusive and closing-exclusive, including overnight carry into the following day. DST gaps and repeated times follow instant-to-local-time conversion and do not depend on the server timezone.
