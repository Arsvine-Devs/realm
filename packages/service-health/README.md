# `@arsvine/service-health`

Shared live/ready health payload helpers for Arsvine services.

- `liveBody` / `readyBody` — JSON objects with `status` and `service`
- `liveJsonResponse` / `readyJsonResponse` — Web `Response` helpers with `Cache-Control: no-store`

Platform apps and Realm/Ripple health routes should use this package so Status monitors see a consistent shape. Path names may differ (`/health/*` vs Realm `/api/health/*`); payloads stay aligned.
