# TODO — Flowboard

Pecah per phase. Acuan: [FEATURES.md](./FEATURES.md) · [PLAN.md](./PLAN.md)

---

## Phase 0 — Auth, workspace, role

Fondasi sebelum Kanban. Starter **sudah punya** login/register/session — Phase 0 = rapikan auth + tambah workspace + role workspace.

### 0.1 Autentikasi (sudah ada — audit & rapikan)

Sudah di codebase:

- [x] Schema `users`, `sessions`
- [x] API: `POST /auth/register`, `login`, `logout`, `GET /auth/me`, `change-password`
- [x] Session cookie + middleware `withUser` / `requireAuth`
- [x] Login throttle (lockout)
- [x] SvelteKit `+layout.server.ts` load `user` + `workspace`
- [x] Halaman `/login`, `/register`

Yang perlu dikerjakan / dicek:

- [x] Redirect: sudah login → tidak ke `/login` lagi; belum login → route protected ke `/login`
- [x] Guard halaman dashboard (`dashboard/+layout.server.ts`)
- [x] `me` response: sertakan workspace aktif + role workspace
- [x] Bersihkan `uploadAvatar` (debug log, mkdir avatars)
- [ ] Seed user dev (opsional, untuk testing invite)

### 0.2 Schema workspace

- [x] `workspaces` — `id`, `name`, `slug`, `created_at`
- [x] `workspace_members` — `workspace_id`, `user_id`, `role`, `joined_at`
- [x] Unique: 1 user hanya 1 membership per workspace
- [x] `users.active_workspace_id` (nullable)
- [x] Migration generated (`drizzle/0001_lean_sabretooth.sql`) — jalankan `bun run db:migrate` saat Postgres up

**Role workspace (Phase 0):**

| Role | Bisa apa |
|---|---|
| `owner` | Invite/hapus member, ubah setting workspace, billing (nanti P6) |
| `member` | Akses board; tidak invite; tidak ubah setting workspace |

`platform_admin` = **Phase 6**, bukan Phase 0.

### 0.3 Workspace lifecycle

- [x] Register → auto-buat workspace default + user jadi `owner`
- [ ] User tanpa workspace (edge case) → onboarding buat workspace
- [x] API `GET /workspaces`, `GET /workspaces/:id`, `PATCH /workspaces/:id`
- [x] Switch workspace aktif (kalau user di banyak workspace — ditunda)

### 0.4 Invite anggota (staff)

- [x] `workspace_invites` — email, role, token, expires_at
- [x] API owner: `POST /workspaces/:id/invites`
- [x] Halaman accept invite `/invite/[token]`
- [x] Accept → baris di `workspace_members`
- [x] Owner bisa hapus member

### 0.5 Middleware & guard role

- [x] `withWorkspaceMember` / `requireWorkspaceMember`
- [x] `requireWorkspaceOwner` (helper, owner juga dicek di handler)
- [x] Route prefix `/workspaces/:workspaceId/...`

### 0.6 UI minimum

- [x] Dashboard layout: nama workspace, user, logout
- [x] Halaman `/dashboard/members`: list member + invite form (owner only)
- [x] Empty state dashboard: “Belum ada workflow”

**Selesai Phase 0 jika:** User A register → workspace otomatis. User A invite User B. User B accept → masuk sebagai `member`. User B tidak bisa invite. `GET /auth/me` mengembalikan user + workspace + role.

**Belum Phase 0** (sengaja ditunda):

- Role **per workflow** (owner workflow / assignee card) → Phase 1
- `platform_admin` → Phase 6

---

## Phase 1 — Workflow, stage, Kanban, checklist (tanpa WA)

Fitur 2.1–2.3, 3.1, 3.3–3.5, 4.1–4.4, 5.1, 8 · role workflow

- [x] Schema: `workflows`, `stages`, `checklist_templates`, `cards`, `checklist_items`
- [x] Workflow scoped ke `workspace_id`; `workflows.owner_id` (PIC proses, beda dari workspace owner)
- [x] `workflows.default_assignee_id` (staff default)
- [x] Guard: hanya anggota workspace yang boleh akses workflow workspace itu
- [x] CRUD workflow + stage (urutan, tipe)
- [x] Editor checklist per stage (required/optional, **belum** action)
- [x] `createCard` manual → kolom pertama, copy checklist stage itu
- [x] Halaman Kanban: kolom = stage, card wajah (nama, produk, tag, assignee, `n/m`)
- [x] Panel detail card: checklist stage aktif
- [x] Geser stage: tolak jika required belum dicentang; masuk stage baru → copy checklist baru
- [x] Dashboard 4 stat + filter workflow (per-workflow di board page)
- [x] Drag & drop antar stage (tombol geser sudah ada; DnD ditunda)

