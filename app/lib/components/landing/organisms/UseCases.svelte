<script lang="ts">
  import { reveal } from '$lib/actions/reveal';

  const stats = [
    { label: 'Jalur masuk customer', value: '3+', desc: 'Manual, CSV, API/MCP' },
    { label: 'Progress per card', value: 'n/m', desc: 'Langkah wajib yang terlihat' },
    { label: 'Jenis automasi', value: '3', desc: 'Send, follow-up, handover' },
    { label: 'Status operasional', value: '4', desc: 'Pending, progress, waiting, done' },
    { label: 'Workflow paralel', value: 'N', desc: 'Satu customer, banyak proses' }
  ];

  const layers = [
    { layer: 'WORKFLOW', choice: 'Pendaftaran Webinar', note: 'Stage dan aturan proses', accent: 'bg-accent-blue' },
    { layer: 'CARD', choice: 'Siti Aminah', note: 'Satu customer di satu journey', accent: 'bg-accent-green' },
    { layer: 'CHECKLIST', choice: '2/3 selesai', note: 'Langkah wajib tetap terlihat', accent: 'bg-accent-yellow' },
    { layer: 'AUTOMATION', choice: 'WA + reminder', note: 'Sistem mengarahkan langkah berikutnya', accent: 'bg-accent-red' },
    { layer: 'HANDOVER', choice: 'Waiting Action', note: 'Balasan sampai ke assignee', accent: 'bg-accent-blue' }
  ];
</script>

<section id="use-cases" class="mx-auto max-w-[1240px] scroll-mt-20 px-6 py-24">
  <div use:reveal class="reveal max-w-2xl">
    <p class="text-[13px] font-medium uppercase tracking-[0.18em] text-accent-green">Yang terlihat</p>
    <h2 class="font-display mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-ink">
      Satu layar untuk tahu apa yang harus bergerak.
    </h2>
    <p class="mt-4 text-lg leading-relaxed text-mute">
      Bukan dashboard penuh grafik yang tidak ditindaklanjuti. Flowboard menampilkan
      konteks yang dibutuhkan tim untuk mengambil langkah berikutnya.
    </p>
  </div>

  <div class="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
    {#each stats as stat}
      <div
        class="reveal relative flex flex-col items-start gap-3 rounded-2xl border border-hairline bg-surface/50 p-6 backdrop-blur-xl transition-colors duration-300 hover:border-accent-green/30 hover:bg-surface/80"
        use:reveal
      >
        <p class="text-sm font-medium text-mute">{stat.label}</p>
        <p class="font-display text-4xl font-semibold tracking-tight text-ink">{stat.value}</p>
        <p class="text-sm text-body">{stat.desc}</p>
      </div>
    {/each}
  </div>

  <div class="mt-14 grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
    <div use:reveal class="reveal">
      <p class="text-[13px] font-medium uppercase tracking-[0.18em] text-accent-red">Contoh alur</p>
      <h3 class="font-display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold tracking-tight text-ink">
        Satu alur, dari setup sampai handover.
      </h3>
      <p class="mt-4 text-lg leading-relaxed text-mute">
        Customer tidak lagi berpindah-pindah antara spreadsheet, chat, dan catatan pribadi.
        Semua konteks yang penting menempel di journey-nya.
      </p>
    </div>

    <div use:reveal={80} class="reveal overflow-hidden rounded-xl border border-hairline bg-surface">
      {#each layers as row, i (row.layer)}
        <div class="flex items-center gap-4 px-6 py-5 {i > 0 ? 'border-t border-hairline' : ''}">
          <span class="h-2 w-2 shrink-0 rounded-full {row.accent} shadow-[0_0_10px_currentColor]"></span>
          <span class="w-24 shrink-0 text-[11px] font-medium uppercase tracking-wide text-ash">
            {row.layer}
          </span>
          <span class="flex-1">
            <span class="text-sm font-medium text-ink">{row.choice}</span>
            <span class="ml-2 text-[13px] text-mute">{row.note}</span>
          </span>
        </div>
      {/each}
    </div>
  </div>
</section>
