# Dokumentasi & Analisis Aplikasi: Customer Onboarding Management System (Flowboard)

Analisis perangkat lunak berdasarkan landing page [flowwboard.vercel.app](https://flowwboard.vercel.app/).

---

## 📌 Ringkasan Eksekutif

**Customer Onboarding Management System** (Flowboard) adalah sistem manajemen alur kerja (*workflow*) dan pendaftaran pelanggan (*customer onboarding*) yang dirancang dengan filosofi **"Sistem Yang Mengejar Staff, Bukan Staff Yang Mengingat Semuanya"**.

Perangkat lunak ini berfungsi sebagai pusat kontrol operasional tim yang mengotomatisasi, melacak, dan menstandarisasi setiap tahap interaksi pelanggan dari titik pembayaran hingga pendaftaran dan *follow-up* berkala.

---

## 🎯 Masalah Utama Yang Diatasi

Sistem ini dibuat untuk menyelesaikan 3 masalah krusial dalam operasional manual:

1. **Pelanggan Tercicir (*Customer Drop-off*)**
   * *Masalah:* Tanpa *tracking* tersentralisasi, tidak ada yang tahu pasti pelanggan mana yang sudah mendaftar, barangnya sudah dikirim, atau belum di-follow up.
   * *Solusi:* Setiap pelanggan memiliki kartu (*card*) digital dengan status *real-time* dalam papan Kanban.

2. **Staff Lupa Follow-Up & Data Terisolasi**
   * *Masalah:* Setiap staff menyimpan catatan di buku pribadi/HP masing-masing. Ketika staff cuti atau keluar (*resign*), data dan status pelanggan hilang.
   * *Solusi:* Standar alur kerja (*checklist*) seragam yang diterapkan langsung oleh sistem.

3. **Burnout & Mikromanajemen Leader**
   * *Masalah:* Pemimpin tim (*leader*) menghabiskan waktu mengejar staff satu per satu hanya untuk menanyakan status tugas harian.
   * *Solusi:* Sistem mengirimkan pengingat (*reminder*) otomatis ke penanggung jawab (*assignee*) dan menyediakan papan pantau (*dashboard*) *real-time*.

---

## ✨ Fitur & Kapabilitas Utama

### 1. Visual Kanban Board & Card Pelanggan
* Setiap pelanggan diwakili oleh 1 kartu digital yang mencantumkan nama, produk, tahap alur kerja, tag prioritas (*Urgent*, *VIP*, dll.), dan penanggung jawab (*assignee*).
* Alur pergerakan antar tahap dilakukan secara *drag & drop*.

### 2. Checklist Standardisasi Onboarding
* Memastikan setiap pelanggan melewati seluruh langkah wajib yang sama tanpa ada tahap yang terlewat.

### 3. Pengingat Automatis (*Auto Reminder*)
* Sistem secara proaktif memperingatkan staff jika ada tugas atau tahap pelanggan yang tertunggak (*overdue*).

### 4. WhatsApp AI Integration (Automasi Komunikasi)
Integrasi WhatsApp cerdas untuk mengotomatiskan interaksi pelanggan pada titik-titik krusial (*touchpoints*):
* **Pesan Sambutan Automatis:** Mengirim *welcome message* + tautan portal pembelajaran segera setelah registrasi.
* **Tautan Grup VIP Automatis:** Mengirimkan *link* grup WhatsApp tanpa perlu diuji/diketik manual oleh staff.
* **Follow-Up Terjadwal:**
  * **Hari ke-3:** *Check-in* awal (menanyakan kendala produk/jawaban pertanyaan dasar).
  * **Hari ke-7:** Pengiriman tautan tutorial/materi tahap berikutnya.
  * **Hari ke-14:** Evaluasi kemajuan pelanggan.
* **Human Handover:** Menghubungkan/notifikasi ke staff manusia ketika pelanggan membutuhkan bantuan lanjutan (*advanced support*).

### 5. Live Executive Dashboard
* Menyediakan grafik dan indikator matriks *live*:
  * *Urgent / Pending*
  * *In Progress*
  * *Waiting Action*
  * *Completed*
* Memungkinkan pimpinan melihat gambaran besar (*big picture*) operasional secara instant.

---

## 🔄 Alur Kerja Inti (Core Workflows)

Berdasarkan analisis situs, sistem ini mendukung setidaknya 3 *workflow* operasional khusus:

```mermaid
graph TD
    subgraph Workflow 1: Post Produk
        A1[Pending Stock] --> A2[Ready to Post]
        A2 --> A3[Delivery in Progress]
        A3 --> A4[Customer Received]
        A4 --> A5[CC Replace]
        A5 --> A6[CC Saved for Next Purchase]
    end

    subgraph Workflow 2: Booking Meeting Room
        B1[Apply Booking via Email/Contact] --> B2{Keputusan}
        B2 -->|Rejected| B3[Booking Rejected]
        B2 -->|Approved| B4[Booking Approved]
    end

    subgraph Workflow 3: New VIP Registration (FBO Onboarding)
        C1[Pending Info New FBO] --> C2[Copy Info to TG]
        C2 --> C3[Register at F2U Apps]
        C3 --> C4[FBO ID Ready]
        C4 --> C5[Order Promo VIP at F2U]
        C5 --> C6[Send VIP Intro]
        C6 --> C7[Poster New VIP]
        C7 --> C8[Add to AUC VIP BB & FL]
        C8 --> C9[Receive SYJP]
    end
```

---

## 🏢 Konteks Penggunaan & Ekosistem Bisnis

Perangkat lunak ini dirancang khusus untuk tim penjualan/distribusi bisnis (dalam contoh web: **Kak Miza Project** & ekosistem **Forever Living / FBO / F2U Apps**).

Aplikasi ini menggabungkan modul **CRM ringan**, **Task Management**, **Kanban Tracking**, dan **WhatsApp Automation** dalam satu sistem terpadu untuk memastikan skala operasional tim tetap rapi dan konsisten.