**Selesai jika:** webinar dummy bisa dijalanin end-to-end tanpa WA (staff centang + geser).

---

## Phase 2 — Pelanggan, import, paralel

Fitur 4.5, 5.2–5.5

- [x] Schema: `customers` (identitas: nama, wa) — card merujuk customer, bukan nama lepas
- [x] Assign / reassign assignee di card
- [x] Import CSV (`nama`, `wa`; opsional produk, tag) → `createCard` yang sama
- [x] Dedup: nomor sama di workflow yang sama → skip / update, tidak dobel diam-diam
- [x] Satu customer, banyak card di workflow berbeda (paralel)
- [x] Default assignee workflow terisi otomatis di card baru

**Selesai jika:** 100 baris CSV masuk Pending, Siti bisa punya card di 2 workflow.

---

## Phase 3 — Action WA + reminder staff

Fitur 3.2, 3.6, 6.1–6.4, 7.1

- [x] Action di baris checklist: `none` | `send` | `followup` + delay + template
- [x] Rule stage: `on_reply` → notify assignee; reminder overdue jam
- [x] Schema: job/outbox WA, `notifications`
- [x] Scheduler: kirim sesuai delay saat card di stage itu
- [x] Sukses kirim → centang item; gagal → flag card + notify assignee
- [x] Inbound reply (webhook WA) → handover ringan: notify + stop follow-up berikutnya
- [x] Reminder in-app jika card diam > X jam di stage
- [x] Gate tetap: action tidak auto-geser stage

**Selesai jika:** H-1 kirim 2 pesan + follow-up sore, checklist ikut kecentang, reply Siti → bell Diana.

---

## Phase 4 — Wizard AI + MCP

Fitur 2.4–2.5, 5.4

- [x] Pintu buat workflow: Manual | Setup dengan AI
- [x] Wizard: prompt → draf stage + checklist + action + template → preview → simpan
- [x] Generate teks template WA saat setup (bukan balasan live)
- [x] API `create_card` (workflow, nama, wa, produk, tag, source)
- [x] MCP tools: `create_card`, `notify_assignee` (siap dipakai chatbot)
- [x] *(opsional di phase ini)* `move_stage`, `stop_followups`

**Selesai jika:** Owner generate draf webinar dari 2 kalimat, dan chatbot/skrip bisa insert card lewat MCP.

---

## Phase 5 — Estafet + poles

Fitur 9.1, sisa wewenang

- [x] Rule stage: next workflow (1 tujuan)
- [x] Tombol “Lanjut ke …” di panel card → `createCard` di workflow tujuan
- [x] Card lama tetap di Done; customer yang sama
- [x] Reassign massal / dashboard Waiting Action → reassign
- [x] Empty state, error WA, CSV gagal parsial

**Selesai jika:** Converted di Webinar → card baru di Post Produk, Siti tetap kelihatan di kedua board.

---

## Phase 6 — Langganan, bayar, admin platform, voucher

Fitur 10, 11

- [x] Schema: `plans`, `subscriptions`, `vouchers`, `voucher_redemptions`
- [x] `users.platform_admin` boolean (role **platform**, bukan workspace)
- [x] Admin panel: daftar workspace / user / langganan
- [x] Admin: CRUD voucher, nonaktifkan kode
- [x] Admin: extend trial / ganti paket (comp)
- [x] Middleware `requirePlatformAdmin`

**Selesai jika:** Admin bisa lihat workspace, CRUD voucher, dan extend trial tanpa sentuh Kanban.


---

## Phase 7 — Integrasi, automasi, dan workflow intelligence

### 7.2 Model checklist dan stage

- [x] Finalisasi apakah checklist tetap menjadi langkah kerja di dalam stage atau dapat berperan sebagai sub-stage
- [x] Dokumentasikan aturan transisi dan dampaknya terhadap progress card sebelum mengubah model data

### 7.3 Integrasi Chat AI melalui MCP

- [x] Hubungkan chat AI nyata sebagai MCP client ke tools Flowboard
- [x] Izinkan Chat AI membuat card, memindahkan stage, memperbarui checklist, menghentikan follow-up, dan melakukan handover
- [x] Terapkan permission per workspace dan pembatasan tool yang dapat dipanggil agent
- [x] Uji alur end-to-end dari percakapan customer sampai perubahan terlihat di board

### 7.4 Statistik workflow

- [x] Tambahkan statistik workflow berdasarkan status dan stage
- [x] Tampilkan jumlah card aktif, tertahan, overdue, Waiting Action, dan selesai
- [x] Tambahkan breakdown per assignee dan rentang waktu

