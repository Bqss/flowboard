# Setup

How to run the Flowboard MCP service locally and connect an MCP-compatible client.

## Prerequisites

- Bun >= 1.1
- PostgreSQL used by the Flowboard application
- Flowboard repository checked out with the `mcp/` directory
- An MCP API key generated from Flowboard → Settings → Integrations

## 1. Install

From the Flowboard repository:

```bash
cd mcp
bun install
```

## 2. Configure environment

The MCP service reads the same database and key-hashing secret as Flowboard:

```bash
NODE_ENV=production
FLOWBOARD_MCP_MODE=1
MCP_PORT=3100
DATABASE_URL=postgres://postgres:postgres@localhost:5432/app
INTEGRATION_TOKEN_PEPPER=the-same-value-used-by-flowboard
```

The MCP service only needs the database connection and the same `INTEGRATION_TOKEN_PEPPER` as Flowboard. `FLOWBOARD_MCP_MODE=1` prevents unrelated app-only secrets from being required. The workspace is resolved from the DB-managed bearer key.

## 3. Run

```bash
# Development
bun run dev

# Production
bun run start
```

Expected output:

```text
Flowboard MCP server listening on http://0.0.0.0:3100/mcp
Mode: direct DB access (Flowboard services)
Client headers:
  Authorization: Bearer <MCP_API_KEY>
```

## 4. Verify

Health check:

```bash
curl http://localhost:3100/mcp
```

Expected response:

```json
{"ok":true,"service":"flowboard-mcp","version":"1.0.0"}
```

Use a real API key generated in Flowboard to initialize MCP and list tools:

```bash
curl -X POST http://localhost:3100/mcp \
  -H "content-type: application/json" \
  -H "accept: application/json, text/event-stream" \
  -H "Authorization: Bearer <MCP_API_KEY>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

The subsequent `tools/list` response reflects the API key's enabled tools. A single-workflow key usually exposes 9 tools; all-workflow and multi-workflow keys expose all enabled tools, including `list_workflows` by default.

## 5. Connect a client

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

Flowboard's **Export config** action generates the Cursor-style JSON using the configured `MCP_PUBLIC_URL` and the placeholder `<FLOWBOARD_MCP_API_KEY>`.

## Scope behavior

The API key configuration controls:

- Workspace: always the workspace that owns the key.
- Workflow scope: all workflows or selected workflows.
- Tools: explicit per-key allowlist.

The service filters `tools/list` and independently checks every `tools/call`. A client cannot bypass a workflow scope by manually invoking a hidden tool.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Unauthorized: missing Bearer token.` | No authorization header | Add `Authorization: Bearer <MCP_API_KEY>` |
| `Unauthorized: invalid or revoked API key.` | Key is wrong or revoked | Generate/rotate a key in Flowboard settings |
| `No tools appear` | No tools enabled for the key | Edit the key and enable at least one tool |
| Workflow access denied | Workflow is outside the key scope | Edit the key's selected workflows |
| `DATABASE_URL` connection error | MCP cannot reach Postgres | Check database URL, network, and credentials |
| Key hashing mismatch | Different pepper values | Match `INTEGRATION_TOKEN_PEPPER` with Flowboard |
| Port 3100 already in use | Another process uses the port | Change `MCP_PORT` |
