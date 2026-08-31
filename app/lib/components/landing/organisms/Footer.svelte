<script lang="ts">
  import { locale } from '$lib/i18n/index.js';
  import { landingCopy } from '$lib/i18n/landing.js';
  import Logo from '../atoms/Logo.svelte';
  import { reveal } from '$lib/actions/reveal.js';
  const copy = $derived(landingCopy[$locale]);
</script>

<footer class="bg-canvas px-5 pb-8 pt-16 sm:px-8 sm:pb-10 sm:pt-20">
  <div class="mx-auto max-w-[1320px]">
    <div class="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-24" use:reveal>
      <div>
        <Logo size="lg" />
        <p class="mt-5 max-w-[42ch] text-sm font-medium leading-relaxed text-body">{copy.footer.description}</p>
      </div>

      <nav class="flex flex-wrap gap-x-8 gap-y-4" aria-label="Footer">
        {#each [...copy.footer.columns[0].links, ...copy.footer.columns[2].links.slice(0, 2)] as link (link.label)}
          <a href={link.href} class="text-sm font-semibold text-mute transition-colors duration-300 hover:text-primary">
            {link.label}
          </a>
        {/each}
      </nav>
    </div>

    <div class="mt-16 flex flex-wrap items-center justify-between gap-4 pt-6 shadow-[inset_0_1px_0_var(--color-hairline)]">
      <p class="text-xs font-medium text-faint">© {new Date().getFullYear()} actjom</p>
      <p class="text-xs font-medium text-faint">{copy.footer.workflow}</p>
    </div>
  </div>
</footer>
