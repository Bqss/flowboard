# FEATURES — Flowboard

Daftar **fitur produk** (yang dibangun). Bukan “feature = workflow” di bahasa CEO — itu mapping domain, lihat [PLAN.md](./PLAN.md) §4.

Status: **v1** kecuali ditandai nanti.

---

## 1. Workspace, auth & anggota

### 1.0 Autentikasi (starter — audit di Phase 0)

- Login / register / logout / session cookie
- `GET /auth/me`, ganti password
- Guard route protected

### 1.1 Workspace

- Buat workspace (otomatis saat register)
- Workspace aktif di session / user
- Setting workspace (owner only)

### 1.2 Anggota & invite

- Role workspace: `owner` | `member`
- Invite staff by email → accept → join workspace
- Hapus member (owner only)

### 1.3 Peran per workflow *(Phase 1, bukan Phase 0)*

- Owner workflow = PIC proses
- Assignee = staff di card
- Bukan dua jenis akun; peran per konteks

## 2. Setup workflow

- 2.1 Buat / edit / hapus workflow (nama, owner, default assignee, mode)
- 2.2 Stage CRUD (urutan, tipe todo / in_progress / conditional / done)
- 2.3 Editor manual (stage + checklist + action + rule)
- 2.4 Wizard AI: cerita proses → draf → preview → simpan (lalu edit manual)
- 2.5 Generate draf template WA saat setup (teks tetap template, bukan chat live)
- 2.6 Daftar workflow dapat difilter berdasarkan label.

## 3. Checklist + action

- 3.1 Checklist per stage, required vs optional
- 3.2 Action nempel di baris checklist (`none` / `send` / `followup`)
- 3.3 Copy checklist ke card saat masuk stage
- 3.4 Progress `n/m` di wajah kartu
- 3.5 Gate: tidak boleh geser stage jika required belum selesai
- 3.6 Action sukses → centang item itu; gagal → flag + notify assignee

## 4. Kanban & card

- 4.1 Papan kolom = stage
- 4.2 Card: nama, produk, tag, assignee; stage dari kolom (tidak diulang di wajah)
- 4.3 Panel detail: checklist stage aktif, rule, tombol geser
- 4.4 Drag & drop antar stage (dengan gate 3.5)
- 4.5 Assign / reassign assignee per card
- 4.6 Komentar pada detail task mendukung gambar melalui tombol upload dan paste dari clipboard
- 4.7 Daftar papan tugas dapat difilter berdasarkan label.

## 5. Masukkan pelanggan (`createCard`)

- 5.1 Tambah manual (form)
- 5.2 Import CSV (`nama`, `wa`; opsional produk, tag)
- 5.3 Dedup nomor di workflow yang sama
- 5.4 MCP / API `create_card` (chatbot & integrasi)
- 5.5 Identitas pelanggan: 1 orang banyak card (paralel)

## 6. WhatsApp drip (ke pelanggan)

- 6.1 Kirim `send` saat masuk stage / jam set
- 6.2 `followup` terjadwal / jika belum bales
- 6.3 Variabel template (`{{nama}}`, `{{link}}`)
- 6.4 Inbound reply → notify assignee, stop follow-up berikutnya (handover ringan)
- 6.5 *(nanti)* chat agent + handover berat

## 7. Reminder (ke staff)

- 7.1 Overdue in-app (bell + highlight card)
- 7.2 Email reminder task belum selesai: H-2 jam; email overdue satu kali selepas tenggat kepada creator dan assignee. Reminder H-2 dan overdue juga menghasilkan notifikasi in-app/PWA yang automatik memicu Buzz.
- 7.3 Template email taskboard Actjom: Inter dan token `docs/DESIGN.md`, surface rounded tanpa garis aksen/pemisah, serta tombol pill indigo. Preview reminder dan overdue tersedia di `app/resources/notifications/static/index.html`.
  - Inter dimuat seperti website; email client yang tidak mendukung web font menggunakan fallback sans-serif.