### 7.5 Integrasi Dripsender dan WhatsApp

- [x] Putuskan arsitektur integrasi: Flowboard sebagai displayer/orchestrator Dripsender atau sebagai gateway WhatsApp
- [x] Integrasikan Dripsender untuk pengiriman WhatsApp dan reminder pada workflow tertentu
- [x] Pertahankan queue dan action workflow di Flowboard sebagai sumber status automasi
- [x] Dukung koneksi WhatsApp melalui QR gateway atau API key sesuai arsitektur yang dipilih
- [x] Sinkronkan status queued, sent, delivered, read, dan failed dari Dripsender ke Flowboard
- [x] Tambahkan retry, idempotency, error handling, dan notifikasi ketika pengiriman gagal

### 7.6 Notification settings

- [x] Tambahkan pengaturan notifikasi email per user dan workspace , dan notifikasi wa
- [x] Tambahkan pilihan event email: overdue, WA gagal, customer reply, dan handover
- [x] Tambahkan opsi instant notification atau digest

**Selesai jika:** sistem eksternal dan Chat AI dapat mengubah workflow secara aman, checklist mendukung deadline dan auto-move, statistik operasional tersedia, Dripsender mengirim WhatsApp dengan status yang tersinkron, dan user dapat mengatur notifikasi email.

### 7.7 UI enhancement

Polish UX/UI yang belum optimal atau perlu peningkatan visual.

- [ ] Audit responsive layout dashboard (mobile/tablet) — pastikan Kanban board, card detail, dan settings usable di layar kecil
- [ ] Empty state illustration untuk board kosong, workflow kosong, dan integrasi kosong (saat ini cuma teks)
- [ ] Loading skeleton untuk Kanban board saat data masih di-fetch (saat ini blank/skeleton generic)
- [ ] Card detail panel: tambah badge status overdue + indikator follow-up stopped
- [ ] Toast notification untuk aksi CRUD (create/update/delete workflow, card, stage) — konsisten dengan integrations page
- [ ] Keyboard shortcut: `n` untuk new card, `e` untuk edit card, `/` untuk search
- [ ] Dark mode toggle di settings (saat ini theme switch ada di topbar tapi belum fully wired)
- [ ] Onboarding tour pertama kali user masuk dashboard (highlight key areas: board, setup, integrations)

---

## Ringkasan sistem role (3 lapisan)

```text
Lapisan 1 — Platform (Phase 6)     platform_admin
Lapisan 2 — Workspace (Phase 0)    owner | member
Lapisan 3 — Workflow (Phase 1)       workflow owner | card assignee
```

Jangan campur: workspace `owner` ≠ workflow `owner` (PIC proses). Satu orang bisa workspace `member` tapi jadi assignee banyak card.

---

## Phase 7.7 — Integrasi Wajom: poles UI & arsitektur connection

### UI: modal untuk add/edit connection

Saat ini form add/edit Wajom connection di `/dashboard/settings/integrations` render sebagai inline section (`{#if formOpen}`). Ganti pakai komponen `Dialog` (organism) supaya konsisten dengan pola modal di halaman lain (mis. workflow setup pakai `Dialog` untuk stage/checklist/action editor).

- [x] Refactor `+page.svelte` integrations: pindahkan form add/edit ke dalam `Dialog` (title dinamis: "Add connection" / "Edit connection")
- [x] Pindahkan state `formOpen` → `Dialog` open prop; reset form saat dialog close
- [x] Token issued banner (`issuedToken`) tetap tampil di luar modal setelah create sukses (jangan di dalam modal yang sudah tertutup)
- [x] Test send form inline di card connection — pertahankan (tidak pindah ke modal)

### Arsitektur: binding connection ↔ workspace (bukan workflow)

`default_workflow_id` dihapus dari `wajom_connections`. Connection sekarang bind ke **workspace**, bukan workflow. Scheduler WA (`findWajomConnectionForWorkspace`) cari connection aktif di workspace itu untuk kirim pesan action manapun. MCP tools (`register_customer`, `complete_onboarding_step`, dll) sekarang butuh param `workflow` eksplisit dari caller.

