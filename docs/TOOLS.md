# Flowboard × Wajom Chat AI — Custom Tools

Panduan konfigurasi Custom Actions untuk menghubungkan Wajom Chat AI dengan Flowboard.

Flowboard adalah source of truth untuk customer onboarding:

- customer
- workflow
- stage
- checklist
- assignee
- follow-up
- handover

Wajom bertanggung jawab atas WhatsApp, percakapan, AI, dan balasan customer.

Flowboard **tidak** menyediakan cart, product catalog, order, checkout, payment, atau fitur e-commerce.

---

## 1. Connection

Buat koneksi baru di:

```text
Flowboard → Dashboard → Settings → Integrations
```

Setelah koneksi dibuat, Flowboard menampilkan `connectorToken`. Token hanya ditampilkan ketika koneksi dibuat atau token di-rotate.

### Base URL

```text
https://<FLOWBOARD_DOMAIN>
```

Contoh:

```text
https://flowboard.example.com
```

### Authentication

Semua request Wajom ke Flowboard menggunakan token koneksi:

```http
Authorization: Bearer <CONNECTOR_TOKEN>
Content-Type: application/json
```

Jangan gunakan API key global atau token yang sama untuk semua workspace. Token Flowboard mengikat request ke satu koneksi Wajom, workspace, dan default workflow.

### Credential berbeda untuk outbound

`connectorToken` dipakai untuk:

```text
Wajom → Flowboard
```

`sendApiKey` pada form koneksi dipakai untuk:

```text
Flowboard → Wajom send-message endpoint
```

Keduanya bukan credential yang sama.

---

## 2. Transport

Flowboard menggunakan satu dispatcher endpoint untuk semua tool.

```text
POST https://<FLOWBOARD_DOMAIN>/api/integrations/wajom/call
```

Jangan membuat endpoint berbeda untuk setiap tool. Nama tool dikirim pada field `tool`.

### Success response

```json
{
  "ok": true,
  "tool": "get_onboarding_status",
  "result": {}
}
```

### Error response

```json
{
  "ok": false,
  "tool": "get_onboarding_status",
  "error": "Customer belum terdaftar di workflow ini.",
  "code": "not_found",
  "requestId": "request-uuid"
}
```

Error code yang dapat dipakai oleh Chat AI:

```text
not_found
invalid_input
permission_denied
conflict
tool_disabled
rate_limited
```

### Manifest

Jika Wajom dapat membaca manifest provider, gunakan:

```http
GET https://<FLOWBOARD_DOMAIN>/api/integrations/wajom/manifest
Authorization: Bearer <CONNECTOR_TOKEN>
```

Manifest berisi action yang aktif untuk koneksi tersebut. Jika runtime Wajom belum mendukung import manifest, tambahkan lima Custom Action di bawah secara manual.

---

## 3. Common Custom Action fields

Untuk setiap action:

```text
Action Type : API CALL
HTTP Method : POST
Endpoint    : https://<FLOWBOARD_DOMAIN>/api/integrations/wajom/call
```

Headers:

```json
{
  "Authorization": "Bearer <CONNECTOR_TOKEN>",
  "Content-Type": "application/json"
}
```

`workspaceId`, `workflowId`, `cardId`, dan `stageId` tidak boleh diminta dari user atau dikirim sebagai parameter AI. Flowboard me-resolve resource tersebut dari token koneksi dan input bisnis.

---

# 4. Tools yang harus ditambahkan

## 1. `get_onboarding_status`

### Purpose

Baca status onboarding customer berdasarkan nomor WhatsApp. Gunakan sebelum melakukan operasi lain pada customer yang sudah ada.

### Custom Action

```text
Name        : get_onboarding_status
Action Type : API CALL
HTTP Method : POST
```

Description:

```text
Read the onboarding status for a customer by WhatsApp number, including workflow, stage, checklist progress, assignee, and follow-up state.
```

Payload Template:

```json
{
  "tool": "get_onboarding_status",
  "arguments": {
    "wa": "{{wa}}"
  }
}
```

Parameters:

```json
{
  "wa": {
    "type": "string",
    "description": "Nomor WhatsApp customer, termasuk kode negara tanpa tanda +."
  }
}
```

