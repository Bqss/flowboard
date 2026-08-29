# Deploy

How to deploy the Flowboard MCP service in production.

## Architecture

```
MCP Client
    │ HTTPS /mcp + Authorization: Bearer <MCP_API_KEY>
    ▼
Flowboard MCP service
    │ direct database + shared Flowboard domain services
    ▼
PostgreSQL
```

The MCP service is stateless, but it requires network access to the same PostgreSQL database used by the Flowboard application. API key scope, revocation, workflow mappings, and business data are stored in PostgreSQL.

## Requirements

- Bun >= 1.1
- PostgreSQL network access
- The same `DATABASE_URL` and `INTEGRATION_TOKEN_PEPPER` values as Flowboard
- A public HTTPS URL for remote MCP clients
- TLS termination through Caddy, Nginx, Cloudflare, or a managed platform

Run the database migrations from the Flowboard application before starting a new MCP version:

```bash
cd /path/to/flowboard
bun run db:migrate
```

## Install

The MCP service currently lives in the Flowboard repository:

```bash
git clone <repo-url> /opt/flowboard
cd /opt/flowboard/mcp
bun install --production
```

## Environment

Create `/opt/flowboard/mcp/.env`:

```bash
NODE_ENV=production
FLOWBOARD_MCP_MODE=1
MCP_PORT=3100
DATABASE_URL=postgres://user:password@db.internal:5432/flowboard
INTEGRATION_TOKEN_PEPPER=<same-value-as-flowboard>
```

Each MCP client supplies a DB-managed API key generated in Flowboard Settings → Integrations. The service resolves the workspace from that key.

## systemd

Create `/etc/systemd/system/flowboard-mcp.service`:

```ini
[Unit]
Description=Flowboard MCP Server
After=network.target

[Service]
Type=simple
User=flowboard
WorkingDirectory=/opt/flowboard/mcp
ExecStart=/usr/local/bin/bun run start
Restart=on-failure
RestartSec=5
EnvironmentFile=/opt/flowboard/mcp/.env
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable flowboard-mcp
sudo systemctl start flowboard-mcp
sudo systemctl status flowboard-mcp
```

## pm2

Use [pm2](https://pm2.keymetrics.io/) when you prefer a Node-style process manager over systemd or Docker. pm2 wraps the Bun process, handles restarts, logs, and can run multiple instances behind a cluster — though the MCP service is stateless HTTP so a single instance is normally enough.

Install pm2 globally (Node is required only for pm2 itself; the app still runs on Bun):

```bash
npm install -g pm2
```

Create `ecosystem.config.cjs` in `/opt/flowboard/mcp`:

```js
module.exports = {
  apps: [
    {
      name: 'flowboard-mcp',
      script: 'bun',
      args: 'run start',
      cwd: '/opt/flowboard/mcp',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        FLOWBOARD_MCP_MODE: '1',
        MCP_PORT: 3100
        // DATABASE_URL and INTEGRATION_TOKEN_PEPPER are loaded from .env below
      },
      env_file: '/opt/flowboard/mcp/.env'
    }
  ]
};
```

> pm2 does not parse `.env` automatically. Either source it before starting, or inline `DATABASE_URL` and `INTEGRATION_TOKEN_PEPPER` into the `env` block above. The recommended approach:

```bash
set -a; . /opt/flowboard/mcp/.env; set +a
pm2 start ecosystem.config.cjs
```

Save the process list so it survives reboots:

```bash
pm2 save
pm2 startup systemd    # follow the printed one-time sudo command
```

Common commands:

| Action | Command |
|---|---|
| Start | `pm2 start ecosystem.config.cjs` |
| Stop | `pm2 stop flowboard-mcp` |
| Restart | `pm2 restart flowboard-mcp` |
| Reload (zero-downtime) | `pm2 reload flowboard-mcp` |
| Status | `pm2 status flowboard-mcp` |
| Logs (live) | `pm2 logs flowboard-mcp` |
| Logs (file) | `~/.pm2/logs/flowboard-mcp-out.log` / `*-error.log` |

## Docker

Build from the Flowboard repository root so the MCP service can import shared application services:

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile
COPY app ./app
COPY routes ./routes
COPY mcp ./mcp
WORKDIR /app/mcp
EXPOSE 3100
CMD ["bun", "run", "start"]
```

Run:

```bash
docker build -t flowboard-mcp .
docker run -d \
  --name flowboard-mcp \
  --env-file /opt/flowboard/mcp/.env \
  -p 3100:3100 \
  --restart unless-stopped \
  flowboard-mcp
```

## Reverse proxy

Example Caddy configuration:

```caddyfile
mcp.flowboard.example.com {
    reverse_proxy localhost:3100
}
```

Keep port 3100 private and expose only the HTTPS reverse proxy to the internet.

## Verify

```bash
curl https://mcp.flowboard.example.com/mcp
```

Expected:

```json
{"ok":true,"service":"flowboard-mcp","version":"1.0.0"}
```

For protocol verification, use a real API key generated in Flowboard:

```bash
curl -X POST https://mcp.flowboard.example.com/mcp \
  -H "content-type: application/json" \
  -H "accept: application/json, text/event-stream" \
  -H "Authorization: Bearer <MCP_API_KEY>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"deploy-check","version":"1.0"}}}'
```

## Security checklist

- [ ] MCP endpoint uses HTTPS.
- [ ] Port 3100 is not publicly exposed.
- [ ] `DATABASE_URL` is stored as a deployment secret.
- [ ] `INTEGRATION_TOKEN_PEPPER` exactly matches Flowboard.
- [ ] `.env` is not committed.
- [ ] Process runs as a non-root user.
- [ ] Logs never print bearer keys or database credentials.
- [ ] API keys are generated, scoped, rotated, and revoked from Flowboard settings.

## Updating

```bash
cd /opt/flowboard
git pull
bun run db:migrate
cd mcp
bun install --production
sudo systemctl restart flowboard-mcp   # or: pm2 restart flowboard-mcp
```

The MCP service can be updated independently from the UI deployment, but shared service and schema changes must remain compatible with the running Flowboard version.

## Multi-workspace usage

One MCP service supports multiple workspaces. Each client uses its own DB-managed API key; workspace identity and workflow scope are resolved from that key. No workspace header is required.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `502 Bad Gateway` | MCP service is unavailable | Check `systemctl status flowboard-mcp`, `pm2 status flowboard-mcp`, or container logs |
| `401 Unauthorized` | Key is invalid or revoked | Generate or rotate a key in Flowboard settings |
| Scope denial | Workflow is not mapped to the key | Edit the key's workflow scope |
| Database connection error | Incorrect URL or network access | Verify `DATABASE_URL` and firewall rules |
| Key hashing mismatch | Different pepper values | Match `INTEGRATION_TOKEN_PEPPER` |
| Port already in use | Another process uses 3100 | Change `MCP_PORT` |
