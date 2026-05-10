# Add Workflows

Use `pubflow add` when you already have a project and want to add Pubflow pieces without recreating the app.

The goal is simple: keep your project structure, add only what is needed, and get clear next steps.

## Quick Start

Add AI context:

```bash
pubflow add context
```

Add env vars:

```bash
pubflow add env
```

Add a Flowfull client:

```bash
pubflow add client
```

Add Bridge Validation middleware:

```bash
pubflow add middleware
```

Check the project:

```bash
pubflow inspect
```

## Add Context

```bash
pubflow add context
```

This installs local Pubflow context for coding agents and IDEs.

Default output:

```txt
.pubflow/context/pubflow-context.md
AGENTS.md
```

Use full context when you want all reference files:

```bash
pubflow add context --full
```

Add editor-specific references:

```bash
pubflow add context --cursor
pubflow add context --copilot
pubflow add context --claude
pubflow add context --all
```

## Add Env

```bash
pubflow add env
```

Adds Pubflow env vars to `.env.example` and optionally `.env`.

Generated values:

```bash
FLOWLESS_URL=https://your-flowless-instance.com
BRIDGE_VALIDATION_SECRET=replace-me
PUBFLOW_VALIDATION_MODE=standard
PUBFLOW_SESSION_COOKIE=session_id
PUBFLOW_REQUEST_TIMEOUT_MS=5000
```

`FLOWLESS_URL` points to your Flowless instance. `BRIDGE_VALIDATION_SECRET` is sent as `X-Bridge-Secret` during Bridge Validation.

## Add Client

```bash
pubflow add client
```

The CLI detects your project and recommends a client.

Examples:

```bash
pubflow add client react
pubflow add client react-native
pubflow add client universal-js
pubflow add client python
pubflow add client go
pubflow add client elixir
```

Recommended installs use latest versions where the package manager supports it:

```bash
npm install @pubflow/flowfull-client@latest
npm install @pubflow/core@latest @pubflow/react@latest swr zod
npm install @pubflow/react-native@latest
python -m pip install --upgrade flowfull-python
go get github.com/pubflow/flowfull-go@latest
```

Elixir projects get a safe manual hint:

```elixir
{:flowfull, "~> 0.1.3"}
```

Client docs:

- https://clients.flowfull.dev/
- https://clients.flowfull.dev/packages
- https://clients.flowfull.dev/starter-kits

## Add Middleware

```bash
pubflow add middleware
```

This adds Bridge Validation middleware for supported backends.

Supported targets:

- Node / TypeScript
- Python / FastAPI
- Go / Gin
- Elixir / Phoenix

Generated files use `bridge` as the default namespace:

```txt
src/bridge/auth.ts
app/bridge/auth.py
internal/bridge/auth.go
lib/bridge_auth.ex
```

If a `bridge` file already exists, the CLI falls back to `pubflow` naming to avoid overwriting your code.

Bridge Validation uses:

```txt
POST {FLOWLESS_URL}/auth/bridge/validate
X-Session-ID: <sessionId>
X-Bridge-Secret: <BRIDGE_VALIDATION_SECRET>
```

Generated middleware gives you helpers like:

```txt
optionalAuth()
requireAuth()
requireUserType()
requirePermission()
requireAdmin()
```

Exact helper names vary by language/framework, but the pattern is the same.

## Detection

The CLI detects common project types from files like:

```txt
package.json
app.json
requirements.txt
pyproject.toml
go.mod
mix.exs
```

It also detects package managers:

```txt
npm
bun
pnpm
yarn
pip
go
mix
```

When the project is unclear, the CLI asks instead of guessing.

## Safety

`pubflow add` is designed to be safe:

- It creates new middleware files instead of editing route files directly.
- It does not overwrite existing middleware files.
- It writes placeholders, never real secrets.
- It updates `.env.example` by default.
- It updates `.env` only when you confirm.
- Agent/editor references use marked blocks so they can be updated without duplicating content.

## Hints

Every add command prints next steps. You can also review hints later:

```bash
pubflow hints
pubflow hints clients
pubflow hints middleware
pubflow hints env
pubflow hints context
```
