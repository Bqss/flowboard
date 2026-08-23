<script lang="ts">
  import '../../ds.css';
  import { Logo } from '$lib/components/atoms/index.js';

  let { children }: { children: import('svelte').Snippet } = $props();
</script>

<div data-theme="app" class="relative flex min-h-screen flex-col bg-canvas text-body">
  <div
    class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-15%,rgba(79,70,229,0.14),transparent)]"
    aria-hidden="true"
  ></div>

  <header class="relative z-10 flex items-center px-6 py-6 md:px-10">
    <a href="/" class="flex items-center gap-2.5 transition-opacity hover:opacity-80">
      <Logo size={36} />
      <span class="text-[15px] font-bold tracking-tight text-ink">Flowboard</span>
    </a>
  </header>

  <main class="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-4">
    {@render children()}
  </main>

  <footer class="relative z-10 px-6 py-6 text-center md:px-10">
    <p class="ds-caption text-faint">Customer onboarding yang mengejar staff — bukan sebaliknya.</p>
  </footer>
</div>
