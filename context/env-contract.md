# Pubflow Env Contract

Use env vars for all Pubflow connection details, secrets, validation modes, and runtime behavior.

## Required Backend Env Vars

```bash
FLOWLESS_URL=https://your-flowless-instance.com
BRIDGE_VALIDATION_SECRET=replace-me
```

Meaning:

- `FLOWLESS_URL`: base URL of the Flowless trust layer.
- `BRIDGE_VALIDATION_SECRET`: required bridge validation secret sent as `X-Bridge-Secret`.

## Recommended Backend Env Vars

```bash
PUBFLOW_VALIDATION_MODE=standard
PUBFLOW_SESSION_COOKIE=session_id
PUBFLOW_SESSION_HEADER=authorization
PUBFLOW_REQUEST_TIMEOUT_MS=5000
```

Meaning:

- `PUBFLOW_VALIDATION_MODE`: default route validation mode.
- `PUBFLOW_SESSION_COOKIE`: cookie name for session lookup.
- `PUBFLOW_SESSION_HEADER`: optional header lookup.
- `PUBFLOW_REQUEST_TIMEOUT_MS`: timeout for Flowless bridge calls.

## Bridge Endpoint Contract

Flowfull validates sessions with:

```txt
POST {FLOWLESS_URL}/auth/bridge/validate
```

Headers:

```txt
X-Session-ID: <user-session-id>
X-Bridge-Secret: <BRIDGE_VALIDATION_SECRET>
```

`X-Bridge-Secret` is required by Bridge Validation. Prefer sending it from Flowfull/backend. Only expose it through public env vars when the project explicitly uses a public/client-side bridge validation design.

## Frontend Env Vars

Frontend apps may need public Flowless or API URLs, depending on the client package.

Use public prefixes required by the framework:

```bash
VITE_API_URL=http://localhost:3001
EXPO_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Rules:

- Public frontend env vars must never contain bridge secrets.
- Only expose URLs and non-secret config.
- Session validation still belongs in Flowfull.

## Env File Pattern

Recommended files:

```txt
.env.example
.env
```

Rules:

- Commit `.env.example`.
- Do not commit `.env`.
- Keep secret names consistent across starters.
- Add comments for required values when useful.

## Startup Validation

Backends should validate required env vars at startup:

- Missing `FLOWLESS_URL`: fail startup.
- Missing `BRIDGE_VALIDATION_SECRET`: fail backend startup or block Bridge Validation setup.
- Invalid `PUBFLOW_VALIDATION_MODE`: fail startup or fallback explicitly.

## Agent Rules

When generating code:

- Read env vars through the project's existing config helper if one exists.
- Do not access `process.env` everywhere if the starter has a config module.
- Do not add secrets to frontend code.
- Do not invent new env names unless the project already uses different names.
- Update `.env.example` whenever a new env var is required.
