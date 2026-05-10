# Bridge Validation

Bridge Validation is the trust validation flow between Flowfull and Flowless.

Flowfull receives an opaque `session_id` from the client, then validates it with Flowless.

Use:

```txt
POST {FLOWLESS_URL}/auth/bridge/validate
```

Headers:

```txt
X-Session-ID: <user-session-id>
X-Bridge-Secret: <BRIDGE_VALIDATION_SECRET>
```

`X-Session-ID` is the user's opaque session. `X-Bridge-Secret` is required for Bridge Validation. The recommended integration sends it from Flowfull/backend. Frontend or mobile usage should only be used when the project intentionally supports a public/client-side bridge validation flow.

## Required Inputs

- `session_id`: opaque session identifier read from cookie, request header, or framework session helper.
- `FLOWLESS_URL`: Flowless instance URL.
- `BRIDGE_VALIDATION_SECRET`: required bridge validation secret sent as `X-Bridge-Secret`.
- `validation_mode`: `standard`, `advanced`, or `strict`.

Optional request context:

- IP address.
- User agent.
- Device fingerprint.
- Route/action name.

## Env Contract

```bash
FLOWLESS_URL=https://your-flowless-instance.com
BRIDGE_VALIDATION_SECRET=replace-me
PUBFLOW_VALIDATION_MODE=standard
```

Optional:

```bash
PUBFLOW_SESSION_COOKIE=session_id
PUBFLOW_SESSION_HEADER=authorization
PUBFLOW_REQUEST_TIMEOUT_MS=5000
```

## Validation Flow

1. Extract `session_id`.
2. If missing on a required-auth route, return `401`.
3. Send `POST {FLOWLESS_URL}/auth/bridge/validate`.
4. Send `X-Session-ID`.
5. Send `X-Bridge-Secret`.
6. If invalid, return `401`.
7. If valid, attach auth context to the server-side request.
8. Continue to route handler.
9. Apply authorization in the handler/service.

## Suggested Request Shape

Use the official Flowless API contract when available. If implementing a bridge adapter, keep this shape in mind:

```json
{
  "validation_mode": "standard",
  "ip": "203.0.113.1",
  "user_agent": "Mozilla/5.0",
  "device_fingerprint": "optional"
}
```

Suggested headers:

```txt
X-Session-ID: <user-session-id>
X-Bridge-Secret: <BRIDGE_VALIDATION_SECRET>
Content-Type: application/json
```

Suggested success response:

```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "user_type": "admin"
  },
  "session": {
    "id": "session_prefix",
    "userId": "user_123",
    "expiresAt": "...",
    "ipAddress": "...",
    "userAgent": "...",
    "lastUsedAt": "...",
    "two_factor_verified": 1
  },
  "expires_at": "...",
  "cached": true,
  "cacheSource": "ultra | unified | db",
  "timestamp": "..."
}
```

Suggested failure response:

```json
{
  "success": false,
  "error": "Invalid session"
}
```

## Error Handling

Fail closed for required-auth routes.

- Missing session: `401`.
- Invalid session: `401`.
- Flowless unavailable: `503` or `401`, depending on product preference.
- Valid identity but insufficient permissions: `403`.

Use short timeouts and avoid blocking the app indefinitely.

## Caching

If the starter provides HybridCache, use it. If not:

- Cache only validated session results.
- Respect expiry and revocation behavior.
- Never cache failures too aggressively.
- Never cache by user ID alone; include session ID and validation mode.

## Security Rules

- Prefer keeping bridge secrets in Flowfull/backend code.
- Only expose a bridge secret to frontend/mobile code when the app intentionally uses a public/client-side validation design.
- Validation payload is server-only.
- Session ID is opaque.
- Authorization is not the same as authentication.

## Middleware Usage

Bridge Validation should usually be wrapped by middleware:

- `optionalAuth()`: validates if a session exists, otherwise continues as guest.
- `requireAuth()`: requires valid session.
- `requireUserType(types)`: requires valid session and matching `user_type`.
- `requirePermission(permission)`: requires valid session and app permission.