Required parameters:

```json
[
  "wa"
]
```

### Optional workflow filter

Untuk mencari card pada workflow tertentu, tambahkan parameter:

```json
{
  "workflow": {
    "type": "string",
    "description": "Nama workflow yang ingin dicari. Kosongkan untuk memakai default workflow koneksi."
  }
}
```

Dan tambahkan ke payload hanya ketika nilainya tersedia:

```json
"workflow": "{{workflow}}"
```

Jika Wajom tidak mengirim parameter opsional, hapus field tersebut dari payload. Jangan mengirim literal `{{workflow}}`.

---

## 2. `register_customer`

### Purpose

Daftarkan customer baru ke default workflow koneksi Flowboard. Tool ini membuat customer dan card onboarding pada stage pertama.

Jangan gunakan jika `get_onboarding_status` sudah menemukan card aktif.

### Custom Action

```text
Name        : register_customer
Action Type : API CALL
HTTP Method : POST
```

Description:

```text
Register a new customer in the Flowboard onboarding workflow. Use only when the customer does not already have an onboarding card.
```

Payload Template:

```json
{
  "tool": "register_customer",
  "arguments": {
    "name": "{{name}}",
    "wa": "{{wa}}"
  },
  "idempotencyKey": "{{request_id}}",
  "requestId": "{{request_id}}"
}
```

Parameters:

```json
{
  "name": {
    "type": "string",
    "description": "Nama customer."
  },
  "wa": {
    "type": "string",
    "description": "Nomor WhatsApp customer, termasuk kode negara tanpa tanda +."
  },
  "request_id": {
    "type": "string",
    "description": "UUID baru untuk setiap percobaan operasi. Generate otomatis dan jangan gunakan ulang untuk operasi baru."
  }
}
```

Required parameters:

```json
[
  "name",
  "wa",
  "request_id"
]
```

### Optional fields

`product` dan `tag` dapat ditambahkan pada `arguments` jika Wajom mengirim nilainya:

```json
{
  "product": "{{product}}",
  "tag": "{{tag}}"
}
```

Jangan mengirim placeholder yang belum terisi.

### Idempotency

`request_id` harus berupa UUID baru untuk setiap operasi register. Retry dengan UUID yang sama aman; Flowboard akan mencegah card duplikat.

---

## 3. `complete_onboarding_step`

### Purpose

Tandai checklist step customer sebagai selesai berdasarkan label step, bukan UUID internal.

### Custom Action

```text
Name        : complete_onboarding_step
Action Type : API CALL
HTTP Method : POST
```

Description:

```text
Mark a checklist step complete for the customer's active onboarding card. Use the exact checklist label when possible.
```

Payload Template:

```json
{
  "tool": "complete_onboarding_step",
  "arguments": {
    "wa": "{{wa}}",
    "step": "{{step}}"
  },
  "idempotencyKey": "{{request_id}}",
  "requestId": "{{request_id}}"
}
```

Parameters:

```json
{
  "wa": {
    "type": "string",
    "description": "Nomor WhatsApp customer."
  },
  "step": {
    "type": "string",
    "description": "Nama checklist step yang harus ditandai selesai."
  },
  "request_id": {
    "type": "string",
    "description": "UUID baru untuk setiap operasi. Generate otomatis."
  }
}
```

Required parameters:

```json
[
  "wa",
  "step",
  "request_id"
]
```

Tool ini memakai `done=true` secara default. Untuk konfigurasi manual Custom Action, jangan kirim `done` kecuali Wajom dapat mengirim boolean JSON yang sebenarnya.

---

## 4. `move_customer_stage`

### Purpose

Pindahkan card customer ke stage lain berdasarkan nama stage. Flowboard tetap menjalankan validasi required checklist dan permission workflow.

### Custom Action

```text
Name        : move_customer_stage
Action Type : API CALL
HTTP Method : POST
```

Description:

```text
Move the customer's active onboarding card to another stage by stage name. Confirm with the customer before performing this side effect.
```

Payload Template:

```json
{
  "tool": "move_customer_stage",
  "arguments": {
    "wa": "{{wa}}",
    "stage": "{{stage}}"
  },
  "idempotencyKey": "{{request_id}}",
  "requestId": "{{request_id}}"
}
```

