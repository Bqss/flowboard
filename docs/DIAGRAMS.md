# DIAGRAMS — Flowboard

Aktor: **Owner**, **Staff**, **Admin platform**. Sistem, Pelanggan, Chatbot/MCP, Payment provider = peserta alur.

Acuan: [PLAN.md](./PLAN.md) · [FEATURES.md](./FEATURES.md)

---

## 1. Use case

```mermaid
flowchart TB
    Owner((Owner))
    Staff((Staff))
    Admin((Admin))

    subgraph FB["Flowboard"]
        direction TB

        subgraph setup["Setup"]
            UC1["Buat workflow manual"]
            UC2["Buat workflow wizard AI"]
            UC3["Edit stage + checklist"]
            UC4["Pasang action di baris checklist"]
            UC5["Atur rule stage\nreminder / on_reply / estafet"]
        end

        subgraph ingest["Masukkan pelanggan"]
            UC6["Tambah card manual"]
            UC7["Import CSV"]
            UC8["create_card MCP/API"]
            UC9["Estafet ke workflow lain"]
        end

        subgraph ops["Operasi"]
            UC10["Lihat Kanban"]
            UC11["Kerjakan checklist"]
            UC12["Geser card"]
            UC13["Assign / reassign"]
            UC14["Terima handover WA"]
        end

        subgraph monitor["Monitoring"]
            UC15["Dashboard stat"]
            UC16["Reminder overdue in-app"]
        end

        subgraph billing["SaaS"]
            UC17["Pilih paket + bayar"]
            UC18["Redeem voucher"]
            UC19["Kelola langganan"]
            UC20["Kelola voucher"]
            UC21["Lihat workspace / user / bayar"]
            UC22["Comp / extend trial"]
        end
    end

    Owner --> UC1
    Owner --> UC2
    Owner --> UC3
    Owner --> UC4
    Owner --> UC5
    Owner --> UC13
    Owner --> UC15
    Owner --> UC10
    Owner --> UC9
    Owner --> UC17
    Owner --> UC18
    Owner --> UC19

    Staff --> UC6
    Staff --> UC7
    Staff --> UC10
    Staff --> UC11
    Staff --> UC12
    Staff --> UC14
    Staff --> UC16

    Admin --> UC20
    Admin --> UC21
    Admin --> UC22

    UC12 -.->|"include"| UC11
    UC4 -.->|"extend"| UC3
    UC9 -.->|"include"| UC6
```

Chatbot tidak punya use case di dalam board: dia pemakai **UC8**.

### Matriks wewenang

| Use case | Owner | Staff | Admin platform |
|---|---|---|---|
| Workflow, stage, checklist, action, rule | ya | tidak | tidak |
| Wizard AI | ya | tidak | tidak |
| Assign / reassign | ya | tidak | tidak |
| Tambah card, import CSV | ya | ya | tidak |
| Kanban + checklist + geser | pantau semua | card-nya | tidak |
| Handover WA + reminder in-app | pantau | target | tidak |
| Dashboard 4 stat | ya | ringkas milik sendiri | tidak |
| Estafet “Lanjut ke …” | ya | ya (card-nya) | tidak |
| Paket, bayar, redeem voucher, batal | ya (workspace) | tidak | lihat |
| Buat voucher, comp trial, semua workspace | tidak | tidak | ya |

---

## 2. Swimlane

### 2.1 Setup workflow

```mermaid
flowchart LR
    subgraph Owner
        direction TB
        O1["Pilih Manual atau Wizard AI"]
        O2["Isi / review stage +\nchecklist + action"]
        O3["Set assignee, reminder,\non_reply, estafet"]
        O1 --> O2 --> O3
    end

    subgraph Sistem
        direction TB
        S1["Kalau wizard:\ngenerate draf"]
        S2["Simpan workflow"]
        S3["Board kosong"]
        S1 --> S2 --> S3
    end

    O1 --> S1
    O3 --> S2
```

### 2.2 Pelanggan masuk → selesai (+ estafet)

