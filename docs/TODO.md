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

- [ ] Schema: `plans`, `subscriptions`, `vouchers`, `voucher_redemptions`
- [ ] `users.platform_admin` boolean (role **platform**, bukan workspace)
- [ ] Workspace baru → subscription `trial`
- [ ] Halaman billing Owner workspace: paket, status, redeem voucher
- [ ] Checkout provider + webhook → `active` / `past_due` / `canceled`
- [ ] Gate kuota (kursi, workflow, WA) + read-only jika lewat tenggang
- [ ] Admin panel: daftar workspace / user / langganan
- [ ] Admin: CRUD voucher, nonaktifkan kode
- [ ] Admin: extend trial / ganti paket (comp)
- [ ] Middleware `requirePlatformAdmin`

**Selesai jika:** Owner bayar pakai voucher, admin bisa lihat workspace itu dan extend trial tanpa sentuh Kanban.


---

## Phase 7 — Integrasi, automasi, dan workflow intelligence

### 7.2 Model checklist dan stage

- [ ] Finalisasi apakah checklist tetap menjadi langkah kerja di dalam stage atau dapat berperan sebagai sub-stage
- [ ] Dokumentasikan aturan transisi dan dampaknya terhadap progress card sebelum mengubah model data
- [ ] Tambahkan deadline pada setiap checklist item
- [ ] Tambahkan opsi auto-move ke stage berikutnya ketika seluruh checklist wajib selesai
- [ ] Pastikan auto-move tidak berjalan jika action masih pending, gagal, atau memerlukan persetujuan staff

### 7.3 Integrasi Chat AI melalui MCP

- [ ] Hubungkan chat AI nyata sebagai MCP client ke tools Flowboard
- [ ] Izinkan Chat AI membuat card, memindahkan stage, memperbarui checklist, menghentikan follow-up, dan melakukan handover
- [ ] Terapkan permission per workspace dan pembatasan tool yang dapat dipanggil agent
- [ ] Uji alur end-to-end dari percakapan customer sampai perubahan terlihat di board

### 7.4 Statistik workflow

- [ ] Tambahkan statistik workflow berdasarkan status dan stage
- [ ] Tampilkan jumlah card aktif, tertahan, overdue, Waiting Action, dan selesai
- [ ] Tambahkan breakdown per assignee dan rentang waktu

### 7.5 Integrasi Dripsender dan WhatsApp

- [ ] Putuskan arsitektur integrasi: Flowboard sebagai displayer/orchestrator Dripsender atau sebagai gateway WhatsApp
- [ ] Integrasikan Dripsender untuk pengiriman WhatsApp dan reminder pada workflow tertentu
- [ ] Pertahankan queue dan action workflow di Flowboard sebagai sumber status automasi
- [ ] Dukung koneksi WhatsApp melalui QR gateway atau API key sesuai arsitektur yang dipilih
- [ ] Sinkronkan status queued, sent, delivered, read, dan failed dari Dripsender ke Flowboard
- [ ] Tambahkan retry, idempotency, error handling, dan notifikasi ketika pengiriman gagal

### 7.6 Notification settings

- [ ] Tambahkan pengaturan notifikasi email per user dan workspace , dan notifikasi wa
- [ ] Tambahkan pilihan event email: overdue, WA gagal, customer reply, dan handover
- [ ] Tambahkan opsi instant notification atau digest

**Selesai jika:** sistem eksternal dan Chat AI dapat mengubah workflow secara aman, checklist mendukung deadline dan auto-move, statistik operasional tersedia, Dripsender mengirim WhatsApp dengan status yang tersinkron, dan user dapat mengatur notifikasi email.

---

## Ringkasan sistem role (3 lapisan)

```text
Lapisan 1 — Platform (Phase 6)     platform_admin
Lapisan 2 — Workspace (Phase 0)    owner | member
Lapisan 3 — Workflow (Phase 1)       workflow owner | card assignee
```

Jangan campur: workspace `owner` ≠ workflow `owner` (PIC proses). Satu orang bisa workspace `member` tapi jadi assignee banyak card.

---

## Di luar roadmap v1 (jangan kerjakan dulu)

- Auto-spawn estafet tanpa tombol
- Chat agent di dalam Flowboard / handover “advanced need”
- Nested Kanban
- Portal pelanggan, form publik, payment webhook **pelanggan** (bukan Stripe SaaS)
- Email / WA reminder ke staff
- Template marketplace, analytics funnel
- Impersonate workspace, refund self-serve, usage-based billing
