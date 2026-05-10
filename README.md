# Pubflow CLI

Official Pubflow Platform CLI to create apps and manage projects.

Use the guided flow or direct commands to start frontend and backend projects quickly.

## How Pubflow Apps Work

Pubflow apps are built around two simple pieces:

- **Flowless** handles auth, sessions, users, login, registration, 2FA, and password reset.
- **Flowfull** is your backend(s): routes, database, business logic, roles, permissions, and app data.

Frontend apps authenticate with Flowless and store the returned `sessionId`.

Authenticated requests to Flowfull send:

```txt
X-Session-ID: <sessionId>
```

Flowfull validates that session with Flowless through Bridge Validation:

```txt
POST {FLOWLESS_URL}/auth/bridge/validate
X-Session-ID: <sessionId>
X-Bridge-Secret: <BRIDGE_VALIDATION_SECRET>
```

Then Flowfull decides what the user can do.

That means frontend starters can use Flowless auth and Flowfull APIs together with the same session flow.

## Commands

```bash
pubflow init
pubflow create
pubflow create <template> [name]
pubflow list
pubflow doctor
pubflow context init
pubflow context init --agents
pubflow context init --cursor
pubflow context init --copilot
pubflow context init --claude
pubflow context init --all
pubflow add context
pubflow add env
pubflow add client [client]
pubflow add middleware
pubflow inspect
pubflow docs [topic]
pubflow hints [topic]
```

`pubflow init` is the friendliest entry point. It asks whether you are starting a new project or adding Pubflow to the current project.

For a new project, it opens the starter selector.

For an existing project, it lets you add:

```txt
AI context
Env vars
Flowfull client
Bridge middleware
```

## Examples

```bash
pubflow init
pubflow create
pubflow create python-backend my-api
pubflow create react my-web
pubflow create react-native my-mobile-app
pubflow context init
pubflow context init --full --all
pubflow add context
pubflow add env
pubflow add client react
pubflow add middleware
pubflow inspect
pubflow docs bridge
pubflow hints clients
```

## AI Context

Install compact Pubflow context for coding agents:

```bash
pubflow context init
```

Fast default:

```bash
pubflow context init --yes
```

This creates:

```txt
.pubflow/context/pubflow-context.md
AGENTS.md
```

For deeper project docs:

```bash
pubflow context init --full
```

For editor/agent references:

```bash
pubflow context init --agents
pubflow context init --cursor
pubflow context init --copilot
pubflow context init --claude
pubflow context init --all
```

## Templates

Supported starter kits today:

Frontend starters:

- `react` - install with `bun install`, run with `bun run dev`
- `react-native` - install with `npm install`, run with `npx expo start`

Backend starters:

- `node-backend` - install with `npm install`, run with `npm run dev`
- `python-backend` - install with `pip install -r requirements.txt`, run with `uvicorn app.main:app --reload --host 0.0.0.0 --port 3001`
- `go-backend` - install with `go mod download`, run with `go run cmd/server/main.go`
- `elixir-backend` - install with `mix deps.get`, run with `mix phx.server`

## Local Development

```bash
npm install
npm link
pubflow list
```

Or run without linking:

```bash
npm run pubflow -- list
```

## More Docs

- [Commands](./docs/commands.md)
- [AI Context](./docs/context.md)
- [Add Workflows](./docs/add-workflows.md)
