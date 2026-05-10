# Pubflow Core Context

Use this as the first source of truth when building Pubflow apps.

Docs:

- Pubflow: https://www.pubflow.com/docs
- Library: https://www.pubflow.com/library
- Flowfull docs: https://flowfull.dev/
- Flowless docs: https://flowless.dev/
- Flowfull clients: https://clients.flowfull.dev/
- Flowless 2FA: https://flowless.dev/api/two-factor
- Flowless Blog API: https://flowless.dev/api/blog

## Mental Model

Pubflow is the Trust Layer Standard.

- Flowless: managed trust/auth service created from Pubflow Platform.
- Flowfull: your backend, business logic, database, authorization.
- Frontend: authenticates with Flowless, stores `sessionId`, calls Flowfull.

Flow:

```txt
Frontend -> Flowless login/register -> sessionId
Frontend -> Flowfull API with X-Session-ID
Flowfull -> Flowless bridge validate
Flowfull -> authorize business action
```

## Flowless Frontend Auth

Common auth routes:

```txt
POST /auth/login
POST /auth/register
POST /auth/logout
GET  /auth/user/me
GET  /auth/validation
POST /auth/password-reset/request
POST /auth/password-reset/validate
POST /auth/password-reset/complete
```

Login response usually includes:

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
    "gender": null,
    "reference_id": null,
    "created_at": "...",
    "updated_at": "..."
  },
  "sessionId": "...",
  "expiresAt": "..."
}
```

Store `sessionId` with the app's platform strategy:

- Web: localStorage or cookies, depending on starter.
- React Native: AsyncStorage or SecureStore.
- SSR/Next: cookies when the app uses server-aware auth.

Authenticated Flowfull requests usually send:

```txt
X-Session-ID: <sessionId>
```

## Flowfull Bridge Validation

Flowfull validates sessions with Flowless:

```txt
POST {FLOWLESS_URL}/auth/bridge/validate
X-Session-ID: <sessionId>
X-Bridge-Secret: <BRIDGE_VALIDATION_SECRET>
```

Env:

```bash
FLOWLESS_URL=https://your-flowless-instance.com
BRIDGE_VALIDATION_SECRET=replace-me
FLOWFULL_API_URL=http://localhost:3001
PUBFLOW_VALIDATION_MODE=standard
```

Frontend env aliases:

```bash
VITE_FLOWLESS_URL=https://your-flowless-instance.com
VITE_FLOWFULL_API_URL=http://localhost:3001
VITE_BRIDGE_VALIDATION_SECRET=replace-me

EXPO_PUBLIC_FLOWLESS_URL=https://your-flowless-instance.com
EXPO_PUBLIC_FLOWFULL_API_URL=http://localhost:3001
EXPO_PUBLIC_BRIDGE_VALIDATION_SECRET=replace-me

NEXT_PUBLIC_FLOWLESS_URL=https://your-flowless-instance.com
NEXT_PUBLIC_FLOWFULL_API_URL=http://localhost:3001
NEXT_PUBLIC_BRIDGE_VALIDATION_SECRET=replace-me
```

Common bridge response:

```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "...",
    "user_type": "admin",
    "metadata": {}
  },
  "session": {
    "id": "...",
    "userId": "...",
    "expiresAt": "...",
    "two_factor_verified": 1
  },
  "expires_at": "...",
  "cached": true,
  "cacheSource": "ultra | unified | db",
  "timestamp": "..."
}
```

User may include these fields:

`id`, `email`, `name`, `last_name`, `user_name`, `user_type`, `picture`, `phone`, `is_verified`, `two_factor`, `lang`, `metadata`, `mobile`, `tmz`, `bio`, `dob`, `recovery_email`, `display_name`, `first_time`, `deleted_at`, `deletion_reason`, `gender`, `reference_id`, `created_at`, `updated_at`.

Flowfull does not need to cache bridge responses by default. Flowless is built for efficient high-volume validation. Add Flowfull-side caching only for a specific production requirement.

## Middleware To Generate

Do not scatter bridge calls in handlers. Wrap them in middleware/helpers:

```txt
optionalAuth()
requireAuth()
requireUserType(userType | userTypes[])
requirePermission(permission)
requireAdmin()
requireSuperadmin()
```

Semantics:

- `optionalAuth`: public route, attaches auth when session validates, otherwise guest.
- `requireAuth`: requires valid session, returns `401` if missing/invalid.
- `requireUserType`: checks `user.user_type`, returns `403` if not allowed.
- `requirePermission`: checks app permission or database rule.
- `requireAdmin`: usually `requireUserType(['admin', 'superadmin'])`.

Normalize auth context:

```ts
{
  user_id,
  user_type,
  email,
  session_id,
  session,
  is_guest,
  permissions
}
```

## Agent Rules

- Flowless proves identity; Flowfull decides authorization.
- Frontend route guards are UX, not security.
- Use `user_type` for simple roles and app/database checks for resource permissions.
- Prefer official starter patterns.
- Use Flowfull clients when helpful, but do not replace Flowfull authorization.
- `X-Bridge-Secret` is required for bridge validate. Prefer backend validation unless the project intentionally supports client-side bridge validation.
