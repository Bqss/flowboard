# WhatsApp Instance Status Endpoint

Endpoint proxy di **wajom** untuk mengecek status koneksi sebuah WhatsApp instance secara real-time. Memanggil endpoint `/status` di sisi **dripsender-client** (worker Bailey) dan menormalisasi responsnya.

## Route

```
GET /api/internal/whatsapp/:id/status
```

- **File route:** `wajom/routes/web.ts` (di blok `// Internal API ...`)
- **Handler:** `WhatsappController.instanceStatus` (`wajom/app/controllers/WhatsappController.ts`)

## Autentikasi

Guarded oleh middleware `internalApiAuth` (`wajom/app/middlewares/internalApiAuth.ts`).

- Header wajib: `x-internal-api-token: <INTERNAL_API_TOKEN>`
- Token dibaca dari env `INTERNAL_API_TOKEN`.
- Jika env belum dikonfigurasi → `503 { error: "INTERNAL_API_TOKEN not configured on portal" }`.
- Jika token tidak cocok / tidak dikirim → `401 { error: "Unauthorized" }`.

Tidak menerima sesi browser / API key user biasa — hanya token internal.

## Access Control

Tidak ada cek kepemilikan. Endpoint ini **internal trust** — selama token benar, status instance apapun bisa diambil. Asumsi: pemanggil adalah service internal tepercaya (portal, chatbot, cron, dsb).

## Parameter

| Param | Lokasi | Wajib | Deskripsi |
|---|---|---|---|
| `id` | path | ya | `whatsapps.id` (UUID) |

## Response

Sukses selalu `200 OK` dengan JSON. Error auth/token dari middleware balas `401`/`503` (lihat tabel error response). Skema sukses:

```ts
{
  online: boolean,      // worker hidup & reachable
  ready: boolean,       // Bailey siap menerima perintah (WhatsApp terhubung)
  connection: string | null,  // state koneksi Baileys: "open" | "close" | "connecting" | null
  version: string | null,     // versi dripsender-client
  error?: string        // hanya ada saat online=false
}
```

### Skenario respons

| Kondisi | `online` | `ready` | `connection` | `error` |
|---|---|---|---|---|
| WhatsApp terhubung | `true` | `true` | `"open"` | — |
| Worker hidup, QR menunggu scan | `true` | `false` | `"connecting"` | — |
| Worker hidup, disconnect | `true` | `false` | `"close"` | — |
| Worker hidup, sleep (5x QR gagal) | `true` | `false` | (last value) | — |
| Worker mati / port tidak listen | `false` | `false` | `null` | `"Instance is down or unreachable"` |
| Worker balas 401 (auth gagal) | `false` | `false` | `null` | `"Unauthorized by worker"` |
| Worker balas non-200 lain | `false` | `false` | `null` | `"Worker responded with status <code>"` |
| Timeout (5 detik) | `false` | `false` | `null` | `"Instance is down or unreachable"` |

### Contoh pemakaian

```bash
curl -H "x-internal-api-token: $INTERNAL_API_TOKEN" \
  https://api.wajom.co/api/internal/whatsapp/5ba1d673-74dd-4b6c-a3bb-e4b0b240ee50/status
```

**Terhubung:**
```json
{ "online": true, "ready": true, "connection": "open", "version": "3.2.1" }
```

**Menunggu QR:**
```json
{ "online": true, "ready": false, "connection": "connecting", "version": "3.2.1" }
```

**Instance mati:**
```json
{
  "online": false,
  "ready": false,
  "connection": null,
  "version": null,
  "error": "Instance is down or unreachable"
}
```

### Error response

| Status | Body | Penyebab |
|---|---|---|
| `400` | `{ "error": "WhatsApp id is required" }` | `:id` kosong |
| `401` | `{ "error": "Unauthorized" }` | Token salah / tidak dikirim |
| `404` | `{ "error": "WhatsApp not found" }` | Instance tidak ada di DB |
| `503` | `{ "error": "INTERNAL_API_TOKEN not configured on portal" }` | Env `INTERNAL_API_TOKEN` kosong di server |

## Implementasi

### Alur

1. Middleware `internalApiAuth` cek header `x-internal-api-token` vs env `INTERNAL_API_TOKEN`.
2. Ambil `wa_id` dari `request.params.id`.
3. Ambil row `whatsapps` by `id` (tanpa cek kepemilikan — internal trust).
4. Ambil `connect_url` instance:
   - Development (`DB_CONNECTION=development`): `http://localhost:6543`
   - Production: `wa.connect_url` (mis. `https://johor.wajom.co:30006`)