Parameters:

```json
{
  "wa": {
    "type": "string",
    "description": "Nomor WhatsApp customer."
  },
  "stage": {
    "type": "string",
    "description": "Nama stage tujuan."
  },
  "request_id": {
    "type": "string",
    "description": "UUID baru untuk setiap operasi. Generate otomatis."
  }
}
```

Required parameters:

```json
[
  "wa",
  "stage",
  "request_id"
]
```

Confirmation:

```text
Required before calling the action.
```

Jika checklist required belum selesai, Flowboard mengembalikan `conflict` dan stage tidak berubah.

---

## 5. `handover_to_staff`

### Purpose

Hentikan follow-up customer dan beri notifikasi kepada assignee card dengan alasan handover.

### Custom Action

```text
Name        : handover_to_staff
Action Type : API CALL
HTTP Method : POST
```

Description:

```text
Hand over the customer to the assigned staff member. Stop pending follow-ups and notify the assignee with the handover reason. Confirm before calling.
```

Payload Template:

```json
{
  "tool": "handover_to_staff",
  "arguments": {
    "wa": "{{wa}}",
    "reason": "{{reason}}"
  },
  "idempotencyKey": "{{request_id}}",
  "requestId": "{{request_id}}"
}
```

Parameters:

```json
{
  "wa": {
    "type": "string",
    "description": "Nomor WhatsApp customer."
  },
  "reason": {
    "type": "string",
    "description": "Alasan customer dialihkan ke staff."
  },
  "request_id": {
    "type": "string",
    "description": "UUID baru untuk setiap operasi. Generate otomatis."
  }
}
```

Required parameters:

```json
[
  "wa",
  "reason",
  "request_id"
]
```

Confirmation:

```text
Required before calling the action.
```

Retry dengan `request_id` yang sama tidak boleh membuat handover notification duplikat.

---

# 5. Recommended AI flow

```text
Customer asks about onboarding
        ↓
get_onboarding_status
        ↓
Customer not found?
        ↓
register_customer
        ↓
Customer completes a requirement
        ↓
complete_onboarding_step
        ↓
All required checklist complete?
        ↓
move_customer_stage
```

Jika customer meminta bantuan manusia:

```text
get_onboarding_status
        ↓
confirm handover reason
        ↓
handover_to_staff
```

Rules untuk Chat AI:

- Selalu gunakan nomor WhatsApp sebagai identifier customer.
- Jangan meminta atau menampilkan `workspaceId`, `workflowId`, `cardId`, atau `stageId`.
- Jangan membuat customer/card baru sebelum memanggil `get_onboarding_status`.
- Jangan memindahkan stage tanpa konfirmasi customer.
- Jangan menjalankan `handover_to_staff` tanpa konfirmasi customer.
- Gunakan nama checklist dan stage yang terlihat di response Flowboard.
- Jangan menganggap HTTP `200` sebagai satu-satunya indikator sukses; periksa field `ok`.
- Untuk write tool, generate `request_id` baru untuk operasi baru dan gunakan kembali saat retry operasi yang sama.
- Jangan mengirim token, API key, atau credential ke customer.

---

# 6. Adding a future tool

Tool baru di Flowboard harus melalui source code terlebih dahulu. Update:

```text
app/services/wajom-connections.ts
app/services/wajom-tools.ts
app/pages/dashboard/settings/integrations/+page.svelte
app/lib/i18n/dashboard.en.ts
app/lib/i18n/dashboard.ms.ts
```

Di `app/services/wajom-tools.ts`:

1. Tambahkan nama tool pada `WAJOM_TOOL_NAMES`.
2. Tambahkan definition dan `inputSchema` pada `WAJOM_TOOL_DEFINITIONS`.
3. Implement resolver dengan workspace dari `WajomConnection`.
4. Tambahkan `case` pada `executeWajomTool()`.
5. Tandai read-only atau side effect.
6. Tambahkan idempotency untuk setiap write tool.
7. Tambahkan confirmation policy untuk perubahan stage atau handover.

Setelah deploy, reload atau import ulang tool registry Wajom agar action baru tersedia di Chat AI.
