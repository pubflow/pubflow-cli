# Pubflow CLI

Official Pubflow Platform CLI to create apps and manage projects.

Use the guided flow or direct commands to start frontend and backend projects quickly.

## Commands

```bash
pubflow init
pubflow create <template> [name]
pubflow list
pubflow doctor
```

## Examples

```bash
pubflow init
pubflow create python-backend my-api
pubflow create react my-web
pubflow create react-native my-mobile-app
```

## Templates

Supported starter kits today:

Frontend starters:

- `react` - install with `npm install`, run with `npm run dev`
- `react-native` - install with `npm install`, run with `npx expo start`

Backend starters:

- `node-backend` - install with `bun install`, run with `bun run dev`
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
