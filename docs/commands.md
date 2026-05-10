# Pubflow CLI Commands

The Pubflow CLI helps you create apps, add project context, configure env vars, inspect setup, and jump into docs.

You can use either binary:

```bash
pubflow init
pbfl init
```

## Create A Project

Guided flow:

```bash
pubflow init
```

`pubflow init` asks whether you want a new project or want to add Pubflow to the current project.

For a new project, it opens the starter selector.

For an existing project, it opens an add selector for context, env, client, and middleware.

Project-only guided flow:

```bash
pubflow create
```

Direct flow:

```bash
pubflow create react my-web
pubflow create react-native my-mobile
pubflow create node-backend my-api
pubflow create python-backend my-api
pubflow create go-backend my-api
pubflow create elixir-backend my-api
```

Skip setup steps:

```bash
pubflow create python-backend my-api --no-install --no-git
```

## List Starters

```bash
pubflow list
```

Shows supported frontend and backend starter kits.

## Add AI Context

Recommended default:

```bash
pubflow context init
```

No-prompt default:

```bash
pubflow context init --yes
```

Full context folder:

```bash
pubflow context init --full
```

Reference specific agent files:

```bash
pubflow context init --agents
pubflow context init --cursor
pubflow context init --copilot
pubflow context init --claude
pubflow context init --all
```

## Add Env Vars

```bash
pubflow add env
```

Adds Pubflow env vars to `.env.example` and can optionally update `.env`.

Frontend projects get public-safe env vars:

```txt
Vite / React: VITE_FLOWLESS_URL, VITE_FLOWFULL_API_URL, VITE_BRIDGE_VALIDATION_SECRET
Expo: EXPO_PUBLIC_FLOWLESS_URL, EXPO_PUBLIC_FLOWFULL_API_URL, EXPO_PUBLIC_BRIDGE_VALIDATION_SECRET
Next.js: NEXT_PUBLIC_FLOWLESS_URL, NEXT_PUBLIC_FLOWFULL_API_URL, NEXT_PUBLIC_BRIDGE_VALIDATION_SECRET
```

Backend projects get Bridge Validation env vars:

```bash
FLOWLESS_URL=https://your-flowless-instance.com
BRIDGE_VALIDATION_SECRET=replace-me
FLOWFULL_API_URL=http://localhost:3001
PUBFLOW_VALIDATION_MODE=standard
```

Bridge validation uses:

```txt
POST {FLOWLESS_URL}/auth/bridge/validate
X-Session-ID: <user-session-id>
X-Bridge-Secret: <BRIDGE_VALIDATION_SECRET>
```

`X-Session-ID` carries the user's opaque session. `BRIDGE_VALIDATION_SECRET` is sent as the required `X-Bridge-Secret` header. Prefer sending it from Flowfull/backend; frontend/mobile usage should only be used when the project intentionally supports a public/client-side bridge validation design.

## Add Client

Interactive:

```bash
pubflow add client
```

Direct:

```bash
pubflow add client react
pubflow add client react-native
pubflow add client universal-js
pubflow add client python
pubflow add client go
pubflow add client elixir
```

The CLI detects the project and recommends the best client. JavaScript installs use `@latest` and adapt to npm, bun, pnpm, or yarn when detected.

## Add Middleware

```bash
pubflow add middleware
```

Adds Bridge Validation middleware for supported backend projects:

- Node / TypeScript
- Python / FastAPI
- Go / Gin
- Elixir / Phoenix

Generated middleware uses a `bridge` namespace first and falls back to `pubflow` if needed.

## Flowless And Flowfull Flow

Flowless is created from Pubflow Platform and provides managed auth.

Frontend flow:

1. Call Flowless, for example `POST /auth/login`.
2. Store the returned `sessionId` in local/secure storage.
3. Send the session to Flowfull APIs, usually as `X-Session-ID`.

Flowfull backend flow:

1. Middleware reads session from `X-Session-ID`, cookie, or an app-selected source.
2. Middleware calls `POST {FLOWLESS_URL}/auth/bridge/validate`.
3. Middleware sends `X-Bridge-Secret`.
4. Route handlers use normalized auth context.

Recommended middleware:

```txt
optionalAuth()
requireAuth()
requireUserType()
requirePermission()
requireAdmin()
```

## Inspect A Project

```bash
pubflow inspect
```

Checks for:

- `.pubflow/context`
- agent/editor references
- `.env.example`
- `FLOWLESS_URL`
- bridge validation secret
- project manifests
- detected stack

## Docs

```bash
pubflow docs
pubflow docs bridge
pubflow docs context
pubflow docs starters
pubflow docs flowfull
pubflow docs flowless
pubflow docs clients
```

Open the first docs link:

```bash
pubflow docs bridge --open
```

## Hints

Show friendly next-step hints:

```bash
pubflow hints
pubflow hints clients
pubflow hints middleware
pubflow hints env
pubflow hints context
```

These hints are also shown at the end of `pubflow add client` and `pubflow add middleware`.

## Doctor

```bash
pubflow doctor
```

Checks common local tools: Node.js, npm, Bun, git, Python, Go, and Elixir Mix.
