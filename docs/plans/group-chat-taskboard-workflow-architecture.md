# Spesifikasi Arsitektur: Organisasi, Taskboard, Workflow & Group Chat

Dokumen ini mendefinisikan arsitektur terpadu untuk hierarki organisasi (*Workspace, Departemen/Kumpulan Ahli, Pegawai*), kontrol akses pada **Taskboard** dan **Workflow**, model hak akses ketat (*Strict PIC & Owner*), serta integrasi otomatis **Group Chat** dan strategi **Backfill Database**.

---

## 1. Pemetaan Domain & Hierarki Entitas

Sistem memetakan struktur organisasi nyata ke dalam model data Flowboard sebagai berikut:

```
Workspace (Bisnis / Perusahaan)
  │
  ├── Pegawai (workspace_members)
  │     ├── Role: Owner (Direktur / Admin Utama)
  │     └── Role: Member (Karyawan)
  │
  └── Kumpulan Ahli (Departemen / Divisi) [workspace_member_groups]
        │
        ├── Anggota Departemen (workspace_member_group_members)
        │     └── Pegawai yang tergabung dalam divisi tersebut
        │
        ├── Chat Departemen (chat_conversations: context_type = 'group')
        │     └── Room diskusi umum internal divisi
        │
        ├── Taskboards Departemen (task_boards: workspace_member_group_id)
        │     ├── Chat Board (chat_conversations: context_type = 'taskboard')
        │     └── Tugas-Tugas Proyek (tasks: assignee_id = PIC)
        │
        └── Workflows Departemen (workflows: workspace_member_group_id)
              ├── Chat Workflow (chat_conversations: context_type = 'workflow')
              └── Customer Service / Pipeline Cards
```

### Tabel Representasi Konsep

| Istilah Bisnis | Entitas Teknis Database | Deskripsi & Peran |
|---|---|---|
| **Bisnis / Perusahaan** | `workspaces` | Tenant mandiri terisolasi (perusahaan/organisasi). |
| **Pegawai / Karyawan** | `workspace_members` (user + workspace) | Seluruh orang yang bekerja di dalam bisnis tersebut. |
| **Departemen / Divisi** | `workspace_member_groups` (*Kumpulan Ahli*) | Unit kerja (misal: *Marketing, Engineering, Sales, HR*). |
| **Anggota Departemen** | `workspace_member_group_members` | Karyawan yang terdaftar sebagai anggota departemen. |
| **Papan Tugas** | `task_boards` | Kanban board proyek internal yang dimiliki departemen atau global. |
| **Alur Kerja Operasional** | `workflows` | Kanban proses berulang (leads, handover pelanggan, SOP bertahap). |

---

## 2. Pemindahan Kontrol Akses ke Level Board & Workflow

### Masalah pada Model Sebelumnya (Per-Task Viewer)
Sebelumnya, hak akses ditaruh di level kartu/tugas (`viewerMode: 'group'` dan `viewerGroupIds: uuid[]` pada setiap task). Hal ini menimbulkan masalah:
1. **Papan Berlubang**: Anggota tim dalam satu departemen melihat jumlah kartu dan metrik yang berbeda-beda saat rapat kanban.
2. **Beban Input Form**: Setiap kali membuat tugas, pengguna dipaksa memilih departemen mana yang boleh melihat.
3. **Fragmentasi Diskusi**: Sukar menentukan siapa peserta room chat jika visibilitas tugas dipecah-pecah per kartu.

### Solusi Desain Baru (Board-Level & Workflow-Level Access)
Akses visibilitas dipindahkan sepenuhnya ke **level wadah utama (Taskboard / Workflow)**:

1. **Akses Taskboard (`task_boards.workspace_member_group_id`)**:
   - **Global (Null)**: Terbuka untuk seluruh pegawai di workspace (contoh: *Papan Pengumuman Kantor, Office Requests*).
   - **Departemen Tertentu (UUID)**: Hanya anggota departemen tersebut dan Workspace Owner yang dapat melihat papan tersebut.
2. **Akses Workflow (`workflows.workspace_member_group_id`)**:
   - **Global (Null)**: Terbuka untuk seluruh pegawai di workspace.
   - **Departemen Tertentu (UUID)**: Khusus diproses dan dimonitor oleh departemen yang ditugaskan.
