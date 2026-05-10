# Flowless Auth Routes

Flowless is created and managed from the Pubflow Platform. It provides authentication, session lifecycle, password recovery, verification, and bridge validation APIs.

Base URL:

```txt
{FLOWLESS_URL}
```

Base auth path:

```txt
/auth
```

Useful docs:

- Flowless docs: https://flowless.dev/
- Flowless API reference: https://flowless.dev/api-reference
- Two-factor API: https://flowless.dev/api/two-factor
- Blog API: https://flowless.dev/api/blog
- Pubflow platform: https://platform.pubflow.com

## Frontend Auth Flow

Frontend apps authenticate against Flowless, receive a session ID, store it locally, then send it to Flowfull APIs.

Common storage:

- Web: localStorage or app-selected browser storage.
- React Native: AsyncStorage, SecureStore, or app-selected local storage.
- SSR frameworks: cookies when the starter/client uses cookie-based sessions.

After login/register:

1. Call Flowless auth route.
2. Read `sessionId` from the response.
3. Store the session ID using the platform's storage strategy.
4. Send the session ID to Flowfull on authenticated requests, usually as `X-Session-ID`.
5. Flowfull validates it with Flowless through Bridge Validation.

## Common Routes

### `POST /auth/login`

Password login by email or username.

Body:

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

or:

```json
{
  "userName": "john_doe",
  "password": "secret123"
}
```

Success response:

```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "...",
    "name": "...",
    "last_name": "...",
    "user_name": "...",
    "user_type": "...",
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
  "sessionId": "...",
  "expiresAt": "..."
}
```

Common user fields:

`id`, `email`, `name`, `last_name`, `user_name`, `user_type`, `picture`, `phone`, `is_verified`, `two_factor`, `lang`, `metadata`, `mobile`, `tmz`, `bio`, `dob`, `recovery_email`, `display_name`, `first_time`, `deleted_at`, `deletion_reason`, `gender`, `reference_id`, `created_at`, `updated_at`.

Many of these can be provided during account creation or updated through profile routes such as `PUT /auth/user/me`, depending on Flowless configuration and field permissions.

If 2FA is required:

```json
{
  "success": false,
  "requires_2fa": true,
  "session_id": "...",
  "available_methods": [
    { "id": "...", "method": "email", "status": "active" }
  ],
  "message": "Two-factor authentication required",
  "user": {
    "id": "...",
    "email": "..."
  }
}
```

The client must complete the 2FA flow before treating the session as fully authenticated.

### `POST /auth/register`

Self-registration.

Body:

```json
{
  "email": "user@example.com",
  "password": "secret123",
  "name": "John",
  "lastName": "Doe",
  "userName": "johndoe"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "...",
      "name": "...",
      "userType": "...",
      "isVerified": 0
    },
    "sessionId": "...",
    "expiresAt": "..."
  }
}
```

### `POST /auth/logout`

Destroys the session and clears the session cookie when cookies are used.

### `GET /auth/user/me`

Preferred current-user route.

Requires a valid session.

Response:

```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "...",
    "name": "...",
    "last_name": "...",
    "user_name": "...",
    "user_type": "...",
    "picture": null,
    "is_verified": 1,
    "two_factor": 0
  }
}
```

Common editable profile fields include:

`name`, `last_name`, `email`, `picture`, `user_name`, `phone`, `two_factor`, `lang`, `metadata`, `mobile`, `tmz`, `bio`, `dob`, `recovery_email`, `display_name`, `first_time`, `gender`, `reference_id`.

### `GET /auth/validation`

Validates the current session directly with Flowless.

Accepts session from:

- Cookie `session_id`.
- Header `X-Session-ID`.

Response:

```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "...",
    "user_type": "..."
  },
  "session": {
    "two_factor_verified": 1
  }
}
```

### Password Reset

Request reset email:

```txt
POST /auth/password-reset/request
```

Body:

```json
{ "email": "user@example.com" }
```

Validate token:

```txt
POST /auth/password-reset/validate
```

Body:

```json
{ "token": "..." }
```

Complete reset:

```txt
POST /auth/password-reset/complete
```

Body:

```json
{
  "token": "...",
  "password": "newpassword123"
}
```

## Social Login

Flowless supports social authentication providers. Use the official Flowless docs/API reference for the current provider-specific routes and parameters.

Common providers include Google, Facebook, GitHub, Twitter/X, and LinkedIn.
