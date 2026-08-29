# Deploy

CI/CD pipelines:
- `.github/workflows/ci.yml` — Flowboard app (check + deploy)
- `.github/workflows/mcp-deploy.yml` — MCP service (deploy only)

## Alur deploy Flowboard app

1. Push ke `master` → trigger workflow `CI & CD`.
2. Job `check` — `bun install` + `bun run check` (Svelte check & typecheck) + MCP typecheck.
3. Job `deploy` — jalan hanya kalau `check` lulus **dan** event-nya push ke `master` (bukan PR).
4. Deploy via SSH ke server: `git pull` → `bun install` → `bun run db:migrate` → `bun run build` → `pm2 reload flowboard`.

## Alur deploy MCP service

1. Push ke `master` yang menyentuh `mcp/**`, `app/services/**`, `app/db/**`, `app/config/**`, `app/core/**`, `app/types/**`, `app/validators/**`, atau `routes/**` → trigger workflow `MCP Deploy`.
2. Deploy via SSH: `git pull` → `cd mcp && bun install` → `pm2 reload flowboard-mcp`.
3. **Tidak** menjalankan `db:migrate` atau `bun run build` — MCP service langsung pakai `bun server.ts`.
4. **Tidak** me-reload `flowboard` (app) — hanya `flowboard-mcp` process.

> Kalau push menyentuh baik app maupun MCP files, kedua workflow jalan paralel. App deploy tetap tunggu `check` lulus; MCP deploy langsung jalan.

## GitHub Secrets (diambil dari repo Settings → Secrets and variables → Actions)

Secrets ini dipakai oleh step `Deploy ke Server via SSH` (action `appleboy/ssh-action@v1.0.3`).

| Secret | Dipakai di CI | Untuk apa |
|---|---|---|
| `SSH_HOST` | `host` | IP/hostname server tujuan deploy |
| `SSH_USERNAME` | `username` | User SSH di server |
| `SERVER_SSH_KEY` | `key` | Private key SSH untuk autentikasi (konten key, bukan path) |
| `SSH_PASSPHRASE` | `passphrase` | Passphrase private key (kosongkan kalau key tidak ada passphrase) |

Port SSH hardcoded `22` di workflow.

## Environment variables di server

Server punya file `.env` di `~/flowboard/.env`. Tidak dikelola oleh CI — dikelola manual di server.

### Wajib di production (`NODE_ENV=production`)

Variabel ini akan **throw** kalau kosong saat `NODE_ENV=production` (dilihat dari `app/config/env.ts`):

| Variabel | Sumber nilai | Catatan |
|---|---|---|
| `DATABASE_URL` | Connection string Postgres | Format: `postgresql://user:pass@host:port/db` |
| `INTEGRATION_TOKEN_PEPPER` | Generate: `openssl rand -hex 32` | Pepper untuk hash connector token |
| `SECRETS_ENCRYPTION_KEY` | Generate: `openssl rand -hex 32` | Key untuk encrypt/decrypt secret integrasi (AES-256-GCM) |
| `WAJOM_INTERNAL_API_TOKEN` | Harus sama dengan `INTERNAL_API_TOKEN` di server wajom | Header `x-internal-api-token` untuk health check ke portal.wajom.co |
| `WA_WEBHOOK_SECRET` | Shared secret untuk webhook WA | Verifikasi webhook inbound dari Wajom |

> `SECRETS_ENCRYPTION_KEY`, `WAJOM_INTERNAL_API_TOKEN`, dan `WA_WEBHOOK_SECRET` tidak wajib kalau `FLOWBOARD_MCP_MODE=1` (MCP standalone service).

### Opsional / punya default

| Variabel | Default | Untuk apa |
|---|---|---|
| `PORT` | `3000` | Port server |
| `NODE_ENV` | `development` | Set `production` di server |
| `SESSION_COOKIE` | `sid` | Nama cookie session |
| `SESSION_TTL_DAYS` | `7` | Masa berlaku session |
| `LOGIN_MAX_ATTEMPTS` | `5` | Max percobaan login sebelum lockout |
| `LOGIN_LOCKOUT_MS` | `900000` (15 menit) | Durasi lockout login |
| `MCP_PUBLIC_URL` | `http://localhost:3100` | Base URL untuk MCP config yang di-export. Production: `https://mcp-flowboard.dripsender.id` |
| `WAJOM_API_BASE_URL` | `https://api.wajom.co` | Base URL Wajom API untuk kirim pesan |
| `WAJOM_REQUEST_TIMEOUT_MS` | `10000` | Timeout request ke Wajom |
| `WA_MAX_ATTEMPTS` | `3` | Max retry kirim WhatsApp |
| `WA_RETRY_DELAY_MINUTES` | `5` | Delay antar retry |
| `WA_MOCK` | `1` (dev) / `0` (prod) | Mock WhatsApp transport |
| `INTEGRATION_RATE_LIMIT_PER_MINUTE` | `60` | Rate limit integrasi per menit |
| `BILLING_GRACE_DAYS` | `7` | Hari grace period setelah subscription past_due/canceled |
| `OPENAI_API_KEY` | kosong | API key OpenAI (untuk AI features) |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model OpenAI |
| `RESEND_API_KEY` | kosong | API key Resend untuk email. Kosong = skip email |
| `EMAIL_FROM` | `Flowboard <no-reply@flowboard.app>` | From address email |
| `GOOGLE_CLIENT_ID` | kosong | OAuth Google. Kosong = disable Google sign-in |
| `GOOGLE_CLIENT_SECRET` | kosong | OAuth Google secret |
| `GOOGLE_REDIRECT_URI` | `http://localhost:{PORT}/api/auth/google/callback` | Redirect URI OAuth Google |
| `FLOWBOARD_MCP_MODE` | kosong | Set `1` untuk jalankan sebagai MCP standalone service (skip requirement beberapa secret) |

## Setup server pertama kali

1. Clone repo ke `~/flowboard`.
2. Buat `.env` dengan semua variabel production di atas.
3. Pastikan `bun` terinstall di server.
4. Pastikan `pm2` terinstall: `bunx --bun pm2 start "bun run start" --name flowboard`.
5. Set GitHub Secrets (`SSH_HOST`, `SSH_USERNAME`, `SERVER_SSH_KEY`, `SSH_PASSPHRASE`).
6. Push ke `master` → deploy otomatis.

## MCP service di server

MCP service jalan sebagai process pm2 terpisah (`flowboard-mcp`) di server yang sama.

### Environment variables MCP (`~/flowboard/mcp/.env`)

| Variabel | Sumber nilai | Catatan |
|---|---|---|
| `NODE_ENV` | `production` | |
| `FLOWBOARD_MCP_MODE` | `1` | Tandai sebagai MCP standalone service |
| `MCP_PORT` | `3100` | Port MCP HTTP listener |
| `DATABASE_URL` | Sama dengan Flowboard app | Connection string Postgres yang sama |
| `INTEGRATION_TOKEN_PEPPER` | Sama dengan Flowboard app | API key hash pakai pepper yang sama — kalau beda, key tidak bisa di-resolve |

### Setup MCP process pertama kali

```bash
cd ~/flowboard/mcp
bun install
set -a; . ~/flowboard/mcp/.env; set +a
bunx --bun pm2 start "bun run start" --name flowboard-mcp --cwd ~/flowboard/mcp
bunx --bun pm2 save
```

### Reverse proxy MCP

MCP service listen di port 3100. Expose via reverse proxy ke `https://mcp-flowboard.dripsender.id`:

```caddyfile
mcp-flowboard.dripsender.id {
    reverse_proxy localhost:3100
}
```
