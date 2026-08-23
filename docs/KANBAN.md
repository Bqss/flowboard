# Kanban — wireframe

Workflow contoh: **Pendaftaran Peserta Webinar**
Kolom = stage. Checklist **bukan di kolom**, tapi di panel kanan saat kartu diklik.

---

## Board + checklist (satu layar)

Klik kartu Siti → panel kanan kebuka. Checklist yang tampil = milik **stage kartu itu sekarang** (Follow-up).

```
┌─ Flowboard ──────────────────────────────────────────┬─ Card ──────────────┐
│  Pendaftaran Webinar                                 │ Siti Aminah         │
│  Owner: Raduan          Assignee: Diana              │ Webinar Apr 2026    │
│                                                      │ Assignee: Diana     │
│  [ 8 Pending ] [ 18 Progress ] [ 12 Wait ] [ 47 Done]│ Tag: Urgent         │
│                                                      │                     │
│ Pending   Confirmed  H-1     Attended  Follow-up Done│ Stage: Follow-up    │
│ Users 12         8      20        45         7     3 │ (dari kolom)        │
│ ┌──────┐  ┌──────┐                     ┌──────┐ ★    │                     │
│ │Hassan│  │Ahmad │                     │Siti  │      │ Checklist           │
│ │Webin.│  │Webin.│                     │Webin.│      │ stage Follow-up     │
│ │   DA │  │ VIP  │                     │Urgent│      │                     │
│ │ 0/2 ✓│  │ 2/2 ✓│                     │ 2/3 ✓│      │ ☑ Kirim rekaman     │
│ └──────┘  └──────┘                     │   DA │      │    required         │
│                                        └──────┘      │ ☑ Tanya minat       │
│ ┌──────┐                                             │    required         │
│ │Fatim.│                                             │ ☐ Catatan pribadi   │
│ │Webin.│                                             │    optional         │
│ │   DA │                                             │                     │
│ │ 1/2 ✓│                                             │ WA: auto            │
│ └──────┘                                             │ Reminder: 2 hari    │
│                                                      │                     │
│                                                      │ [ Geser ke Done ]   │
└──────────────────────────────────────────────────────┴─────────────────────┘
  ★ kartu terpilih                                         checklist di sini
```

Di wajah kartu cuma **progress** (`2/3 ✓`). Itemnya baru kelihatan setelah kartu dibuka.

---

## Wajah kartu vs panel

```
  KANBAN (wajah)              PANEL (setelah klik)
┌─────────────────┐         ┌──────────────────────────┐
│ Siti Aminah     │  klik   │ Siti Aminah              │
│ Webinar         │  ────►  │ produk, assignee, tag    │
│ [Urgent]    DA  │         │ stage = kolom sekarang   │
│ 2/3 ✓           │         │                          │
└─────────────────┘         │ Checklist Follow-up      │
  nama, produk,             │ ☑ ... required           │
  tag, assignee,            │ ☑ ... required           │
  progress saja             │ ☐ ... optional           │
                            └──────────────────────────┘
```

Geser ke kolom kanan ditolak kalau *required* belum dicentang.

---

## Pindah stage = ganti checklist

```
Pending Users          Follow-up                 Done
┌─────────────┐        ┌─────────────┐          ┌──────┐
│ Checklist:  │  geser │ Checklist:  │   geser  │  —   │
│ ☐ Cek data  │  ────► │ ☐ Kirim     │   ────►  │      │
│ ☐ Cek bayar │        │   rekaman   │          │      │
└─────────────┘        │ ☐ Tanya     │          └──────┘
                       │   minat     │
                       └─────────────┘
```

Tiap kolom punya list sendiri. Yang tampil di panel = list stage tempat kartu duduk.

---

## Action nempel di baris checklist

Setup Owner: satu list. Action opsional per baris. Bukan dua tab yang di-link.

```
Setup stage: H-1 Reminder
┌──────────────────────────────────────────────────────────────┐
│ Checklist                         required   action          │
│ ☐ Kirim reminder H-1              ●          WA send  09:00  │
│ ☐ Kirim link Zoom                 ●          WA send  09:00  │
│ ☐ Konfirm hadir                   ○          followup 18:00  │
│ ☐ Catatan internal                ○          —               │
│                                                              │
│ Rule stage: on_reply → notify assignee                       │
└──────────────────────────────────────────────────────────────┘
```



---

## Estafet (selesai workflow 1 → mulai workflow 2)

Bukan drag ke board lain. Card lama tetap di Done; card baru muncul di board berikutnya.

```
  BOARD: Webinar                         BOARD: Post Produk
┌───┬───┬──────────┐                   ┌──────────────┬─────┐
│…  │…  │ Converted│                   │ Pending Stock│ …   │
│   │   │ ┌──────┐ │   spawn           │ ┌──────┐     │     │
│   │   │ │Siti  │─┼──────────────────►│ │Siti  │     │     │
│   │   │ │Done  │ │                   │ │baru  │     │     │
│   │   │ └──────┘ │                   │ └──────┘     │     │
└───┴───┴──────────┘                   └──────────────┴─────┘
  riwayat tetap di sini                  proses berikutnya
```

Panel card di Converted:

```
┌─ Siti Aminah ─────────────────────────┐
│  Stage: Converted                     │
│  Checklist: (selesai)                 │
│                                       │
│  Lanjut ke: Post Produk               │
│  [ Buat card di Post Produk ]         │
└───────────────────────────────────────┘
```

Paralel tidak hilang. Estafet = selesai A lalu mulai B. Paralel = A dan B jalan bareng tanpa nunggu.

```
Siti
  ├── Webinar (masih Follow-up)     ← paralel
  ├── Booking Meeting Room          ← paralel
  └── Post Produk (dari estafet Webinar Converted)
```