```mermaid
flowchart TB
    subgraph Ingest
        I1["Manual / CSV /\nMCP chatbot / estafet"]
    end

    subgraph Sistem
        Y1["createCard"]
        Y2["Copy checklist stage"]
        Y3["Jalankan action WA\ndi item"]
        Y4["Centang item jika sukses"]
        Y5["Reminder jika overdue"]
        Y6["Reply → notify staff"]
        Y7["Update dashboard"]
    end

    subgraph Staff
        T1["Buka card"]
        T2["Centang item manual"]
        T3["Geser stage\njika required ok"]
        T4["Handover / Lanjut ke …"]
    end

    subgraph Pelanggan
        P1["Terima WA"]
        P2["Balas"]
    end

    I1 --> Y1 --> Y2 --> Y3
    Y3 --> P1
    Y3 --> Y4
    Y2 --> T1 --> T2 --> T3
    T3 --> Y2
    Y5 --> T1
    P2 --> Y6 --> T4
    T4 --> Y1
    T3 --> Y7
```

### 2.3 Reminder vs WA vs MCP

```mermaid
flowchart LR
    subgraph internal["Ke staff"]
        R1["Card overdue"] --> R2["In-app bell"]
    end

    subgraph wa["Ke pelanggan"]
        W1["Item punya action"] --> W2["Kirim template"]
        W2 --> W3["Reply → handover"]
    end

    subgraph mcp["Dari luar"]
        M1["Chatbot intent"] --> M2["MCP create_card"]
        M2 --> M3["Card di Pending"]
    end
```

---

## 3. Sequence

### 3.1 Wizard AI lalu edit manual

```mermaid
sequenceDiagram
    actor Owner
    participant App as Flowboard
    participant AI as LLM setup

    Owner->>App: Buat workflow → Setup dengan AI
    Owner->>App: "Webinar, H-1 reminder WA, follow-up"
    App->>AI: Generate draf stage + checklist + action
    AI-->>App: Draf
    App-->>Owner: Preview
    Owner->>App: Ubah / hapus item, lalu Simpan
    App-->>Owner: Kanban kosong siap
```

### 3.2 createCard (manual / CSV / MCP sama)

```mermaid
sequenceDiagram
    actor Staff
    participant App as Flowboard
    participant MCP as MCP/API

    alt manual
        Staff->>App: Form nama + WA
    else CSV
        Staff->>App: Unggah CSV
    else chatbot
        MCP->>App: create_card(workflow, nama, wa)
    end

    App->>App: Dedup nomor di workflow
    App->>App: Card di stage pertama, assignee default
    App->>App: Copy checklist stage
    App-->>Staff: Card di Pending
```

### 3.3 Geser stage + gate checklist

```mermaid
sequenceDiagram
    actor Staff
    participant App as Flowboard

    Staff->>App: Geser ke stage berikutnya
    alt required belum done
        App-->>Staff: Tolak
    else required lengkap
        App->>App: Pindah kolom
        App->>App: Copy checklist stage baru
        App->>App: Jadwalkan action WA di item
        App-->>Staff: Card di kolom baru
    end
```

### 3.4 Action WA mencentang checklist + handover

```mermaid
sequenceDiagram
    participant Job as Scheduler
    participant App as Flowboard
    participant WA as WhatsApp
    actor Customer as Pelanggan
    actor Staff

    Job->>App: Item "Kirim reminder H-1" due
    App->>WA: Kirim template
    alt sukses
        WA-->>App: ok
        App->>App: Checklist item = done
    else gagal
        App->>Staff: Notify + flag card
    end

    Customer->>WA: Balas
    WA->>App: Inbound
    App->>Staff: Handover in-app
    App->>App: Stop follow-up berikutnya
```

### 3.5 Estafet

```mermaid
sequenceDiagram
    actor Staff
    participant App as Flowboard

    Staff->>App: Card Siti di Converted → Lanjut ke Post Produk
    App->>App: createCard(Post Produk, customer Siti)
    App-->>Staff: Card lama tetap Done di Webinar
    App-->>Staff: Card baru di Pending Stock
```

### 3.6 Dashboard

```mermaid
sequenceDiagram
    actor Owner
    participant App as Flowboard

    Owner->>App: Buka dashboard
    App-->>Owner: Pending / In Progress / Waiting / Completed
    Owner->>App: Filter Webinar
    alt card macet
        Owner->>App: Reassign assignee
    end
```

### 3.7 Langganan + voucher

