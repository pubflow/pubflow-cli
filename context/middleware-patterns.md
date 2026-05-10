# Middleware Patterns

This file gives framework-shaped patterns for Pubflow Bridge Validation.

The exact Flowless endpoint may differ by implementation. Keep the architecture unchanged.

## Common Helpers

Every backend should have equivalents of:

- `validateSession(sessionId, context)`
- `requireAuth(...)`
- `optionalAuth(...)`
- `getAuthContext(...)`
- `requireUserType(...)`
- `requirePermission(...)`
- `requireAdmin(...)`

The middleware should attach a server-side auth context, not expose the validated payload to the client.

## Node / TypeScript

Use for Bun, Express-like servers, Hono-like servers, or custom HTTP handlers.

```ts
type PubflowAuth = {
  userId: string;
  email?: string;
  sessionId: string;
  mode: 'standard' | 'advanced' | 'strict';
};

async function validateSession(sessionId: string, request: Request): Promise<PubflowAuth | null> {
  const response = await fetch(`${process.env.FLOWLESS_URL}/auth/bridge/validate`, {
    method: 'POST',
    headers: {
      'x-session-id': sessionId,
      'x-bridge-secret': process.env.BRIDGE_VALIDATION_SECRET ?? '',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      validation_mode: process.env.PUBFLOW_VALIDATION_MODE ?? 'standard',
      user_agent: request.headers.get('user-agent'),
    }),
  });

  if (!response.ok) return null;
  const result = await response.json();
  if (!result.success) return null;

  return {
    userId: result.user.id,
    email: result.user.email,
    userType: result.user.user_type,
    sessionId: result.session.id,
    mode: process.env.PUBFLOW_VALIDATION_MODE ?? 'standard',
  };
}
```

Implementation notes:

- Read session from cookie first, then authorization header if the app supports it.
- Send the user session to Flowless as `X-Session-ID`.
- Send `X-Bridge-Secret` with `BRIDGE_VALIDATION_SECRET`.
- Validate env vars at startup.
- Add `auth` to framework-native context.
- Return `401` before route logic when auth is required.

## Python / FastAPI

Good shape:

```py
from fastapi import Depends, HTTPException, Request

async def require_auth(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    auth = await validate_session(session_id, request)
    if not auth:
        raise HTTPException(status_code=401, detail="Invalid session")

    return auth
```

Route usage:

```py
@router.get("/me")
async def me(auth = Depends(require_auth)):
    return {"user_id": auth["user_id"]}
```

Implementation notes:

- Use `httpx` or the starter's existing HTTP client.
- Keep bridge secret in server env.
- Use dependencies for required auth.
- Use a separate dependency for optional auth.

## Go / Gin

Good shape:

```go
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionID, err := c.Cookie("session_id")
		if err != nil || sessionID == "" {
			c.AbortWithStatusJSON(401, gin.H{"error": "authentication_required"})
			return
		}

		auth, err := ValidateSession(c.Request.Context(), sessionID, c.Request)
		if err != nil || auth == nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "invalid_session"})
			return
		}

		c.Set("pubflowAuth", auth)
		c.Next()
	}
}
```

Route usage:

```go
router.GET("/me", RequireAuth(), MeHandler)
```

Role route:

```go
router.GET("/admin/users", RequireUserType("admin"), AdminUsersHandler)
```

Implementation notes:

- Store auth context in `gin.Context`.
- Return `403` from handlers/services for authorization failures.
- Keep validation timeout short.

## Elixir / Phoenix

Good shape:

```elixir
defmodule MyAppWeb.Plugs.RequireAuth do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    session_id = conn.req_cookies["session_id"]

    case MyApp.Pubflow.validate_session(session_id, conn) do
      {:ok, auth} ->
        assign(conn, :pubflow_auth, auth)

      {:error, _reason} ->
        conn
        |> put_resp_content_type("application/json")
        |> send_resp(401, ~s({"error":"authentication_required"}))
        |> halt()
    end
  end
end
```

Router usage:

```elixir
pipeline :authenticated do
  plug MyAppWeb.Plugs.RequireAuth
end
```

Implementation notes:

- Use assigns for auth context.
- Use plugs/pipelines for route-level protection.
- Keep authorization in contexts or controllers.

## Authorization Pattern

After authentication:

```txt
auth.user_id exists
load resource
check ownership/role/permission
allow or return 403
```

Never assume a valid session means access to every resource.

## Role Helpers

Create thin helpers when the project has common roles:

```ts
const requireAdmin = () => requireUserType(['admin', 'superadmin']);
const requireSuperadmin = () => requireUserType('superadmin');
```

Use `user_type` for simple role gates and permissions/app database checks for resource-specific authorization.