3. **Penyederhanaan Tabel & Form Tugas**:
   - Menghapus ketergantungan `viewerMode` dan `viewerGroupIds` dari dialog pembuatan/pengeditan task.
   - Semua task di dalam board otomatis dapat dilihat oleh siapapun yang memiliki akses ke board tersebut.

---

## 3. Peran `Assigned To` (PIC) & Model Wewenang Strict

Di dalam board, peran `assigned_to` (PIC) bukan untuk menyembunyikan kartu dari rekan kerja, melainkan untuk menentukan **akuntabilitas operasional**.

### 4 Fungsi Utama `Assigned To`
1. **Displaying & Akuntabilitas**: Avatar dan nama PIC tampil di kartu agar tim mengetahui siapa yang memegang tanggung jawab.
2. **Personal Filtering**: Filter cepat *"Tugas Saya"* di header board sehingga setiap staf fokus pada pekerjaannya tanpa terdistraksi.
3. **Target Notifikasi & Alarm**: Pengingat deadline, notifikasi penugasan, dan notifikasi komentar diarahkan ke PIC.
4. **Hak Eksekusi (Strict Model)**: Menjadi batas wewenang siapa yang boleh mengubah progres kartu.

### Aturan Wewenang Model Strict

Sistem memberlakukan aturan ketat (*Strict Rule*) untuk mencegah perubahan status atau checklist yang tidak sah:

| Aksi pada Kartu / Task | PIC (Assignee) | Creator Task | Board / Dept Owner | Rekan Tim Lain di Dept |
|---|:---:|:---:|:---:|:---:|
| **Melihat Detail & Attachment** | ✅ Ya | ✅ Ya | ✅ Ya | ✅ Ya (*Viewer*) |
| **Menulis Komentar & Diskusi** | ✅ Ya | ✅ Ya | ✅ Ya | ✅ Ya |
| **Centang / Uncheck Checklist** | ✅ Ya | ✅ Ya | ✅ Ya | ❌ Tidak |
| **Menggeser Kolom / Status** | ✅ Ya | ✅ Ya | ✅ Ya | ❌ Tidak |
| **Mengedit Judul / Deskripsi / Due Date** | ✅ Ya | ✅ Ya | ✅ Ya | ❌ Tidak |
| **Menghapus Task** | ❌ Tidak | ✅ Ya | ✅ Ya | ❌ Tidak |

*Catatan:* Jika task belum memiliki PIC (*Unassigned*), anggota departemen dapat mengklaim tugas tersebut (*"Assign to me"*) sebelum dapat memodifikasinya.

---

## 4. Siklus Pembuatan Otomatis Group Chat (*Scoped Chat*)

Setiap wadah kolaborasi otomatis memiliki room chat terintegrasi di tabel `chat_conversations`:

```
┌─────────────────────────────────┐       Auto-Create       ┌──────────────────────────────────────┐
│  Kumpulan Ahli (Departemen)     │ ──────────────────────► │  Chat: `${dept.name} · General`      │
│  Context: 'group'               │                         │  Peserta: Seluruh anggota divisi     │
└─────────────────────────────────┘                         └──────────────────────────────────────┘

┌─────────────────────────────────┐       Auto-Create       ┌──────────────────────────────────────┐
│  Taskboard Baru                 │ ──────────────────────► │  Chat: `${board.name} · General`     │
│  Context: 'taskboard'           │                         │  Peserta: Anggota Dept / Workspace   │
└─────────────────────────────────┘                         └──────────────────────────────────────┘

┌─────────────────────────────────┐       Auto-Create       ┌──────────────────────────────────────┐
│  Workflow Baru                  │ ──────────────────────► │  Chat: `${workflow.name} · General`  │
│  Context: 'workflow'            │                         │  Peserta: Anggota Dept / Workspace   │
└─────────────────────────────────┘                         └──────────────────────────────────────┘
```