```mermaid
sequenceDiagram
    actor Owner
    actor Admin
    participant App as Flowboard
    participant Pay as Payment provider

    Admin->>App: Buat voucher LAUNCH50
    Owner->>App: Pilih paket Paid
    Owner->>App: Redeem LAUNCH50
    App-->>Owner: Harga setelah diskon
    Owner->>Pay: Checkout
    Pay->>App: Webhook paid
    App->>App: Subscription = active
    App-->>Owner: Workspace full access

    alt past_due lewat tenggang
        App->>App: Workspace read-only
    end
```

---

## 4. Class diagram

Action menempel di `ChecklistTemplate`. Rule sampingan di `StageRule`. `Customer` = identitas Kanban. Langganan = `Subscription` di workspace, bukan di pelanggan onboarding.

```mermaid
classDiagram
    class Workspace {
        id
        name
    }
    class User {
        id
        name
        email
        platformAdmin
    }
    class WorkspaceMember {
        role
    }
    class Workflow {
        id
        name
        mode
    }
    class Stage {
        id
        name
        sortOrder
        type
    }
    class ChecklistTemplate {
        id
        label
        required
        sortOrder
    }
    class ChecklistAction {
        kind
        delayHours
        template
        sendAt
    }
    class StageRule {
        kind
        overdueHours
        nextWorkflowId
    }
    class Customer {
        id
        name
        wa
    }
    class Card {
        id
        product
        tags
        stuckSince
        source
    }
    class ChecklistItem {
        id
        done
        doneAt
        error
    }
    class Notification {
        id
        type
        read
    }
    class WhatsAppJob {
        id
        status
        scheduledAt
    }
    class Plan {
        id
        slug
        maxSeats
        maxWorkflows
        maxWaPerMonth
    }
    class Subscription {
        id
        status
        currentPeriodEnd
        providerRef
    }
    class Voucher {
        id
        code
        kind
        value
        maxRedemptions
        expiresAt
    }
    class VoucherRedemption {
        id
        redeemedAt
    }

    Workspace "1" --> "*" WorkspaceMember
    User "1" --> "*" WorkspaceMember
    Workspace "1" --> "*" Workflow
    Workspace "1" --> "*" Customer
    Workflow "*" --> "1" User : owner
    Workflow "*" --> "1" User : defaultAssignee
    Workflow "1" --> "*" Stage
    Stage "1" --> "*" ChecklistTemplate
    Stage "1" --> "*" StageRule
    ChecklistTemplate "0..1" --> "1" ChecklistAction
    Customer "1" --> "*" Card
    Workflow "1" --> "*" Card
    Stage "1" --> "*" Card : current
    Card "*" --> "1" User : assignee
    Card "1" --> "*" ChecklistItem
    ChecklistTemplate "1" --> "*" ChecklistItem
    ChecklistItem "1" --> "*" WhatsAppJob
    Card "1" --> "*" Notification
    User "1" --> "*" Notification
    StageRule "*" --> "0..1" Workflow : estafet tujuan
    Workspace "1" --> "1" Subscription
    Plan "1" --> "*" Subscription
    Voucher "1" --> "*" VoucherRedemption
    Subscription "1" --> "*" VoucherRedemption
```

`ChecklistAction.kind`: `send` | `followup`  
`StageRule.kind`: `on_reply` | `reminder` | `estafet`  
`Card.source`: `manual` | `csv` | `mcp` | `estafet`  
`WhatsAppJob.status`: `scheduled` | `sent` | `failed`  
`Subscription.status`: `trial` | `active` | `past_due` | `canceled`  
`Voucher.kind`: `percent` | `fixed` | `trial_days`

---

## 5. Ringkasan aktor

```mermaid
flowchart LR
    Owner((Owner)) -->|"setup + bayar + pantau"| Sys[Flowboard]
    Staff((Staff)) -->|"eksekusi card"| Sys
    Admin((Admin)) -->|"voucher + comp"| Sys
    Bot[Chatbot] -->|"MCP create_card"| Sys
    Pay[Payment] -->|"webhook"| Sys
    Sys -->|"reminder in-app"| Staff
    Sys -->|"WA drip"| Cust((Pelanggan))
    Cust -->|"reply"| Sys
    Sys -->|"handover"| Staff
    Sys -->|"stat"| Owner
```