- 7.4 Mesej chat masuk, tugasan assigned, komen, mention, hampir tenggat dan overdue menghantar alert automatik dengan nada notifikasi ringkas dan toast. Peranti mobile yang menyokongnya boleh menerima satu getaran ringkas, tanpa animasi skrin. Toast mesej baharu hanya memaparkan teks dan pratonton; perbualan dibuka melalui inbox Mesej. Mesej sendiri tidak memicu Buzz. Kawalan bunyi tersedia dalam Settings.

## 8. Dashboard

- 8.1 Stat: Urgent/Pending, In Progress, Waiting Action, Completed
- 8.2 Filter per workflow
- 8.3 Inbox Mesej lintas workspace hanya menampilkan percakapan yang diikuti pengguna; badge navigasi menjumlahkan pesan belum dibaca dari seluruh workspace anggota.
- 8.4 Chat di `/dashboard/chat` mendukung paste gambar dari clipboard dan rekaman suara dengan pratinjau sebelum dikirim sebagai lampiran.
- 8.5 Menu klik kanan pada gelembung mesej di `/dashboard/chat` dan ChatDock menyediakan Balas, Teruskan, Semat/Lepas Sematan, Edit (hingga 3 jam) dan Hapus; pada skrin sentuh, gunakan butang tindakan.
- 8.6 Satu ahli hanya boleh mempunyai satu reaction pada setiap mesej; reaction baharu menggantikan reaction lama, dan reaction ditoggle untuk membuangnya. Reaction menghantar notifikasi in-app serta web push kepada pemilik mesej.

## 9. Estafet

- 9.1 Tombol “Lanjut ke workflow X” di stage terminal (spawn card baru)
- 9.2 *(nanti)* auto-spawn saat masuk stage
- 9.3 *(nanti)* cabang banyak tujuan

## 10. Langganan & pembayaran (SaaS)

Tagihan di **workspace**, bukan per user login.

- 10.1 Paket (trial / paid); batas kursi, workflow, kiriman WA
- 10.2 Langganan: trial → active → past_due → canceled
- 10.3 Checkout pembayaran (provider, mis. Stripe)
- 10.4 Voucher: diskon % / nominal / bulan gratis; kuota, kadaluarsa, pakai sekali per workspace
- 10.5 Redeem voucher saat checkout atau di billing
- 10.6 Billing portal: ganti paket, batal, riwayat invoice ringkas

## 11. Admin platform

Bukan Owner workspace. Ini operator Flowboard (tim internal).

- 11.1 Login admin terpisah / flag `platform_admin`
- 11.2 Daftar workspace, user, langganan
- 11.3 Buat / nonaktifkan voucher
- 11.4 Comp / extend trial / ganti paket manual
- 11.5 *(nanti)* impersonate workspace, refund penuh

## 12. PWA & pembaruan aplikasi

- Instalasi melalui web manifest dan prompt pemasangan aplikasi.
- Service Worker menyimpan aset statis; API dan dokumen HTML autentik tidak dicache.
- Pembaruan Service Worker mengikuti versi `package.json`, menunggu pilihan pengguna di banner sebelum aktif, lalu memuat ulang aplikasi.
- Browser push untuk mesej dan tugasan apabila web/PWA berada di latar belakang; pengguna mengaktifkannya pada setiap peranti. Deployment perlu mengkonfigurasi `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` dan `VAPID_SUBJECT`.
- Bunyi Push Web latar belakang mengikut tetapan pemberitahuan browser/OS; push meminta satu getaran ringkas pada peranti yang menyokongnya. Nada khusus aplikasi tidak dapat dimainkan apabila tiada halaman terbuka.

## 13. Di luar v1

- Nested Kanban di dalam stage
- Portal login pelanggan
- Form publik / payment webhook pelanggan (tetap `createCard`)
- Impersonate admin, refund self-serve, usage-based billing
- Template marketplace
- Analytics funnel berat
