# Pubflow AI Context

`pubflow context init` installs compact Pubflow knowledge into a project so humans and coding agents build with the Trust Layer Standard correctly.

The goal is simple: make it hard for an AI agent to invent unsafe auth patterns.

## Recommended Flow

```bash
pubflow context init
```

Choose:

```txt
Compact AI guide
```

Then select:

```txt
AGENTS.md
```

This creates:

```txt
.pubflow/context/pubflow-context.md
AGENTS.md
```

`pubflow-context.md` contains the real Pubflow guidance. `AGENTS.md` only points the agent to that file and reminds it of the most important rules.

## Compact Vs Full

Compact mode:

```bash
pubflow context init
```

Creates one focused file:

```txt
.pubflow/context/pubflow-context.md
```

Use this for most projects. It is easier for coding agents to read one short source of truth.

The compact file is generated from `context/pubflow-core.md` and includes the minimum needed for Flowfull backends and Flowless-powered frontends.

Full mode:

```bash
pubflow context init --full
```

Creates topic files:

```txt
.pubflow/context/
  agent-instructions.md
  trust-layer-standard.md
  architecture.md
  bridge-validation.md
  middleware-patterns.md
  env-contract.md
  optional-clients.md
  starter-kit-map.md
```

Use this when the project needs deeper local docs.

## Agent Reference Files

The CLI can create short references for common coding agents and editors:

```bash
pubflow context init --agents
pubflow context init --cursor
pubflow context init --copilot
pubflow context init --claude
pubflow context init --all
```

Generated files:

```txt
AGENTS.md
.cursor/rules/pubflow.mdc
.github/copilot-instructions.md
CLAUDE.md
```

These files do not duplicate all Pubflow context. They point to `.pubflow/context/...` and give a short safety reminder.

## What The Context Teaches

- Pubflow is the Trust Layer Standard.
- Flowless owns identity and sessions.
- Flowless instances are created and managed from Pubflow Platform.
- Flowfull owns business logic and authorization.
- Bridge Validation validates opaque sessions with Flowless.
- Bridge Validation uses `POST {FLOWLESS_URL}/auth/bridge/validate`.
- Flowfull sends the user session as `X-Session-ID`.
- The client holds only an opaque `session_id`.
- `BRIDGE_VALIDATION_SECRET` is sent as required `X-Bridge-Secret`.
- The recommended pattern sends `X-Bridge-Secret` from Flowfull/backend; frontend/mobile usage should be intentional and documented by the project.
- Frontends call Flowless auth routes, store the returned `sessionId`, then send it to Flowfull APIs.
- Flowfull backends should wrap Bridge Validation in middleware such as `optionalAuth`, `requireAuth`, `requireUserType`, and `requirePermission`.
- Optional clients help ergonomics but do not replace backend authorization.

## Good Defaults

Fast, no prompts:

```bash
pubflow context init --yes
```

Creates:

```txt
.pubflow/context/pubflow-context.md
AGENTS.md
```

Everything, no prompts:

```bash
pubflow context init --full --all
```

Creates all context files and all supported agent references.
