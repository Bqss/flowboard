<script lang="ts">
  import FeatureCard from '../molecules/FeatureCard.svelte';
  import { reveal } from '$lib/actions/reveal';

  const features = [
    {
      title: 'Workflow yang jelas',
      accent: 'blue' as const,
      body: 'Definisikan stage, owner, checklist, dan aturan proses sekali. Tim menjalankan alur yang sama untuk setiap pelanggan.',
      path: 'M4 6h16M4 12h10M4 18h16M17 10l3 2-3 2'
    },
    {
      title: 'Checklist yang berjalan',
      accent: 'green' as const,
      body: 'Langkah required tetap terlihat di dalam card. Progress n/m memberi konteks tanpa membuka spreadsheet lain.',
      path: 'M5 12l4 4L19 6M4 4h16v16H4z'
    },
    {
      title: 'Reminder untuk staff',
      accent: 'yellow' as const,
      body: 'Card yang diam berubah menjadi Waiting Action. Assignee tahu siapa yang harus ditindaklanjuti berikutnya.',
      path: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4'
    },
    {
      title: 'WhatsApp ke pelanggan',
      accent: 'blue' as const,
      body: 'Kirim pesan template dan follow-up sesuai stage. Balasan pelanggan bisa memberi handover ke staff.',
      path: 'M5 5h14v10H9l-4 4zM8 9h8M8 12h5'
    },
    {
      title: 'Satu pelanggan, banyak proses',
      accent: 'green' as const,
      body: 'Identitas customer tetap satu, tetapi card bisa berjalan paralel di Webinar, Post Produk, atau workflow lain.',
      path: 'M6 4h12v5H6zM4 15h7v5H4zM13 15h7v5h-7zM12 9v3M7.5 12h9'
    },
    {
      title: 'Dari masuk sampai selesai',
      accent: 'red' as const,
      body: 'Masukkan pelanggan manual, lewat CSV, API, atau estafet. Semua jalur berakhir di createCard yang sama.',
      path: 'M4 12h16M13 5l7 7-7 7M4 5v14'
    }
  ];
</script>

<section id="features" class="mx-auto max-w-[1240px] scroll-mt-20 px-6 py-24">
  <div use:reveal class="reveal max-w-2xl">
    <p class="text-[13px] font-medium uppercase tracking-[0.18em] text-accent-blue">Fitur inti</p>
    <h2 class="font-display mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-ink">
      Operasional yang mengikuti proses.
    </h2>
    <p class="mt-4 text-lg leading-relaxed text-mute">
      Flowboard menyatukan konteks pelanggan, pekerjaan staff, dan automasi follow-up
      supaya proses tidak berhenti di kepala satu orang.
    </p>
  </div>

  <div class="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each features as f, i (f.title)}
      <FeatureCard title={f.title} accent={f.accent} delay={i * 60}>
        {#snippet icon()}
          <span
            class="flex h-10 w-10 items-center justify-center rounded-md
              {f.accent === 'red' ? 'bg-accent-red/12 text-accent-red' : ''}
              {f.accent === 'blue' ? 'bg-accent-blue/12 text-accent-blue' : ''}
              {f.accent === 'green' ? 'bg-accent-green/12 text-accent-green' : ''}
              {f.accent === 'yellow' ? 'bg-accent-yellow/12 text-accent-yellow' : ''}"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d={f.path} stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        {/snippet}
        {f.body}
      </FeatureCard>
    {/each}
  </div>
</section>
