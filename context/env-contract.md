# Pubflow Env Contract

Use env vars for all Pubflow connection details, secrets, validation modes, and runtime behavior.

## Required Backend Env Vars

```bash
FLOWLESS_URL=https://your-flowless-instance.com
BRIDGE_VALIDATION_SECRET=replace-me
FLOWFULL_API_URL=http://localhost:3001
```

Meaning:

- `FLOWLESS_URL`: base URL of the Flowless trust layer.
- `BRIDGE_VALIDATION_SECRET`: required bridge validation secret sent as `X-Bridge-Secret`.
- `FLOWFULL_API_URL`: base URL of the current Flowfull/backend API.

## Recommended Backend Env Vars

```bash
PUBFLOW_VALIDATION_MODE=standard
```

Meaning:

- `PUBFLOW_VALIDATION_MODE`: default route validation mode.

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

Frontend apps usually need public Flowless, Flowfull API, and bridge validation env vars, depending on the client package.

Use public prefixes required by the framework:

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

Rules:

- Use the prefix required by the frontend framework.
- `*_BRIDGE_VALIDATION_SECRET` is required only when the frontend/client intentionally performs bridge validation.
- Prefer Flowfull/backend validation for server-owned authorization.

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
- Missing `FLOWFULL_API_URL`: block workflows that need to call the current Flowfull API.
- Invalid `PUBFLOW_VALIDATION_MODE`: fail startup or fallback explicitly.

## Agent Rules

When generating code:

- Read env vars through the project's existing config helper if one exists.
- Do not access `process.env` everywhere if the starter has a config module.
- Do not invent hidden frontend secrets; public-prefixed frontend env vars are visible to users by design.
- Do not invent new env names unless the project already uses different names.
- Update `.env.example` whenever a new env var is required.
