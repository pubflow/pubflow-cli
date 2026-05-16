# Pubflow Starter Kit Map

Supported starter kits in the current CLI.

## Frontend Starters

### `react`

- Name: React.
- Category: frontend.
- Language: TypeScript.
- Framework: TanStack Start / React.
- Repo: `pubflow/react-flowfull-client`.
- Branch: `master`.
- Install: `bun install`.
- Dev: `bun run dev`.
- Recommended client: React.
- Client docs: https://clients.flowfull.dev/packages/react.

Use when:

- Building a web app.
- The app needs Pubflow frontend integration.
- The backend can be existing or created separately.

### `react-native`

- Name: React Native Expo.
- Category: frontend.
- Language: TypeScript.
- Framework: Expo / React Native.
- Repo: `pubflow/create-pubflow-rn`.
- Branch: `master`.
- Install: `npm install`.
- Dev: `npx expo start`.
- Recommended client: React Native.
- Client docs: https://clients.flowfull.dev/packages/react-native.

Use when:

- Building an iOS/Android app with Expo.
- The app calls a Flowfull backend.

## Backend Starters

### `node-backend`

- Name: Node.js Backend.
- Category: backend.
- Language: TypeScript.
- Framework: Flowfull.
- Repo: `pubflow/flowfull-node`.
- Branch: `master`.
- Install: `npm install`.
- Dev: `npm run dev`.
- Recommended helpers: TypeScript / JavaScript.
- Client docs: https://clients.flowfull.dev/packages/flowfull-client.

Use when:

- Building a Flowfull backend in TypeScript.
- The app wants the most direct official backend path.

### `python-backend`

- Name: Python Backend.
- Category: backend.
- Language: Python.
- Framework: FastAPI.
- Repo: `pubflow/flowfull-python-starter`.
- Branch: `master`.
- Install: `pip install -r requirements.txt`.
- Dev: `uvicorn app.main:app --reload --host 0.0.0.0 --port 3001`.
- Recommended helpers: Python.
- Client docs: https://clients.flowfull.dev/packages/python.

Use when:

- Building a Flowfull backend in Python.
- The app needs FastAPI routes and dependencies.

### `go-backend`

- Name: Go Backend.
- Category: backend.
- Language: Go.
- Framework: Gin.
- Repo: `pubflow/flowfull-go-starter`.
- Branch: `master`.
- Install: `go mod download`.
- Dev: `go run cmd/server/main.go`.
- Recommended helpers: Go.
- Client docs: https://clients.flowfull.dev/packages/go.

Use when:

- Building a Flowfull backend in Go.
- The app needs fast APIs and explicit middleware.

### `rust-backend`

- Name: Rust Backend.
- Category: backend.
- Language: Rust.
- Framework: Axum.
- Repo: `pubflow/flowfull-rust-starter`.
- Branch: `master`.
- Install: `cargo fetch`.
- Dev: `cargo run`.
- Recommended helpers: Rust.
- Client docs: https://clients.flowfull.dev/packages/rust.

Use when:

- Building a Flowfull backend in Rust.
- The app needs Axum routes, Tokio runtime, SQLx, and explicit middleware.

### `elixir-backend`

- Name: Elixir Backend.
- Category: backend.
- Language: Elixir.
- Framework: Phoenix.
- Repo: `pubflow/flowfull-elixir-starter`.
- Branch: `master`.
- Install: `mix deps.get`.
- Dev: `mix phx.server`.
- Recommended helpers: Elixir.
- Client docs: https://clients.flowfull.dev/packages/elixir.

Use when:

- Building a Flowfull backend in Elixir/Phoenix.
- The app benefits from plugs, contexts, and Phoenix routing.

## Selection Guidance

Use `react` for web UI.

Use `react-native` for mobile UI.

Use `node-backend` when the user wants the most official TypeScript backend route.

Use `python-backend` when the user prefers FastAPI or Python ecosystem tooling.

Use `go-backend` when the user wants compiled backend performance and simple deployment.

Use `rust-backend` when the user wants Rust/Axum, strong typing, and explicit async backend structure.

Use `elixir-backend` when the user wants Phoenix conventions and Elixir concurrency.

## Full-Stack Future

Future CLI full-stack creation can combine one frontend and one backend:

```txt
my-app/
  apps/
    web/
    api/
  .pubflow/
    context/
```

The root should include a README with commands to run both projects.
