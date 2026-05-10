# Flowfull Middleware

Flowfull backends should turn Bridge Validation into reusable route middleware.

The goal is that app routes never hand-roll auth logic. They use simple middleware helpers and then focus on business rules.

## Middleware Helpers

Recommended helpers:

```txt
optionalAuth()
requireAuth()
requireUserType(userType | userTypes[])
requirePermission(permission)
requireAdmin()
requireSuperadmin()
```

`requireAdmin()` and `requireSuperadmin()` can be convenience wrappers around `requireUserType()`.

Example:

```ts
const requireAdmin = () => requireUserType(['admin', 'superadmin']);
const requireSuperadmin = () => requireUserType('superadmin');
```

## Session Source

Middleware should resolve the user session from the project's chosen request pattern.

Common sources:

1. Header `X-Session-ID`.
2. Cookie `session_id`.
3. Query param `?session_id=` only when the app intentionally supports it.

Prefer `X-Session-ID` for API calls.

## Bridge Validate Call

Middleware validates through Flowless:

```txt
POST {FLOWLESS_URL}/auth/bridge/validate
X-Session-ID: <user-session-id>
X-Bridge-Secret: <BRIDGE_VALIDATION_SECRET>
```

Request body may include context:

```json
{
  "validation_mode": "standard",
  "ip": "203.0.113.1",
  "user_agent": "Mozilla/5.0",
  "device_fingerprint": "optional"
}
```

## Bridge Validate Response

Expected success shape:

```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "...",
    "name": "...",
    "last_name": "...",
    "user_name": "...",
    "user_type": "admin",
    "picture": null,
    "phone": null,
    "is_verified": 1,
    "two_factor": 0,
    "lang": null,
    "metadata": {},
    "mobile": null,
    "tmz": null,
    "bio": null,
    "dob": null,
    "recovery_email": null,
    "display_name": null,
    "first_time": 1,
    "deleted_at": null,
    "deletion_reason": null,
    "gender": null,
    "reference_id": null,
    "created_at": "...",
    "updated_at": "..."
  },
  "session": {
    "id": "session_prefix",
    "userId": "...",
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

Common user fields:

`id`, `email`, `name`, `last_name`, `user_name`, `user_type`, `picture`, `phone`, `is_verified`, `two_factor`, `lang`, `metadata`, `mobile`, `tmz`, `bio`, `dob`, `recovery_email`, `display_name`, `first_time`, `deleted_at`, `deletion_reason`, `gender`, `reference_id`, `created_at`, `updated_at`.

Middleware should normalize this into a framework-native auth context.

Recommended auth context:

```ts
type PubflowAuthContext = {
  user_id: string;
  user_type?: string;
  email?: string;
  session_id: string;
  session: unknown;
  is_guest: boolean;
  permissions?: string[];
};
```

## Caching Note

Flowfull does not need to cache the Bridge Validation response by default. Flowless is designed for high-volume, efficient validation and already has caching/optimization internally.

Only add Flowfull-side caching if a specific production requirement exists, and keep revocation/expiry correctness first.

## Middleware Semantics

`optionalAuth()`:

- If no session exists, continue as guest.
- If session exists and validates, attach auth context.
- If session exists but fails validation, continue as guest or clear session depending on app preference.
- Never block public content.

`requireAuth()`:

- Requires valid session.
- Returns `401` when no session exists or validation fails.
- Attaches auth context before handler.

`requireUserType(types)`:

- Requires valid session.
- Checks `user.user_type` or normalized auth context `user_type`.
- Returns `403` when authenticated but not allowed.

`requirePermission(permission)`:

- Requires valid session.
- Checks permissions from normalized context or app database.
- Returns `403` when missing permission.

## Route Examples

Public route:

```ts
app.get('/api/public/stats', handler);
```

Public with personalization:

```ts
app.get('/api/posts', optionalAuth(), handler);
```

Any logged-in user:

```ts
app.get('/api/me', requireAuth(), handler);
```

Admin route:

```ts
app.get('/api/admin/users', requireAdmin(), handler);
```

Specific user types:

```ts
app.get('/api/staff/reports', requireUserType(['admin', 'manager']), handler);
```

Permission route:

```ts
app.delete('/api/posts/:id', requirePermission('posts.delete'), handler);
```

## Agent Rules

- Generate middleware once, then reuse it.
- Do not scatter Bridge Validation calls across route handlers.
- Keep authorization in Flowfull, not the frontend.
- Use `user_type` for simple role gates.
- Use permissions or app database checks for fine-grained authorization.
- Prefer framework-native context: Hono context, FastAPI dependency return, Gin context, Phoenix assigns.
