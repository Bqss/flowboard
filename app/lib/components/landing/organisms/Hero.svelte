<script lang="ts">
  import Button from '../atoms/Button.svelte';
  import Badge from '../atoms/Badge.svelte';

  let { user = null }: { user?: { name: string } | null } = $props();
</script>

<section class="relative isolate overflow-hidden">
  <div
    class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] opacity-80"
    aria-hidden="true"
    style="background:
      radial-gradient(60% 70% at 70% 8%, rgba(87,193,255,0.18), transparent 70%),
      radial-gradient(50% 60% at 15% 22%, rgba(89,212,153,0.12), transparent 72%);"
  ></div>
  <div
    class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 opacity-60"
    aria-hidden="true"
    style="background: repeating-linear-gradient(115deg, transparent 0 72px, rgba(87,193,255,0.16) 72px 74px); mask-image: linear-gradient(to bottom, black, transparent);"
  ></div>

  <div class="mx-auto w-full max-w-[1240px] px-6 pb-24 pt-32 lg:pb-28 lg:pt-40">
    <div class="grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
      <div class="flex flex-col items-start">
        <Badge tone="blue" dot>Customer onboarding workspace</Badge>

        <h1 class="font-display mt-6 max-w-2xl text-[clamp(2.65rem,6vw,5rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-ink">
          Setiap pelanggan bergerak.
          <span class="text-accent-blue">Tidak ada yang terlewat.</span>
        </h1>

        <p class="mt-6 max-w-xl text-lg leading-relaxed text-body">
          Flowboard membantu tim mengubah proses onboarding menjadi workflow yang terlihat:
          card pelanggan, checklist wajib, reminder staff, dan follow-up WhatsApp dalam satu alur.
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-3">
          {#if user}
            <Button variant="primary" size="lg" href="/dashboard">Buka workspace</Button>
          {:else}
            <Button variant="primary" size="lg" href="/register">Mulai gratis</Button>
          {/if}
          <Button variant="tertiary" size="lg" href="#how-it-works">Lihat cara kerja</Button>
        </div>

        <div class="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-mute">
          <span>Workflow yang jelas</span>
          <span class="text-ash">·</span>
          <span>Checklist yang berjalan</span>
          <span class="text-ash">·</span>
          <span>Follow-up otomatis</span>
        </div>
      </div>

      <div
        role="img"
        aria-label="Contoh board Flowboard untuk customer onboarding"
        class="relative rounded-2xl border border-hairline bg-surface/90 p-3 shadow-[0_28px_90px_-42px_rgba(87,193,255,0.65)] backdrop-blur-xl sm:p-4"
      >
        <div class="rounded-xl border border-hairline bg-canvas">
          <div class="flex items-center justify-between gap-4 border-b border-hairline px-4 py-3">
            <div class="min-w-0">
              <p class="text-[10px] font-medium uppercase tracking-[0.18em] text-ash">Workflow aktif</p>
              <p class="mt-1 truncate text-sm font-medium text-ink">Pendaftaran Webinar</p>
            </div>
            <Badge tone="green" dot>Berjalan</Badge>
          </div>

          <div class="grid gap-2 p-3 sm:grid-cols-3">
            <div class="min-w-0 rounded-lg bg-elevated p-2.5">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[11px] font-medium text-charcoal">Pending</span>
                <span class="text-[11px] text-ash">12</span>
              </div>
              <div class="mt-2 space-y-2">
                <div class="rounded-md border border-hairline bg-surface p-2.5">
                  <p class="truncate text-xs font-medium text-ink">Siti Aminah</p>
                  <p class="mt-1 text-[10px] text-mute">Verifikasi data</p>
                  <div class="mt-2 h-1 rounded-full bg-white/10">
                    <div class="h-1 w-1/3 rounded-full bg-accent-blue"></div>
                  </div>
                </div>
                <div class="rounded-md border border-hairline bg-surface p-2.5">
                  <p class="truncate text-xs font-medium text-ink">Ahmad Fauzi</p>
                  <p class="mt-1 text-[10px] text-mute">Menunggu konfirmasi</p>
                </div>
              </div>
            </div>

            <div class="min-w-0 rounded-lg bg-elevated p-2.5">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[11px] font-medium text-charcoal">Follow-up</span>
                <span class="text-[11px] text-ash">8</span>
              </div>
              <div class="mt-2 space-y-2">
                <div class="rounded-md border border-accent-blue/30 bg-accent-blue/10 p-2.5">
                  <p class="truncate text-xs font-medium text-ink">Rina Putri</p>
                  <p class="mt-1 text-[10px] text-accent-blue">Reminder H-1 terjadwal</p>
                  <div class="mt-2 flex items-center justify-between text-[10px] text-mute">
                    <span>Checklist</span><span class="text-ink">2/3</span>
                  </div>
                </div>
                <div class="rounded-md border border-hairline bg-surface p-2.5">
                  <p class="truncate text-xs font-medium text-ink">Dimas Pratama</p>
                  <p class="mt-1 text-[10px] text-mute">Menunggu balasan</p>
                </div>
              </div>
            </div>

            <div class="min-w-0 rounded-lg bg-elevated p-2.5">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[11px] font-medium text-charcoal">Selesai</span>
                <span class="text-[11px] text-ash">47</span>
              </div>
              <div class="mt-2 rounded-md border border-hairline bg-surface p-2.5">
                <p class="truncate text-xs font-medium text-ink">Nadia Rahma</p>
                <p class="mt-1 text-[10px] text-accent-green">Semua langkah selesai</p>
                <div class="mt-3 flex items-center gap-1.5">
                  <span class="h-1.5 w-1.5 rounded-full bg-accent-green"></span>
                  <span class="text-[10px] text-mute">Handover selesai</span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between gap-4 border-t border-hairline px-4 py-3 text-[11px]">
            <span class="text-mute">Status workspace</span>
            <span class="font-medium text-accent-green">Semua proses terlihat</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
