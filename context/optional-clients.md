# Optional Pubflow Clients

Clients are helpers for app ergonomics. They are not the Trust Layer itself.

Use clients when they match the selected runtime. Do not show clients as top-level starter templates unless the CLI is explicitly adding SDK support to an existing app.

## Known Client Families

Docs:

- Clients home: https://clients.flowfull.dev/
- Starter kits: https://clients.flowfull.dev/starter-kits
- Packages: https://clients.flowfull.dev/packages
- Universal JS client: https://clients.flowfull.dev/packages/flowfull-client
- Go client: https://clients.flowfull.dev/packages/go
- Rust client: https://clients.flowfull.dev/packages/rust
- Python client: https://clients.flowfull.dev/packages/python
- Elixir client: https://clients.flowfull.dev/packages/elixir
- React package: https://clients.flowfull.dev/packages/react
- React Native package: https://clients.flowfull.dev/packages/react-native
- Next.js package: https://clients.flowfull.dev/packages/nextjs

React:

- Use in React web apps.
- Helps with auth UI state, hooks, provider setup, and API ergonomics.

React Native:

- Use in Expo / React Native apps.
- Must respect mobile storage and platform differences.

Next.js:

- Use in Next.js apps.
- Must distinguish server components, client components, route handlers, and middleware.

JavaScript Core:

- Use for framework-agnostic browser or server JavaScript.
- Good foundation for custom integrations.

Python:

- Use in Python backends or tools.
- Helpful for bridge helpers, service clients, or Flowfull integration.

Go:

- Use in Go backends.
- Should integrate cleanly with `context.Context`, HTTP clients, and framework middleware.

Rust:

- Use in Rust backends.
- Install with `cargo add flowfull`.
- Should integrate cleanly with Axum/Tokio services and backend Bridge Validation.

Elixir:

- Use in Phoenix or Elixir services.
- Should fit plugs, contexts, and supervision patterns.

## Selection Rules

Frontend starter selected:

- `react` should prefer React client metadata.
- `react-native` should prefer React Native client metadata.

Backend starter selected:

- `node-backend` should prefer TypeScript/JavaScript helpers.
- `python-backend` should prefer Python helpers.
- `go-backend` should prefer Go helpers.
- `rust-backend` should prefer Rust helpers.
- `elixir-backend` should prefer Elixir helpers.

Existing project:

- Detect framework from files before recommending a client.
- Ask the user when detection is ambiguous.

## Client Safety Rules

- Clients may manage UI auth state.
- Clients may store `sessionId` after Flowless login/register using localStorage, AsyncStorage, SecureStore, cookies, or the starter's selected storage strategy.
- Clients may send `session_id`/`sessionId` to Flowfull APIs using the app's chosen cookie/header pattern, usually `X-Session-ID`.
- Frontend clients may use the public bridge secret aliases only when the app intentionally performs client-side bridge validation.
- Clients should send `X-Bridge-Secret` only when the app intentionally uses a public/client-side bridge validation design.
- Clients may call public Flowless/session endpoints only when those endpoints are designed for public clients.
- Frontend route guards improve UX, but Flowfull middleware enforces security.
- Clients must not treat frontend route guards as backend security.

## Future CLI Behavior

Possible command:

```bash
pubflow add client
```

Friendly flow:

```txt
Detected React app.
Which Pubflow client do you want to add?
> React
  JavaScript core
```

After installation:

- Install package.
- Add provider or setup file.
- Add env vars to `.env.example`.
- Show minimal usage example.
- Remind that backend routes still require middleware.
