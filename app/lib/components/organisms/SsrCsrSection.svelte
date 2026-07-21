<script lang="ts">
  import { reveal } from '$lib/actions/reveal';
</script>

<section id="ssr-csr" class="mx-auto max-w-[1240px] scroll-mt-20 px-6 py-24">
  <div use:reveal class="reveal max-w-2xl">
    <p class="text-[13px] font-medium uppercase tracking-[0.18em] text-accent-green">Unification</p>
    <h2 class="font-display mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-ink">
      SSR and CSR in perfect harmony.
    </h2>
    <p class="mt-4 text-lg leading-relaxed text-mute">
      Call the exact same API logic during Server-Side Rendering (SSR) without network requests, and fetch it from the Client-Side (CSR) with end-to-end types. One implementation, two environments.
    </p>
  </div>

  <div class="mt-14 grid gap-8 lg:grid-cols-2">
    <!-- SSR Example -->
    <div use:reveal class="reveal flex flex-col overflow-hidden rounded-2xl border border-hairline bg-surface">
      <div class="flex items-center gap-2 border-b border-hairline bg-panel px-4 py-3">
        <div class="flex gap-1.5">
          <div class="h-2.5 w-2.5 rounded-full bg-[#ff5f56]"></div>
          <div class="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]"></div>
          <div class="h-2.5 w-2.5 rounded-full bg-[#27c93f]"></div>
        </div>
        <span class="ml-2 font-mono text-xs text-mute">+page.server.ts (SSR)</span>
      </div>
      <div class="flex-1 overflow-x-auto bg-[#0d1117] p-6">
        <pre class="font-mono text-[13px] leading-relaxed text-body"><code><span class="text-accent-blue">import</span> <span class="text-ink">&#123;</span> api <span class="text-ink">&#125;</span> <span class="text-accent-blue">from</span> <span class="text-accent-green">'$lib/api'</span>;

<span class="text-accent-blue">export const</span> <span class="text-accent-yellow">load</span> = <span class="text-accent-blue">async</span> () => &#123;
  <span class="text-mute">// Calls Elysia directly in-memory, no HTTP hop!</span>
  <span class="text-accent-blue">const</span> &#123; data &#125; = <span class="text-accent-blue">await</span> api.users.get();
  
  <span class="text-accent-blue">return</span> &#123; users: data &#125;;
&#125;;</code></pre>
      </div>
    </div>

    <!-- CSR Example -->
    <div use:reveal class="reveal flex flex-col overflow-hidden rounded-2xl border border-hairline bg-surface">
      <div class="flex items-center gap-2 border-b border-hairline bg-panel px-4 py-3">
        <div class="flex gap-1.5">
          <div class="h-2.5 w-2.5 rounded-full bg-[#ff5f56]"></div>
          <div class="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]"></div>
          <div class="h-2.5 w-2.5 rounded-full bg-[#27c93f]"></div>
        </div>
        <span class="ml-2 font-mono text-xs text-mute">+page.svelte (CSR)</span>
      </div>
      <div class="flex-1 overflow-x-auto bg-[#0d1117] p-6">
        <pre class="font-mono text-[13px] leading-relaxed text-body"><code><span class="text-accent-blue">import</span> <span class="text-ink">&#123;</span> client <span class="text-ink">&#125;</span> <span class="text-accent-blue">from</span> <span class="text-accent-green">'$lib/client'</span>;
<span class="text-accent-blue">import</span> <span class="text-accent-blue">type</span> <span class="text-ink">&#123;</span> PageData <span class="text-ink">&#125;</span> <span class="text-accent-blue">from</span> <span class="text-accent-green">'./$types'</span>;

<span class="text-accent-blue">let</span> &#123; data &#125;: &#123; data: PageData &#125; = $props();

<span class="text-accent-blue">async function</span> <span class="text-accent-yellow">refresh</span>() &#123;
  <span class="text-mute">// Typesafe fetch using Eden Client</span>
  <span class="text-accent-blue">const</span> &#123; data: newUsers &#125; = <span class="text-accent-blue">await</span> client.users.get();
  data.users = newUsers;
&#125;</code></pre>
      </div>
    </div>
  </div>
</section>
