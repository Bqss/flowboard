<div align="center">

# Flowboard MCP

**Model Context Protocol server for Flowboard**

Let Claude Desktop, Cursor, and any MCP-compatible agent drive Flowboard workflows through standard Streamable HTTP.

[![MCP Protocol](https://img.shields.io/badge/MCP-Streamable%20HTTP-blue)](https://modelcontextprotocol.io)
[![Runtime](https://img.shields.io/badge/runtime-Bun-f9f1e1)](https://bun.sh)
[![Language](https://img.shields.io/badge/lang-TypeScript-3178c6)](https://www.typescriptlang.org)

</div>

---

## What is this?

Flowboard MCP is a self-hosted service deployed by the Flowboard team. It exposes Flowboard's workflow tools over the standard MCP protocol and accesses Flowboard's database and domain services directly.

```
Claude Desktop / Cursor / Agent
        │
        │  MCP (JSON-RPC over Streamable HTTP)
        ▼
┌──────────────────┐
│  Flowboard MCP   │
│  /mcp            │
│  direct DB +     │
│  Flowboard domain│
└──────────────────┘
        │
        ▼
     Postgres
```

Every request authenticates a DB-managed API key. The key determines the workspace, workflow scope, and tools exposed to the client. Scope is enforced both during `tools/list` and every `tools/call`.

## Tools

The available tools depend on the API key configuration:

| Tool | What it does |
|---|---|
| `list_workflows` | List workflows allowed by the key scope |
| `get_workflow_stages` | List stages for an allowed workflow |
| `get_card` | Get card detail within an allowed workflow |
| `find_card_by_wa` | Find cards across allowed workflows |
| `list_cards` | List cards in an allowed workflow |
| `create_card` | Create a card in an allowed workflow |
| `notify_assignee` | Notify the card assignee |
| `move_stage` | Move a card to another stage |
| `stop_followups` | Stop WhatsApp follow-ups for a card |
| `toggle_checklist_item` | Mark a checklist item done or undone |

A single-workflow key omits `list_workflows` by default. All-workflow and multi-workflow keys include discovery tools by default. Owners can further restrict individual tools in Flowboard settings.

## Quick start

The MCP service is maintained inside the Flowboard repository under `mcp/`.

```bash
cd flowboard/mcp
bun install
bun run dev
```

The server listens on `http://localhost:3100/mcp`.

The Flowboard application and MCP service must use the same:

- `DATABASE_URL`
- `INTEGRATION_TOKEN_PEPPER`

Create API keys from Flowboard → Settings → Integrations. The plaintext key is shown only once.

## Connect a client

Every client needs:

| Field | Value |
|---|---|
| **Endpoint** | `http://localhost:3100/mcp` |
| **Authorization** | `Bearer <MCP_API_KEY>` |

### Claude Desktop

```jsonc
{
  "mcpServers": {
    "flowboard": {
      "transport": {
        "type": "http",
        "url": "http://localhost:3100/mcp",
        "headers": {
          "Authorization": "Bearer <MCP_API_KEY>"
        }
      }
    }
  }
}
```

### Cursor

```jsonc
{
  "mcpServers": {
    "flowboard": {
      "url": "http://localhost:3100/mcp",
      "headers": {
        "Authorization": "Bearer <MCP_API_KEY>"
      }
    }
  }
}
```

The exported JSON config from Flowboard settings uses the same format and the placeholder `<FLOWBOARD_MCP_API_KEY>`.

## Configuration

| Env var | Default | Required | Description |
|---|---|---|---|
| `NODE_ENV` | `development` | production: yes | Use `production` for deployed MCP instances |
| `FLOWBOARD_MCP_MODE` | — | yes | Set to `1` so shared Flowboard config skips the app-only API key requirement |
| `MCP_PORT` | `3100` | no | Port the MCP server listens on |
| `DATABASE_URL` | — | yes | Same PostgreSQL database used by Flowboard |
| `INTEGRATION_TOKEN_PEPPER` | — | yes | Same secret used by Flowboard to hash MCP API keys |

`FLOWBOARD_API_KEY` is not needed by the standalone MCP service. Workspace access is resolved from the DB-managed bearer key; no workspace header is required.

## How it works

1. The MCP client sends a JSON-RPC request to `/mcp`.
2. The service verifies the bearer key against `mcp_api_keys`.
3. The service loads the key's workspace, workflow mappings, and enabled tools.
4. Only enabled tools are registered for that request.
5. Tool execution calls shared Flowboard domain services directly.
6. Scope guards validate workspace/workflow/card/stage/checklist ownership before mutations or reads.

The service is stateless: each request gets a fresh transport and server instance. API key state and business data remain in PostgreSQL.

## Verification

```bash
cd flowboard/mcp
bunx tsc --noEmit
curl http://localhost:3100/mcp
```

The health endpoint returns:

```json
{"ok":true,"service":"flowboard-mcp","version":"1.0.0"}
```

## Project structure

```
mcp/
├── server.ts          # MCP server + Streamable HTTP transport
├── package.json
├── tsconfig.json
├── README.md
└── docs/
    ├── setup.md
    └── deploy.md
```

See [docs/setup.md](./docs/setup.md) for local setup and [docs/deploy.md](./docs/deploy.md) for production deployment.

## Requirements

- Bun >= 1.1
- A running PostgreSQL database used by Flowboard
- A DB-managed MCP API key generated from Flowboard settings

## License

Private. See Flowboard's license.
