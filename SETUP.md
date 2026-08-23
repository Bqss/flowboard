# Setup — wireframe

Dua urusan berbeda: **bikin workflow** vs **masukkan pelanggan**.

---

## 1. Buat workflow (manual atau wizard)

```
┌─ Workspace: Kak Miza ─────────────────────────────────────┐
│  Workflows                              [ + Buat workflow ]│
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Webinar     │  │ Post Produk │  │  + baru     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└───────────────────────────────────────────────────────────┘

                    ┌─ Buat workflow ──────────────┐
                    │  ( ) Manual                  │
                    │  ( ) Setup dengan AI         │
                    └──────────────────────────────┘
```

### Wizard AI → preview → simpan (lalu edit manual)

```
┌─ Wizard ──────────────────────────────────────────────────┐
│  Ceritakan prosesnya                                      │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Pendaftaran webinar, daftar → H-1 reminder WA →     │ │
│  │ follow-up.                                           │ │
│  └──────────────────────────────────────────────────────┘ │
│                                      [ Generate draf ]    │
└───────────────────────────────────────────────────────────┘

┌─ Preview draf ────────────────────────────────────────────┐
│  Workflow: Pendaftaran Webinar                            │
│  Pending → Confirmed → H-1 → Attended → Follow-up → Done  │
│                                                           │
│  Stage H-1                                                │
│    ☐ Kirim reminder     required  WA send 09:00           │
│    ☐ Kirim link Zoom    required  WA send 09:00           │
│    ☐ Konfirm hadir      optional  followup 18:00          │
│                                                           │
│  [ Edit ]  [ Buang draf ]  [ Simpan workflow ]            │
└───────────────────────────────────────────────────────────┘
```

Manual = editor yang sama, mulai kosong.

---

## 2. Masukkan pelanggan = createCard

Bukan “user workspace”. Diana = staff (invite). Siti = card.

```
  BOARD: Webinar
  [ + Tambah ]  [ Import CSV ]  [ API / MCP ]

  Tambah manual          Import                 MCP / chatbot
  ┌──────────────┐       ┌──────────────┐       create_card(
  │ Nama         │       │ file.csv     │         workflow,
  │ WA           │       │ nama, wa     │         nama, wa
  │ Produk       │       │ [ Unggah ]   │       )
  │ [ Simpan ]   │       └──────────────┘         │
  └──────────────┘                                ▼
                                           card di Pending
```

Chatbot masuk lewat MCP, bukan pintu keempat di dalam Kanban.