- [x] Hapus kolom `default_workflow_id` + unique index `wajom_connections_workspace_workflow_idx` dari schema
- [x] Hapus `defaultWorkflowId` dari `WajomConnectionInput`, `PublicWajomConnection`, `toPublicConnection`
- [x] Ganti `findWajomConnectionForWorkflow` → `findWajomConnectionForWorkspace` (cari connection aktif di workspace, order by createdAt)
- [x] Hapus `getWorkflowForConnection` dan `getBoundWorkflow`
- [x] MCP tools: `requireWorkflow(connection, workflowName)` — cari workflow by name di workspace; semua tool butuh param `workflow` required
- [x] `findCardForConnection` — butuh `workflowName` required (tidak ada fallback default)
- [x] Tool definitions: tambah `workflow` ke required params semua tool
- [x] Handler inbound reply: hapus `workflowId` dari `handleInboundWhatsappReply` (cari semua card customer di workspace)
- [x] Validators: hapus `defaultWorkflowId` dari Create/Update schema
- [x] API client types: hapus `defaultWorkflowId` dari `ApiWajomConnection` + method signatures
- [x] UI integrations: hapus field default workflow dari form + display card
- [x] Migration `0015_remove_wajom_default_workflow.sql` — drop index, FK, column
`workflow`

### Country code: hardcode ke 60 (Malaysia)

`countryCode` di-hardcode ke `'60'` (Malaysia). Field dihapus dari UI form integrations; backend tetap simpan kolom `country_code` (default `'60'`) untuk normalisasi nomor WA tanpa prefix negara.

- [x] Hapus field country code dari UI form add/edit connection
- [x] Ubah default schema `wajom_connections.country_code` dari `'62'` → `'60'`
- [x] Ubah fallback `validateCountryCode` dari `'62'` → `'60'`

### Allowed tools: hapus dari UI

Section "Allowed tools" dihapus dari UI form integrations. Backend tetap simpan `enabled_tools` (default semua tool aktif) — tidak perlu user-facing config.

- [x] Hapus section allowed tools + `toggleTool` dari `+page.svelte`
- [x] Form tidak lagi kirim `enabledTools` / `countryCode` (backend pakai default)

### MCP API keys: modal + rotate

Generate API key pindah ke modal (`Dialog`). Tombol Rotate ada di setiap row API key.

- [x] Generate API key: pindah dari inline form ke `Dialog` (input label + submit)
- [x] Key reveal: setelah create/rotate, plaintext key tampil di `Dialog` terpisah dengan copy button
- [x] Rotate: tombol di row API key (revoke key lama + create key baru dengan label sama, plaintext key baru muncul di Dialog reveal)
- [x] Backend: `rotateApiKey` service + `rotateApiKeyHandler` handler + route `POST /api-keys/rotate`
- [x] API client: `api.rotateApiKey`

### Connection card: simplify actions

Hapus tombol Export JSON, Rotate Token, Revoke dari connection card. Connection card sekarang hanya: Edit, Test Health, Test Send.

- [x] Hapus tombol Export JSON + handler `exportActions`
- [x] Hapus tombol Rotate Token + handler `rotateToken`
- [x] Hapus tombol Revoke + handler `revokeConnection`
- [x] Hapus state `exportingId` (unused)

### Health endpoint: portal.wajom.co

Health endpoint connection sekarang fixed `https://portal.wajom.co/api/internal/whatsapp/:instanceId/status` (bukan `api.wajom.co/health`). Auth pakai header `x-internal-api-token: <INTERNAL_API_TOKEN>`.

- [x] `healthEndpointFor(instanceId)` — build URL dengan instance ID
- [x] Transport: health check kirim header `x-internal-api-token` (bukan `authorization: Bearer`)
- [x] Backfill existing connections ke URL yang benar

---

## Di luar roadmap v1 (jangan kerjakan dulu)

- Auto-spawn estafet tanpa tombol
- Chat agent di dalam Flowboard / handover “advanced need”
- Nested Kanban
- Portal pelanggan, form publik, payment webhook **pelanggan** (bukan Stripe SaaS)
- Email / WA reminder ke staff
- Template marketplace, analytics funnel
- Impersonate workspace, refund self-serve, usage-based billing

---

## Roadmap V2

### Multi-workspace: lengkapi lifecycle

Sistem multi-workspace sudah jalan (schema, switch, invite, member, guard). Yang kurang: user tidak bisa **membuat workspace baru** sendiri dari UI, dan tidak ada flow untuk user yang **kehilangan workspace terakhir** (di-kick / workspace dihapus).

#### Buat workspace baru dari UI

Saat ini workspace hanya tercipta lewat auto-create saat register atau lewat invite ke workspace orang lain. User yang sudah login tidak bisa bikin workspace kedua/ketiga dari dashboard.

