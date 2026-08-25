# NEW-TODO — Flowboard × Wajom

Rencana integrasi Flowboard sebagai plugin/tool provider di Wajom.

Acuan produk: [landing Flowboard](https://flowwboard.vercel.app/) · [PLAN.md](./PLAN.md) · [TODO.md](./TODO.md)

---

## 1. Keputusan arsitektur

Flowboard adalah aplikasi web customer onboarding sekaligus API provider.

```text
Staff / Leader
  └── Flowboard Web
        ├── workspace
        ├── workflow dan stage
        ├── customer card
        ├── checklist
        ├── assignee
        └── dashboard

Wajom AI
  └── Flowboard Connector / Custom Actions
        └── Flowboard Integration API
```

### Pembagian tanggung jawab

| Sistem | Tanggung jawab |
|---|---|
| **Flowboard Web** | Setup workflow, stage, checklist, card, assignee, dashboard, dan monitoring operasional |
| **Flowboard API** | Source of truth untuk status onboarding dan perubahan workflow |
| **Wajom** | WhatsApp connection, percakapan, AI, balasan customer, dan human handover |
| **Flowboard scheduler** | Menentukan reminder dan outbound job berdasarkan action checklist |
| **Wajom outbound adapter** | Mengirim pesan WhatsApp nyata dan mengembalikan status delivery |

RisanBusana hanya menjadi referensi pola **HTTP tool bridge + schema custom action**. Domain RisanBusana tidak dipindahkan ke Flowboard.

### Batas integrasi

- Flowboard Web tetap standalone; halaman web tidak di-embed ke Wajom.
- Wajom memanggil API Flowboard, bukan mengoperasikan UI Flowboard.
- Flowboard tetap menjadi source of truth untuk customer onboarding.
- Wajom tidak menerima akses database Flowboard.
- Custom action awal menggunakan `api_call`, bukan `database_query`.
- MCP wire protocol penuh tidak wajib untuk tahap pertama; HTTP tool bridge dengan schema terstruktur sudah cukup.

---

## 2. Kondisi codebase saat ini

### Sudah tersedia

- [x] Flowboard Web untuk workspace, workflow, stage, card, checklist, assignee, dan dashboard.
- [x] API prefix `/api`.
- [x] Integration API dengan autentikasi API key.
- [x] `GET /api/integrations/mcp/tools`.
- [x] `POST /api/integrations/mcp/call`.
- [x] `POST /api/integrations/cards`.
- [x] Tool internal `create_card`.
- [x] Tool internal `notify_assignee`.
- [x] Tool internal `move_stage`.
- [x] Tool internal `stop_followups`.
- [x] Service `getCardDetail()` untuk detail card.
- [x] Service `toggleChecklistItem()` untuk checklist.
- [x] Rule required checklist sebelum card maju ke stage berikutnya.
- [x] Queue/job model untuk scheduled WhatsApp action.
- [x] Handover inbound reply dan pembatalan follow-up card.

### Belum siap untuk Wajom

- [x] Tool AI untuk mencari status onboarding berdasarkan nomor WhatsApp.
- [x] Tool AI untuk menyelesaikan checklist berdasarkan nama langkah, bukan UUID internal.
- [x] Tool AI untuk memindahkan customer berdasarkan nama stage, bukan UUID internal.
- [x] Composite tool `handover_to_staff` yang menggabungkan stop follow-up dan notify assignee.
- [x] Binding satu koneksi Wajom ke workspace dan default workflow Flowboard.
- [x] Credential per koneksi, bukan satu API key global.
- [x] Penghapusan fallback development API key pada environment production.
- [x] Audit log dan idempotency untuk request dari Wajom.
- [ ] Reload tool runtime Wajom setelah custom action dibuat atau diubah (memerlukan Wajom runtime deployed).
- [x] Outbound adapter Flowboard → Wajom dan local mock transport sudah tersedia.
- [x] Sinkronisasi status `queued`, `sent`, `delivered`, `read`, dan `failed`.

---

## Phase A — Kontrak Flowboard Connector

### A.1 Definisikan tool AI-facing

- [x] Finalisasi nama dan deskripsi tool.
- [x] Finalisasi JSON schema setiap tool.
- [x] Gunakan nomor WhatsApp sebagai identifier utama customer.
- [x] Sembunyikan `workspaceId`, `workflowId`, `cardId`, dan `stageId` dari parameter AI jika dapat di-resolve server-side.
- [x] Dokumentasikan response sukses, not-found, validation error, permission error, dan conflict.

Target tool awal:

```text
get_onboarding_status
register_customer
complete_onboarding_step
move_customer_stage
handover_to_staff
```

### A.2 `get_onboarding_status`

- [x] Tambahkan resolver customer berdasarkan nomor WhatsApp di workspace.
- [x] Dukung satu customer dengan beberapa card di workflow berbeda.
- [x] Dukung filter workflow aktif/default.
- [x] Kembalikan customer, workflow, stage, assignee, checklist progress, dan status follow-up.
- [x] Kembalikan response aman untuk langsung dipakai AI.
- [x] Jangan mengembalikan data workspace lain.

Contoh input:

```json
{
  "wa": "60123456789"
}
```

### A.3 `register_customer`

- [x] Bungkus capability `create_card` dengan input bisnis yang sederhana.
- [x] Resolve default workflow dari binding koneksi Wajom.
- [x] Pertahankan deduplication customer/card yang sudah ada.
- [x] Return `cardId`, `customerId`, initial stage, dan assignee.
- [x] Pastikan request retry tidak membuat card ganda.

Contoh input:

```json
{
  "name": "Siti Aminah",
  "wa": "60123456789",
  "product": "VIP Registration",
  "tag": "new-lead"
}
```

### A.4 `complete_onboarding_step`

- [x] Expose `toggleChecklistItem()` melalui integration layer.
- [x] Resolve card berdasarkan `wa` dan workflow aktif.
- [x] Resolve checklist item berdasarkan label/step yang disetujui.
- [x] Tolak item yang bukan milik stage aktif.
- [x] Pertahankan validasi `required` dan perubahan progress.
- [x] Buat operasi idempotent jika item sudah `done`.

Contoh input:

```json
{
  "wa": "60123456789",
  "step": "Upload dokumen",
  "done": true
}
```

### A.5 `move_customer_stage`

- [x] Resolve card berdasarkan nomor WhatsApp.
- [x] Resolve target berdasarkan nama stage atau normalized stage alias.
- [x] Pertahankan rule required checklist sebelum maju.
- [x] Copy checklist stage baru dan jalankan stage-entry action.
- [x] Kembalikan stage lama, stage baru, dan checklist progress.
- [x] Jangan izinkan AI melewati permission workspace/workflow.

Contoh input:

```json
{
  "wa": "60123456789",
  "stage": "Learning Portal"
}
```

### A.6 `handover_to_staff`

- [x] Gabungkan `stop_followups` dan `notify_assignee` dalam satu operasi bisnis.
- [x] Simpan alasan handover.
- [x] Hentikan pending follow-up customer.
- [x] Notify assignee card.
- [x] Kembalikan status `followupsStopped` dan assignee.
- [x] Pastikan retry tidak mengirim notifikasi duplikat.

Contoh input:

```json
{
  "wa": "60123456789",
  "reason": "Customer meminta bantuan staff untuk pembayaran."
}
```

---

## Phase B — Multi-tenant connection dan keamanan

- [x] Buat model koneksi Flowboard–Wajom.
- [x] Simpan mapping `wajom_instance → workspace`.
- [x] Simpan default workflow per koneksi.
- [x] Gunakan credential/token per koneksi atau per workspace.
- [x] Jangan menerima `workspaceId` bebas dari AI.
- [x] Hapus default `dev-flowboard-key` untuk deployment production.
- [x] Tambahkan revoke/rotate credential.
- [x] Redact API key, authorization header, dan credential dari log.
- [x] Batasi tool yang aktif per koneksi Wajom.
- [x] Terapkan rate limit untuk endpoint integration.
- [x] Validasi semua resource berada pada workspace yang terikat credential.
- [x] Tambahkan audit event: caller, workspace, tool, request id, result, latency, dan error.

---

## Phase C — Integration API Flowboard

- [x] Pertahankan `/api/integrations/mcp/*` sebagai low-level/internal compatibility API.
- [x] Tambahkan adapter API yang AI-facing dan tidak membutuhkan UUID internal.
- [x] Pilih kontrak final: endpoint per tool atau dispatcher tool yang typed.
- [x] Pastikan response selalu punya format konsisten:

```json
{
  "ok": true,
  "tool": "get_onboarding_status",
  "result": {}
}
```
- [x] Gunakan error code stabil: `not_found`, `invalid_input`, `permission_denied`, `conflict`, `rate_limited`.
- [x] Tambahkan request id dan idempotency key untuk operasi write.
- [ ] Uji retry dari Wajom tanpa duplicate card, notification, atau handover.
- [x] Tambahkan health check untuk koneksi Flowboard–Wajom.

---

## Phase D — Wajom Custom Actions

### D.1 Action preset

- [x] Expose preset `Flowboard Onboarding` melalui manifest contract Flowboard untuk Wajom custom actions.
  - `get_onboarding_status`
  - `register_customer`
  - `complete_onboarding_step`
  - `move_customer_stage`
  - `handover_to_staff`
- [x] Semua action memakai `api_call`.
- [x] Simpan endpoint dan schema secara typed.
- [x] Simpan workspace/workflow binding di credential/config, bukan di prompt AI.
- [x] Tandai read action dan write action secara terpisah.
- [x] Tandai `move_customer_stage` dan `handover_to_staff` sebagai side effect.
- [x] Tambahkan confirmation policy untuk operasi yang menghentikan follow-up atau mengubah stage.
- [x] Jangan mengaktifkan action untuk semua WhatsApp instance secara global.
### D.2 Runtime reload

- [ ] Setelah preset dibuat, trigger reload Chat AI pada Wajom instance.
- [ ] Setelah action diubah/dihapus, invalidate tool registry.
- [ ] Tampilkan status `saved`, `loaded`, atau `reload_required` di portal.
- [ ] Uji action baru tanpa restart manual seluruh service jika memungkinkan.

### D.3 Native integration provider — tahap lanjutan

- [x] Evaluasi connector `flowboard` pada registry `chat_ai_integrations` Wajom melalui native manifest contract.
- [ ] Pindahkan credential dan workspace binding ke Wajom integration registry setelah registry native tersedia.
- [x] Gunakan custom action preset sebagai jalur kompatibilitas awal.
- [x] Jangan menduplikasi definisi tool antara legacy custom action dan native integration.
---

## Phase E — Workflow start, follow-up, dan WhatsApp outbound

Workflow Flowboard menjadi trigger automation. Wajom menjadi transport WhatsApp.

### E.1 Start workflow

- [x] `register_customer` membuat card di stage pertama workflow.
- [x] `createCard()` memanggil stage-entry hook setelah card dibuat.
- [x] Stage-entry hook membuat job dari checklist action stage tersebut.
- [x] `moveCardToStage()` juga menjalankan stage-entry hook.
- [x] Pastikan workflow yang dipilih berasal dari binding Wajom, bukan input bebas dari AI.
- [x] Pastikan operasi register retry-safe dan tidak membuat card ganda.
Flow yang diinginkan:

```text
Wajom AI → register_customer
              ↓
        Flowboard create card
              ↓
        masuk stage pertama
              ↓
        schedule action stage
              ↓
        Wajom send-message API
```

Jika stage pertama memiliki action `send`, customer menerima pesan intro setelah card dibuat. Jika memiliki action `followup`, Flowboard menjadwalkan follow-up berdasarkan delay.

### E.2 Tipe action workflow

- [x] `send` = pesan satu kali ketika card masuk stage.
- [x] `followup` = pesan tertunda jika customer belum membalas.
- [x] `on_reply` = rule stage untuk notify assignee dan menghentikan follow-up berikutnya.
- [x] Handover manual/AI = menghentikan follow-up pending tanpa membatalkan pesan yang sudah terkirim.
- [x] Sukses pengiriman mengubah checklist item terkait menjadi `done`.
- [x] Gagal pengiriman mempertahankan item terbuka, menandai card error, dan notify assignee.
- [x] Action tidak otomatis memindahkan stage kecuali ada rule eksplisit dan permission yang sesuai.
### E.3 Outbound contract Flowboard → Wajom

- [x] Buat configurable Wajom send endpoint untuk mengirim pesan dari Flowboard.
- [x] Flowboard mengirim nomor tujuan, message body, dan metadata job.
- [x] Sertakan `workspaceId`, `cardId`, `checklistItemId`, `jobId`, dan `idempotencyKey` sebagai metadata internal.
- [x] Credential dan instance Wajom ditentukan dari connection binding, bukan dari AI.
Contoh payload:

```json
{
  "to": "60123456789",
  "message": "Selamat datang! Ini link portal pembelajaran anda.",
  "idempotencyKey": "whatsapp-job-uuid",
  "metadata": {
    "workspaceId": "workspace-uuid",
    "cardId": "card-uuid",
    "checklistItemId": "checklist-item-uuid",
    "jobId": "job-uuid"
  }
}
```

- [x] Wajom mengembalikan `providerMessageId` dan status accepted/sent.
- [x] Sinkronkan status `queued`, `sent`, `delivered`, `read`, dan `failed`.
- [x] Flowboard hanya menandai action selesai sesuai status delivery yang disepakati.
- [x] Tambahkan retry dengan idempotency; retry tidak boleh mengirim pesan dua kali.
- [x] Redact credential dan payload sensitif dari log.
- [x] Hindari scheduler ganda di Flowboard dan Wajom.
### E.4 Inbound reply

- [x] Wajom meneruskan inbound reply ke Flowboard dengan nomor WhatsApp dan correlation metadata.
- [x] Flowboard mencari card aktif berdasarkan nomor WhatsApp dan workflow binding.
- [x] Reply membatalkan pending `followup` yang relevan.
- [x] Reply dapat menyelesaikan checklist item `followup` jika rule action mengizinkan.
- [x] Reply memicu notification assignee sesuai rule stage.
- [x] AI Wajom tetap menangani balasan dinamis; Flowboard hanya menyimpan state dan menjalankan rule workflow.
### E.5 Flowboard Web

- [x] Owner memilih Wajom connection pada workspace atau workflow.
- [x] Owner mengatur action `send`/`followup` langsung pada checklist item.
- [x] Owner melihat status job, retry, error, dan delivery.
- [x] Owner dapat test send tanpa mengubah progress card.
- [x] Flowboard menampilkan channel/instance Wajom yang dipakai workflow.
---

## Phase F — Flowboard Web integration settings

- [x] Tambahkan halaman integration settings pada Flowboard Web.
- [x] Tampilkan koneksi Wajom yang terhubung.
- [x] Pilih workspace dan default workflow untuk koneksi.
- [x] Buat/revoke/rotate credential.
- [x] Tampilkan daftar tool yang enabled.
- [x] Tampilkan last request, last error, dan connection health.
- [x] Jangan pernah menampilkan credential penuh setelah dibuat.
- [x] Sediakan test connection yang tidak mengubah data.
---

## Phase G — End-to-end verification

> Live Wajom end-to-end execution is intentionally deferred until the Wajom instance is deployed. Flowboard-side mock transport, type checks, and production build remain the local verification path.

### Customer onboarding

- [ ] Customer baru chat melalui Wajom.
- [ ] AI memanggil `get_onboarding_status`.
- [ ] Jika belum ada card, AI memanggil `register_customer`.
- [ ] Flowboard membuat card di workflow yang benar.
- [ ] Default assignee terisi.
- [ ] Checklist stage pertama tercopy.

### Progress update

- [ ] Customer menyelesaikan satu langkah.
- [ ] AI memanggil `complete_onboarding_step`.
- [ ] Checklist berubah di Flowboard Web.
- [ ] Progress card berubah.
- [ ] AI tidak dapat menandai item dari stage lain.

### Stage transition

- [ ] AI meminta perpindahan stage.
- [ ] Flowboard menolak jika required checklist belum selesai.
- [ ] Flowboard mengizinkan jika semua rule terpenuhi.
- [ ] Checklist stage baru tercopy.
- [ ] Stage-entry job dibuat tepat satu kali.

### Human handover

- [ ] Customer meminta staff.
- [ ] AI memanggil `handover_to_staff`.
- [ ] Pending follow-up dibatalkan.
- [ ] Assignee menerima notification.
- [ ] Retry handover tidak membuat notification ganda.

### Security dan tenancy

- [ ] Credential workspace A tidak dapat membaca workspace B.
- [ ] Wajom instance A tidak dapat memakai workflow instance B.
- [ ] AI tidak dapat memilih workspace ID arbitrer.
- [ ] Credential tidak muncul di log.
- [ ] Request tanpa atau dengan credential invalid mendapat `401`.
- [ ] Rate limit dan audit log bekerja.

### Outbound WhatsApp

- [ ] Flowboard membuat scheduled job.
- [ ] Wajom menerima outbound request.
- [ ] Pesan terkirim ke nomor yang benar.
- [ ] Status delivery tersinkron.
- [ ] Pengiriman gagal membuat error flag dan notification.
- [ ] Retry tidak mengirim pesan dua kali.

---

## 3. Tidak termasuk scope

- [ ] Cart, product catalog, order, checkout, atau invoice RisanBusana.
- [ ] Menyalin frontend Flowboard ke Wajom.
- [ ] Membuat chatbot utama di dalam Flowboard.
- [ ] Memberi Wajom akses langsung ke database Flowboard.
- [ ] Generic `database_query` sebagai custom action.
- [ ] Auto-move stage tanpa rule dan permission eksplisit.
- [ ] Mengirim pesan dari dua scheduler berbeda.
- [ ] Menjadikan UUID internal sebagai pengetahuan yang wajib dimiliki AI.

---

## Acceptance criteria

Integrasi dianggap selesai jika:

1. Staff dapat mengatur workflow dari Flowboard Web.
2. Satu Wajom instance dapat di-bind ke satu workspace dan workflow Flowboard.
3. Wajom AI dapat membaca status customer berdasarkan nomor WhatsApp.
4. Wajom AI dapat membuat card baru tanpa mengetahui UUID internal.
5. Wajom AI dapat menyelesaikan checklist yang benar.
6. Wajom AI tidak dapat melewati required checklist saat memindahkan stage.
7. Handover menghentikan follow-up dan memberi notification ke assignee.
8. Scheduled message dikirim melalui Wajom tanpa scheduler ganda.
9. Workspace lain tidak dapat diakses melalui credential atau input AI.
10. Seluruh alur terlihat konsisten di Flowboard Web dan percakapan Wajom.