5. Panggil `GET {connect_url}/status` dengan header `whatsapp-id: {wa.id}`, timeout 5 detik.
6. Normalisasi respons worker → `{ online, ready, connection, version }`.
7. Jika worker tidak reachable (ECONNREFUSED / ECONNABORTED / error lain), balas `online: false` + pesan.

### Header ke worker

```http
GET /status HTTP/1.1
Host: johor.wajom.co:30006
whatsapp-id: <wa.id>
```

Header `whatsapp-id` wajib untuk lolos middleware `auth.ts` di dripsender-client. Lihat `dripsender-client/app/middlewares/auth.ts`:

```ts
if (request.headers['whatsapp-id']) {
  if (request.headers['whatsapp-id'] != global?.wa?.id) {
    return response.status(401).send("Unauthorized");
  }
}
```

### Konfigurasi axios

```ts
axios.get(connectUrl + "/status", {
  headers: { "whatsapp-id": wa.id },
  timeout: 5000,
  validateStatus: () => true,  // jangan throw pada non-200, handle manual
});
```

## Endpoint tujuan (dripsender-client)

Endpoint `/status` ada di repo **dripsender-client**, bukan `wajom`:

- **Route:** `dripsender-client/routes/web.ts:100`
  ```ts
  Route.get("/status", WhatsappsController.status)
  ```
- **Handler:** `dripsender-client/app/controllers/WhatsappsController.ts:783`
  ```ts
  public async status(request, response) {
    return response.json({
      version: pkg.version,
      ready: Bailey.ready,
      connection: Bailey.connection
    });
  }
  ```

### State `Bailey.connection`

Di-set dari event `connection.update` Baileys:

| Nilai | Arti | Lokasi set |
|---|---|---|
| `"open"` | WhatsApp terhubung | `Bailey.ts:691` |
| `"close"` | Disconnect | `Bailey.ts:427` |
| `"connecting"` | Sedang connect | `Bailey.ts:338` |
| `undefined` | Belum ada event | `Bailey.ts:58` (default) |

### State `Bailey.ready`

- `true` saat `connection === "open"` (`Bailey.ts:694`)
- `false` saat QR diterima, disconnect, sleep, atau logout

## Catatan

- Endpoint ini **read-only** — tidak mengubah state instance.
- Tidak ada rate limiting di sisi `wajom`. Untuk polling dari service internal, beri jeda minimum 5–10 detik untuk menghindari beban ke worker.
- Worker yang mati akan menyebabkan request timeout 5 detik sebelum balas `online: false`. Untuk pemanggilan intensif, pertimbangkan cache singkat di Redis (mis. TTL 10–30 detik) di sisi pemanggil.
- Endpoint ini hanya untuk service internal tepercaya — jangan expose ke browser/frontend publik.

---

# Internal API: Get WhatsApp Detail by ID

Endpoint internal untuk mengambil detail sebuah WhatsApp instance (port, `connect_url`, `server_id`, status, dll) berdasarkan `id`. Dipakai oleh portal/chatbot/service internal yang perlu tahu port tujuan instance tanpa melewati UI Inertia.

## Route

```
GET /api/internal/whatsapp/:id
```

- **File route:** `wajom/routes/web.ts` (di blok `// Internal API for portal/chatbot ...`)
- **Handler:** `WhatsappController.getById` (`wajom/app/controllers/WhatsappController.ts`)

## Autentikasi

Guarded oleh middleware `internalApiAuth` (`wajom/app/middlewares/internalApiAuth.ts`).

- Header wajib: `x-internal-api-token: <INTERNAL_API_TOKEN>`
- Token dibaca dari env `INTERNAL_API_TOKEN` (sudah ada di `.env`).
- Jika env belum dikonfigurasi → `503 { error: "INTERNAL_API_TOKEN not configured on portal" }`.
- Jika token tidak cocok / tidak dikirim → `401 { error: "Unauthorized" }`.

Tidak menerima sesi browser / API key user biasa — hanya token internal.

## Access Control

Tidak ada cek kepemilikan seperti `instanceStatus`. Endpoint ini **internal trust** — selama token benar, data instance apapun bisa diambil. Asumsi: pemanggil adalah service internal tepercaya (portal, chatbot, cron, dsb).

## Parameter

| Param | Lokasi | Wajib | Deskripsi |
|---|---|---|---|
| `id` | path | ya | `whatsapps.id` (UUID) |

