# Pubflow Trust Layer Standard

Pubflow defines how trust flows through modern applications.

## Components

Flowless:

- The trust layer.
- Owns identity, sessions, OAuth, 2FA, password reset, verification, and session validation.
- Issues and validates session identity.
- Created and managed from Pubflow Platform.

Flowfull:

- The application backend.
- Owns business logic, database access, authorization, permissions, and app-specific rules.
- Trusts Flowless for identity through Bridge Validation.

Bridge Validation:

- Server-to-server session validation.
- Flowfull asks Flowless whether an opaque `session_id` is valid through `POST {FLOWLESS_URL}/auth/bridge/validate`.
- Flowfull sends the user's session in `X-Session-ID`.
- Flowfull sends the bridge validation secret in `X-Bridge-Secret`.

Client:

- Holds only an opaque `session_id`.
- Does not receive backend-only trust payloads.
- Uses frontend clients/helpers only to manage UI state and API calls.
- Authenticates with Flowless routes and stores the returned `sessionId` using local or secure storage.
- Sends the session to Flowfull APIs, usually as `X-Session-ID`.

## Portable Concepts

1. Bridge Validation: distributed auth protocol between Flowfull and Flowless.
2. Trust Session Tokens: opaque client session IDs validated backend-side.
3. Validation Modes: `standard`, `advanced`, and `strict`.
4. HybridCache: LRU, Redis, and database validation layers where available.
5. Auth Middleware: route-level protection for Flowfull endpoints.
6. Multi-Database Abstraction: app code should avoid unnecessary database lock-in.
7. Environment-Driven Config: behavior and secrets should come from env vars.

## Validation Modes

`standard`:

- Validates session and IP context.
- Good default for most protected app routes.

`advanced`:

- Adds device fingerprint checks.
- Good for account, billing, or organization routes.

`strict`:

- Adds user-agent and stricter context checks.
- Good for sensitive actions and admin routes.

## Security Principles

- Trust is validated server-side.
- Authorization stays in Flowfull.
- Secrets stay outside client code.
- Revocation should be immediate from Flowless.
- Frameworks differ; the standard stays the same.

## Mental Model

Use this sentence when reasoning:

The client presents an opaque session, Flowfull validates identity through Flowless, then Flowfull decides authorization.

For generated backends, wrap Bridge Validation in reusable middleware such as `optionalAuth`, `requireAuth`, `requireUserType`, and `requirePermission`.
