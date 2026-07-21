<script lang="ts">
  import { reveal } from '$lib/actions/reveal';
  
  const stats = [
    { label: 'API Response Time', value: '16ms', desc: 'Average native response delay' },
    { label: 'Svelte Load Time (SSR)', value: '286ms', desc: 'No network roundtrip to API' },
    { label: 'Svelte Load Time (CSR)', value: '302ms', desc: 'Typed RPC via single port' },
    { label: 'Requests / Min (API)', value: '188,340', desc: 'Elysia native routing' },
    { label: 'Requests / Min (SvelteKit)', value: '10,500', desc: 'SvelteKit SSR on Bun' }
  ];
</script>

<section id="benchmarks" class="mx-auto max-w-[1240px] scroll-mt-20 px-6 py-24">
  <div use:reveal class="reveal max-w-2xl">
    <p class="text-[13px] font-medium uppercase tracking-[0.18em] text-accent-blue">Benchmarks</p>
    <h2 class="font-display mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-ink">
      Blisteringly fast by default.
    </h2>
    <p class="mt-4 text-lg leading-relaxed text-mute">
      By fusing the backend API and frontend into a single Bun process, we eliminate internal network hops, reverse proxy layers, and CORS overhead. The result speaks for itself.
    </p>
  </div>

  <div class="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
    {#each stats as stat, i}
      <div 
        class="reveal relative flex flex-col items-start gap-3 rounded-2xl border border-hairline bg-surface/50 p-6 backdrop-blur-xl transition-all duration-300 hover:border-accent-blue/30 hover:bg-surface/80" 
        use:reveal 
      >
        <p class="text-sm font-medium text-mute">{stat.label}</p>
        <p class="font-display text-4xl font-semibold tracking-tight text-ink">{stat.value}</p>
        <p class="text-sm text-body">{stat.desc}</p>
      </div>
    {/each}
  </div>
</section>