### Logika Keanggotaan Chat (*Participants Sync*)
1. **Jika Terikat Departemen (`workspaceMemberGroupId != null`)**:
   - Peserta room chat adalah seluruh anggota departemen tersebut (`workspace_member_group_members`) + creator/owner.
   - Creator/Owner mendapatkan role `'admin'` di percakapan, anggota divisi mendapatkan role `'member'`.
   - Ketika ada penambahan atau pengurangan anggota di departemen, daftar peserta chat ikut disinkronkan secara otomatis.
2. **Jika Publik / Global (`workspaceMemberGroupId == null`)**:
   - Peserta room chat adalah seluruh anggota aktif di bisnis (`workspace_members`).

---

## 5. Rencana Integrasi Tampilan UI

### A. Tombol Pintas Header Board & Workflow
- Pada header halaman `/dashboard/boards/[boardId]`:
  - Ditambahkan tombol **"Chat Board"** dengan counter pesan belum dibaca (*unread badge*).
  - Klik tombol otomatis membuka `ChatDock` dan mengarahkan langsung ke thread chat board tersebut.
- Pada header halaman `/dashboard/workflows/[workflowId]`:
  - Ditambahkan tombol **"Chat Workflow"** untuk langsung mendiskusikan operasional kartu dan antrean pelanggan.

### B. Segmentasi & Visual Badge pada `ChatDock`
Daftar percakapan di `ChatDock` disegmentasi agar pengguna mudah membedakan tipe komunikasi:
1. **Direct (Personal)**: Icon Avatar lawan bicara + status online dot hijau.
2. **Departemen (Group)**: Icon `UserGroupIcon` + badge nama departemen.
3. **Board Chat**: Icon `KanbanIcon` + badge tone info *"Board"*.
4. **Workflow Chat**: Icon `WorkflowSquareIcon` + badge tone warning/progress *"Workflow"*.

---

## 6. Prosedur Backfill Database (Data Historis)

Untuk menjaga integritas data pada workspace yang sudah ada, dibuatkan prosedur migrasi/backfill SQL yang bersifat **idempotent** (aman dijalankan berulang kali):

### Langkah-Langkah Backfill
1. **Backfill Kumpulan Ahli (Departemen)**:
   - Cari record `workspace_member_groups` yang belum memiliki `chat_conversations` dengan `context_type = 'group' AND group_id = g.id`.
   - Buatkan chat room `${group.name} · General`.
   - Daftarkan semua anggota departemen ke dalam `chat_participants`.
2. **Backfill Taskboard**:
   - Cari record `task_boards` yang belum memiliki record di `chat_conversations` dengan `context_type = 'taskboard' AND context_id = b.id`.
   - Buatkan chat room `${board.name} · General`.
   - Ambil peserta dari anggota departemen terkait (jika ada `workspace_member_group_id`) atau seluruh anggota workspace (jika null).
3. **Backfill Workflow**:
   - Cari record `workflows` yang belum memiliki record di `chat_conversations` dengan `context_type = 'workflow' AND context_id = w.id`.
   - Buatkan chat room `${workflow.name} · General`.
   - Ambil peserta dari anggota departemen terkait atau seluruh anggota workspace.

---

## 7. Matriks Status Implementasi

| Komponen | Status | Keterangan |
|---|:---:|---|
| **Database Schema (`context_type`, `context_id`, `group_id`)** | **Selesai** | Tersedia di `app/db/schema.ts` |
| **Service Auto-Create Chat Board & Workflow** | **Selesai** | `createScopedChatConversation` aktif di `task-board.ts` dan `workflow.ts` |
| **API Client (`contextType`, `contextId`, `category`)** | **Selesai** | Type definition aktif di `app/lib/api/client.ts` |
| **Pembersihan Per-Task Viewer di UI Taskboard** | *Dalam Antrean* | Refactor form taskboard dan modal detail |
| **Wewenang Model Strict di Frontend & Backend** | *Dalam Antrean* | Guard aksi edit/centang/move hanya untuk PIC & Owner |
| **Tombol Buka Chat di Header Board/Workflow** | *Dalam Antrean* | Integrasi event click membuka ChatDock |
| **Skrip Migrasi Backfill SQL** | *Dalam Antrean* | Drizzle migration untuk meng-generate chat entitas lama |