- [ ] API `POST /workspaces` — create workspace baru, user jadi `owner`, set sebagai `activeWorkspaceId`
- [ ] Validasi: batasi jumlah workspace per user (kuota plan, mis. free = 1, paid = N)
- [ ] UI: tombol "New workspace" di dropdown workspace switcher (topbar) atau halaman settings
- [ ] UI: modal form (nama workspace) → submit → switch ke workspace baru
- [ ] Setelah create, redirect ke `/dashboard` (empty state "Belum ada workflow")

#### Onboarding user tanpa workspace (edge case)

User bisa kehilangan workspace: di-kick oleh owner, atau workspace dihapus cascade. Saat ini tidak ada flow — user stuck di dashboard tanpa konteks workspace.

- [ ] Deteksi di `+layout.server.ts`: `activeWorkspaceId` null ATAU tidak ada membership → redirect ke onboarding
- [ ] Halaman onboarding `/onboarding/workspace`: form buat workspace baru ATAU tampilkan pesan "hubungi admin" kalau user seharusnya di-invite
- [ ] Kalau user punya membership di workspace lain tapi `activeWorkspaceId` null → auto-pilih workspace pertama
- [ ] Empty state: "Anda tidak punya workspace. Buat baru atau minta invite."

#### Settings workspace: rename & danger zone

- [ ] Halaman `/dashboard/settings/workspace`: rename workspace, lihat slug, danger zone (transfer ownership / delete workspace)
- [ ] Delete workspace: hanya owner, harus ada owner lain ATAU konfirmasi hard delete (cascade semua data)
- [ ] Transfer ownership: owner baru harus member existing

### Inbound reply: Wajom client → Flowboard

Saat ini Flowboard punya endpoint `POST /api/workspaces/:workspaceId/integrations/wajom/:connectionId/inbound/reply` yang trigger `onReplyNotify` + stop followups. Tapi Wajom client belum POST ke sana saat customer reply. Karena arsitektur sekarang MCP full (client tidak tahu workspace/connection Flowboard langsung), forwarding harus lewat Wajom Portal.

- [ ] Portal: endpoint `POST /api/internal/whatsapp/:id/inbound-reply` — terima `{ wa, message, requestId? }` dari client, resolve workspace + connection Flowboard, forward ke Flowboard `/inbound/reply`
- [ ] Portal: simpan mapping WA instance → Flowboard workspace + connection (sudah ada via MCP config, tinggal expose)
- [ ] Wajom client: hook `messages.upsert` → setelah `Bot.listener`, POST inbound reply ke portal (best-effort, tidak block chat flow)
- [ ] Idempotency: gunakan `requestId` dari message key untuk dedup
- [ ] Test: customer reply → Flowboard terima → assignee dapat notifikasi + followup jobs di-cancel

### Checklist: deadline & auto-move

- [ ] Tambahkan deadline pada setiap checklist item
- [ ] Tambahkan opsi auto-move ke stage berikutnya ketika seluruh checklist wajib selesai
- [ ] Pastikan auto-move tidak berjalan jika action masih pending, gagal, atau memerlukan persetujuan staff

### Billing & subscription

- [ ] Workspace baru → subscription `trial`
- [ ] Halaman billing Owner workspace: paket, status, redeem voucher
- [ ] Checkout provider + webhook → `active` / `past_due` / `canceled`
- [ ] Gate kuota (kursi, workflow, WA) + read-only jika lewat tenggang

### Workflow sync dari Wajom list

Saat ini workflow di Flowboard dibuat manual (blank atau via AI wizard). User Wajom sudah punya "list" (segmentasi kontak) di portal. Daripada re-create workflow dari scratch, user bisa import list Wajom sebagai workflow Flowboard — otomatis buat workflow + stage + import kontak sebagai cards.

- [ ] Portal: endpoint `GET /api/internal/whatsapp/:id/lists` — return list Wajom yang dimiliki instance ini (id, nama, jumlah member)
- [ ] Portal: endpoint `GET /api/internal/whatsapp/:id/lists/:listId/members` — return kontak di list (nama, wa)
- [ ] Flowboard: endpoint `POST /api/workspaces/:workspaceId/integrations/wajom/:connectionId/sync-list` — terima `{ listId, listName, workflowName?, stageName? }`, fetch members dari portal, buat workflow + stage awal + import cards
- [ ] Flowboard: UI di integrations page — tombol "Sync from Wajom list" → modal pilih list → pilih workflow (baru atau existing) → pilih stage tujuan → submit
- [ ] Dedup: kalau kontak sudah ada sebagai card di workflow itu, skip (sama seperti import CSV)
- [ ] Progress indicator: sync bisa lama untuk list besar, tampilkan progress di UI
- [ ] Mapping: list Wajom → 1 workflow Flowboard (atau tambah ke stage existing workflow)
