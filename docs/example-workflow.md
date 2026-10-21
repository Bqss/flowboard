# Contoh Workflow: Gaji Bulanan Karyawan

Workflow berulang bulanan untuk proses penggajian. Setiap karyawan = 1 customer. Card dibuat otomatis setiap awal bulan oleh recurrence engine.

## Konfigurasi Workflow

| Field | Nilai |
|---|---|
| Nama | Gaji Bulanan Karyawan |
| Urgency | high |
| Deadline | 5 hari |
| Reminder | 24 jam sebelum deadline |
| Repeat | monthly |
| Closure by | initiator (HR/owner verifikasi) |

## Stages

### 1. Pending — indigo

Karyawan masuk ke cycle gaji bulanan ini.

| Checklist | Required | Deadline | Action |
|---|---|---|---|
| Verifikasi absensi & cuti karyawan | yes | — | — |
| Kirim slip gaji draft ke karyawan | yes | — | WA: `Halo {{nama}}, slip gaji bulan ini sudah siap. Mohon cek ya.` |

### 2. Review — amber

HR review gaji sebelum approve.

| Checklist | Required | Deadline | Action |
|---|---|---|---|
| Hitung lembur & potongan | yes | 48h | — |
| Verifikasi BPJS & pajak | yes | 48h | — |
| Follow-up jika karyawan belum konfirmasi slip | no | — | WA followup: `Halo {{nama}}, apakah slip gaji sudah sesuai? Mohon konfirmasi ya.` delay 720m, followupIfNoReply |

- `onReplyNotify`: true — HR dapat notifikasi saat karyawan balas
- `overdueReminderHours`: 48 — reminder ke HR jika belum ada progress
- `autoMoveOnComplete`: true — auto lanjut ke Approval

### 3. Approval — rose

Manager approve final.

| Checklist | Required | Deadline | Action |
|---|---|---|---|
| Approve gaji final | yes | — | — |
| Tandai untuk transfer | yes | — | — |

- `overdueReminderHours`: 24
- `closureBy: initiator` — hanya HR/owner yang bisa pindahkan ke stage Done

### 4. Done — emerald

| Checklist | Required | Deadline | Action |
|---|---|---|---|
| Transfer gaji via bank | yes | — | — |
| Kirim konfirmasi transfer | yes | — | WA: `Halo {{nama}}, gaji bulan ini sudah ditransfer. Terima kasih.` |

## JSON Draft

```json
{
  "name": "Gaji Bulanan Karyawan",
  "urgency": "high",
  "deadlineValue": 5,
  "deadlineUnit": "days",
  "reminderBeforeValue": 24,
  "reminderBeforeUnit": "hours",
  "repeatRule": "monthly",
  "closureBy": "initiator",
  "stages": [
    {
      "name": "Pending",
      "color": "indigo",
      "autoMoveOnComplete": false,
      "checklists": [
        { "label": "Verifikasi absensi & cuti karyawan", "required": true },
        {
          "label": "Kirim slip gaji draft ke karyawan",
          "required": true,
          "action": {
            "kind": "send",
            "messageTemplate": "Halo {{nama}}, slip gaji bulan ini sudah siap. Mohon cek ya.",
            "delayMinutes": 0
          }
        }
      ]
    },
    {
      "name": "Review",
      "color": "amber",
      "onReplyNotify": true,
      "overdueReminderHours": 48,
      "autoMoveOnComplete": true,
      "checklists": [
        { "label": "Hitung lembur & potongan", "required": true, "deadlineHours": 48 },
        { "label": "Verifikasi BPJS & pajak", "required": true, "deadlineHours": 48 },
        {
          "label": "Follow-up jika karyawan belum konfirmasi slip",
          "required": false,
          "action": {
            "kind": "followup",
            "messageTemplate": "Halo {{nama}}, apakah slip gaji sudah sesuai? Mohon konfirmasi ya.",
            "delayMinutes": 720,
            "followupIfNoReply": true
          }
        }
      ]
    },
    {
      "name": "Approval",
      "color": "rose",
      "overdueReminderHours": 24,
      "checklists": [
        { "label": "Approve gaji final", "required": true },
        { "label": "Tandai untuk transfer", "required": true }
      ]
    },
    {
      "name": "Done",
      "color": "emerald",
      "checklists": [
        { "label": "Transfer gaji via bank", "required": true },
        {
          "label": "Kirim konfirmasi transfer",
          "required": true,
          "action": {
            "kind": "send",
            "messageTemplate": "Halo {{nama}}, gaji bulan ini sudah ditransfer. Terima kasih.",
            "delayMinutes": 0
          }
        }
      ]
    }
  ]
}
```

## Alur

1. **Tanggal 1 setiap bulan** — recurrence engine auto-create card per karyawan, `dueAt` = 5 hari dari sekarang
2. **Stage Pending** — HR verifikasi absensi, kirim slip draft via WA
3. **Stage Review** — HR hitung lembur/potongan/BPJS, follow-up karyawan jika perlu. Auto-advance ke Approval saat semua required checklist selesai
4. **Stage Approval** — manager approve. Hanya initiator (HR/owner) yang bisa pindahkan ke Done
5. **Stage Done** — transfer gaji, kirim konfirmasi WA
6. **H-1 sebelum deadline** — reminder otomatis ke PIC jika card belum Done
7. **Lewat deadline** — badge overdue merah di card, notifikasi overdue
