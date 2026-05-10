# Pubflow Architecture

Pubflow apps separate trust from business logic.

```txt
Client
  |
  | opaque session_id
  v
Flowfull backend
  |
  | POST /auth/bridge/validate
  | X-Session-ID + X-Bridge-Secret
  v
Flowless trust layer
  |
  | validated backend-only session context
  v
Flowfull backend
  |
  | authorized app response
  v
Client
```

## Layer Responsibilities

Client:

- Stores or sends `session_id`.
- Renders authenticated UI.
- Calls Flowfull APIs.
- May use optional Pubflow clients for frontend ergonomics.

Flowfull:

- Protects routes with middleware.
- Validates sessions through `POST {FLOWLESS_URL}/auth/bridge/validate`.
- Loads app data from the database.
- Applies authorization and permissions.
- Returns safe app responses to the client.

Flowless:

- Owns user identity and session validity.
- Handles login, logout, OAuth, 2FA, password reset, and verification.
- Validates sessions for Flowfull through Bridge Validation using `X-Session-ID`.
- Is created and managed from Pubflow Platform.

Frontend:

- Calls Flowless for login/register/session flows.
- Stores `sessionId` in the platform's selected local storage strategy.
- Sends session ID to Flowfull APIs, usually as `X-Session-ID`.
- Uses Flowfull clients where helpful, but does not own backend authorization.

## Common Request Types

Public route:

- No session required.
- May still use optional auth to customize response.

Optional-auth route:

- Accepts anonymous users.
- If `session_id` exists and validates, attaches auth context.
- Must still work without auth context.

Required-auth route:

- Requires valid session.
- Returns `401` when missing or invalid.
- Runs authorization after identity validation.

Sensitive route:

- Requires valid session.
- Uses `advanced` or `strict` validation.
- Often requires extra authorization or confirmation.

## Authorization Rule

Flowless proves identity. Flowfull decides access.

Examples:

- Flowless can say user `user_123` is valid.
- Flowfull decides whether `user_123` can edit project `project_456`.
- Flowfull decides org roles, ownership, feature permissions, billing permissions, and admin access.

## Middleware Rule

Flowfull routes should use reusable auth middleware:

- `optionalAuth()` for public routes with personalization.
- `requireAuth()` for logged-in users.
- `requireUserType()` for `user_type` role gates.
- `requirePermission()` for permission checks.
- `requireAdmin()` can be a convenience wrapper over `requireUserType(['admin', 'superadmin'])`.

## Anti-Patterns

- A frontend route guard as the only protection.
- Accidentally treating public frontend bridge validation env vars as hidden secrets.
- Using frontend bridge validation without an intentional public-client design.
- Copying Flowless session payload into localStorage.
- Treating a session ID as authorization by itself.
- Using one global auth check instead of route-level middleware.
