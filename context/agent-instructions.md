# Pubflow Agent Instructions

Use this file as the compact source of truth when building or modifying Pubflow-based apps.

## Core Model

Pubflow is the Trust Layer Standard.

- Flowless answers: who is the user?
- Flowfull answers: what can the user do?
- Bridge Validation is the trust validation flow Flowfull uses to validate a session with Flowless.
- The client holds only an opaque `session_id`.
- Validated session payloads are backend-only and must not be exposed as client tokens.
- Flowless instances are created from the Pubflow Platform; Flowfull apps consume them.

## Bridge Validation Contract

Flowfull validates sessions against the configured Flowless base URL:

```txt
POST {FLOWLESS_URL}/auth/bridge/validate
```

Required header:

```txt
X-Session-ID: <user-session-id>
```

Required bridge header:

```txt
X-Bridge-Secret: <BRIDGE_VALIDATION_SECRET>
```

`X-Session-ID` carries the user's opaque session. `X-Bridge-Secret` carries the bridge validation secret required by Flowless for this route.

Recommended pattern: call Bridge Validation from Flowfull/backend. Frontend or mobile usage is possible only when the app intentionally exposes a public bridge validation flow and accepts that the header value is visible to clients.

## Required Behavior

When adding authentication or authorization:

1. Read `session_id` from a cookie, request header, or framework session helper.
2. Validate it from Flowfull to `{FLOWLESS_URL}/auth/bridge/validate`.
3. Send the session as `X-Session-ID`.
4. Send `X-Bridge-Secret` with `BRIDGE_VALIDATION_SECRET`.
5. Attach a server-side auth context to the request.
6. Authorize inside Flowfull routes/services using business rules.

When building a Flowfull backend:

1. Create reusable middleware helpers instead of validating sessions in every route.
2. Use `optionalAuth()` for public routes with personalization.
3. Use `requireAuth()` for any logged-in user.
4. Use `requireUserType()` or helpers like `requireAdmin()` for role gates based on `user_type`.
5. Use `requirePermission()` or app database checks for fine-grained authorization.

When building a frontend:

1. Authenticate against Flowless routes such as `/auth/login` or `/auth/register`.
2. Store the returned `sessionId` using the platform's local storage strategy.
3. Send the session ID to Flowfull on authenticated requests, usually as `X-Session-ID`.
4. Let Flowfull validate and authorize.

## Never Do This

- Do not replace Pubflow sessions with JWT auth.
- Do not store validated trust payloads in localStorage.
- Do not accidentally leak bridge secrets into browser or mobile code.
- Do not hardcode bridge secrets.
- Do not make frontend authorization the only protection.
- Do not mix Trust Session Tokens with Trust Tokens.
- Do not expose `BRIDGE_VALIDATION_SECRET` or `X-Bridge-Secret` to frontend bundles unless the project explicitly uses a public/client-side bridge validation design.
- Do not put role or permission enforcement only in frontend route guards.

## Prefer This

- Use official starter-kit patterns first.
- Keep middleware small and reusable.
- Use framework-native request context.
- Put secrets in env vars.
- Fail closed when auth validation is unavailable.
- Keep public, optional-auth, and required-auth routes explicit.

## Token Vocabulary

- Trust Session Token: session mechanism. The browser/client gets an opaque `session_id`; Flowfull validates it with Flowless.
- Trust Token: single-use PASETO action token for sensitive flows like email verification, password reset, magic links, or invitations.

Do not use these terms interchangeably.

## Output Style For Agents

When generating Pubflow code:

- State which layer is being modified: client, Flowfull, or Flowless.
- Name required env vars.
- Include a short route/middleware usage example.
- Mention security assumptions if the exact Flowless endpoint contract is not available.
