<script lang="ts">
  import { reveal } from '$lib/actions/reveal';
  import StatCard from '../molecules/StatCard.svelte';
  import Badge from '../atoms/Badge.svelte';

  const setupSteps = [
    { title: 'Pilih cara mulai', body: 'Buat workflow manual atau minta wizard AI menyusun draf awal.' },
    { title: 'Susun stage dan checklist', body: 'Tentukan langkah required, action WhatsApp, dan aturan handover.' },
    { title: 'Tetapkan owner dan assignee', body: 'Semua orang tahu proses yang dijaga dan card yang dikerjakan.' }
  ];

  const runSteps = [
    { title: 'Masukkan pelanggan', body: 'Card masuk ke stage pertama lewat form, CSV, atau API.' },
    { title: 'Kerjakan langkahnya', body: 'Checklist menjaga proses konsisten dan gate mencegah lompatan.' },
    { title: 'Tindak lanjuti yang macet', body: 'Reminder, WA, dan notifikasi mengarahkan langkah berikutnya.' }
  ];
</script>

<section id="how-it-works" class="scroll-mt-20 border-y border-hairline bg-surface/40">
  <div class="mx-auto max-w-[1240px] px-6 py-24">
    <div use:reveal class="reveal max-w-2xl">
      <p class="text-[13px] font-medium uppercase tracking-[0.18em] text-accent-blue">Cara kerja</p>
      <h2 class="font-display mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-ink">
        Dari proses yang berantakan menjadi alur yang terlihat.
      </h2>
      <p class="mt-4 text-lg leading-relaxed text-mute">
        Owner menyiapkan workflow. Staff menjalankan card. Flowboard menjaga checklist,
        reminder, dan handover tetap berada di jalur yang sama.
      </p>
    </div>

    <div use:reveal={80} class="reveal mt-14 overflow-hidden rounded-xl border border-hairline bg-canvas">
      <div class="grid gap-px bg-hairline md:grid-cols-4">
        <div class="bg-canvas p-6">
          <Badge tone="blue">01</Badge>
          <h3 class="mt-5 text-base font-medium text-ink">Definisikan proses</h3>
          <p class="mt-2 text-sm leading-relaxed text-mute">
            Buat workflow, stage, checklist, owner, dan aturan reminder.
          </p>
        </div>
        <div class="bg-canvas p-6">
          <Badge tone="green">02</Badge>
          <h3 class="mt-5 text-base font-medium text-ink">Masukkan customer</h3>
          <p class="mt-2 text-sm leading-relaxed text-mute">
            Tambah manual, import CSV, atau masukkan lewat API dan MCP.
          </p>
        </div>
        <div class="bg-canvas p-6">
          <Badge tone="yellow">03</Badge>
          <h3 class="mt-5 text-base font-medium text-ink">Jalankan card</h3>
          <p class="mt-2 text-sm leading-relaxed text-mute">
            Staff mengerjakan checklist dan memindahkan card saat siap.
          </p>
        </div>
        <div class="bg-canvas p-6">
          <Badge tone="red">04</Badge>
          <h3 class="mt-5 text-base font-medium text-ink">Follow-up otomatis</h3>
          <p class="mt-2 text-sm leading-relaxed text-mute">
            Sistem mengirim pesan, memberi reminder, dan meneruskan balasan ke assignee.
          </p>
        </div>
      </div>
    </div>

    <div class="mt-8 grid gap-8 lg:grid-cols-2">
      <div use:reveal class="reveal overflow-hidden rounded-2xl border border-hairline bg-surface">
        <div class="flex items-center gap-3 border-b border-hairline bg-panel px-5 py-4">
          <Badge tone="blue">Setup</Badge>
          <span class="text-sm font-medium text-ink">Siapkan sistem sekali</span>
        </div>
        <div class="divide-y divide-hairline">
          {#each setupSteps as step, i}
            <div class="flex gap-4 px-5 py-5">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-blue/12 text-xs font-medium text-accent-blue">
                {i + 1}
              </span>
              <div>
                <h3 class="text-sm font-medium text-ink">{step.title}</h3>
                <p class="mt-1.5 text-sm leading-relaxed text-mute">{step.body}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div use:reveal={80} class="reveal overflow-hidden rounded-2xl border border-hairline bg-surface">
        <div class="flex items-center gap-3 border-b border-hairline bg-panel px-5 py-4">
          <Badge tone="green">Run</Badge>
          <span class="text-sm font-medium text-ink">Jalankan proses setiap hari</span>
        </div>
        <div class="divide-y divide-hairline">
          {#each runSteps as step, i}
            <div class="flex gap-4 px-5 py-5">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-green/12 text-xs font-medium text-accent-green">
                {i + 1}
              </span>
              <div>
                <h3 class="text-sm font-medium text-ink">{step.title}</h3>
                <p class="mt-1.5 text-sm leading-relaxed text-mute">{step.body}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div use:reveal={140} class="reveal mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard value="1 × 1" label="Customer × workflow" sub="Satu card punya konteks yang jelas" />
      <StatCard value="n/m" label="Progress checklist" sub="Langkah wajib selalu terlihat" />
      <StatCard value="4" label="Status dashboard" sub="Pending, progress, waiting, done" />
      <StatCard value="1" label="Sumber kebenaran" sub="Tidak perlu mengejar update di chat" />
    </div>
  </div>
</section>