## Response

### Sukses — `200 OK`

Mengembalikan **satu row tabel `whatsapps`** secara utuh (semua kolom). Skema kolom penting:

```ts
{
  id: string,            // UUID
  name: string | null,
  phone: string | null,
  api_key: string | null,
  status: string,        // "connected" | "qr" | "sleep" | "archived" | ...
  user_id: string | null,
  server_id: string | null,
  version: number,       // default 2
  client: string,        // default "WhatsappJS"
  server_url: string | null,   // mis. "https://johor.wajom.co:26545"
  connect_url: string | null,  // mis. "https://johor.wajom.co:30006"
  server_name: string | null,  // mis. "JOHOR"
  port: number | null,         // mis. 30006
  media_url: string | null,
  tags: string | null,
  // ...kolom lain (wtc, working_hours, login_method, qr, trial_sent_count, dll)
  created_at: string,
  updated_at: string
}
```

### Contoh

```bash
curl -H "x-internal-api-token: $INTERNAL_API_TOKEN" \
  https://api.wajom.co/api/internal/whatsapp/5ba1d673-74dd-4b6c-a3bb-e4b0b240ee50
```

```json
{
  "id": "5ba1d673-74dd-4b6c-a3bb-e4b0b240ee50",
  "name": "Toko Saya",
  "phone": "6288217069611",
  "api_key": "773563d2-8d46-4a65-92ff-6357aaff30b1",
  "status": "connected",
  "user_id": "...",
  "server_id": "9114dc2e-0a14-4493-8a08-e12685c47a46",
  "version": 2,
  "client": "WhatsappJS",
  "server_url": "https://johor.wajom.co:26545",
  "connect_url": "https://johor.wajom.co:30006",
  "server_name": "JOHOR",
  "port": 30006,
  "media_url": null,
  "tags": null,
  "created_at": "2025-...",
  "updated_at": "2025-..."
}
```

### Error response

| Status | Body | Penyebab |
|---|---|---|
| `400` | `{ "error": "id is required" }` | `:id` kosong |
| `401` | `{ "error": "Unauthorized" }` | Token salah / tidak dikirim |
| `404` | `{ "error": "Whatsapp not found" }` | Instance dengan id tersebut tidak ada di DB |
| `503` | `{ "error": "INTERNAL_API_TOKEN not configured on portal" }` | Env `INTERNAL_API_TOKEN` kosong di server |

## Implementasi

### Handler

```ts
public async getById(request, response) {
  const { id } = request.params;

  if (!id) {
    return response.status(400).json({ error: "id is required" });
  }

  const wa = await DB.from("whatsapps").where("id", id).first();

  if (!wa) {
    return response.status(404).json({ error: "Whatsapp not found" });
  }

  return response.json(wa);
}
```

### Middleware `internalApiAuth`

```ts
export default async (request, response, next) => {
  const token = request.headers["x-internal-api-token"];
  const expected = process.env.INTERNAL_API_TOKEN || "";

  if (!expected) {
    return response.status(503).json({ error: "INTERNAL_API_TOKEN not configured on portal" });
  }

  if (token && token === expected) {
    return next();
  }

  return response.status(401).json({ error: "Unauthorized" });
};
```

### Pendaftaran route

```ts
// routes/web.ts
Route.get("/api/internal/whatsapp/:id", internalApiAuth, WhatsappController.getById)
```

## Catatan

- **Response mengandung `api_key`** instance. Karena itu endpoint hanya boleh dipanggil oleh service internal tepercaya — jangan pernah expose ke browser/frontend publik.
- Tidak ada rate limiting di sisi `wajom`. Untuk pemanggilan intensif, tambahkan cache Redis (mis. TTL 30–60 detik) di sisi pemanggil.
- Untuk kebutuhan yang hanya butuh `port` + `connect_url` + `status` (tanpa `api_key` dan field sensitif lain), pertimbangkan ganti `DB.from("whatsapps").where("id", id).first()` dengan `.select(["id","port","connect_url","server_id","server_url","server_name","status"])`.
- Endpoint terkait yang sudah ada:
  - `POST /api/whatsapp/data` — reverse lookup by `{port, server_id}` (return JSON row).
  - `POST /api/whatsapp/port` — list port by `{server_id}` (return array of port).
  - `GET /auth/whatsapp/:id` — halaman UI Inertia (bukan JSON).
  - `GET /api/internal/whatsapp/:id/status` — proxy ke worker untuk cek koneksi real-time (lihat section atas dokumen ini).
