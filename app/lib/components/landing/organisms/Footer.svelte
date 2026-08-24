<script lang="ts">
  import { locale } from '$lib/i18n/index.js';
  import { landingCopy } from '$lib/i18n/landing.js';
  import Logo from '../atoms/Logo.svelte';

  const copy = $derived(landingCopy[$locale]);
</script>

<footer class="border-t border-hairline bg-card">
  <div class="mx-auto max-w-[1240px] px-6 py-16">
    <div class="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
      <div>
        <Logo />
        <p class="mt-4 max-w-xs text-sm leading-relaxed text-body">
          {copy.footer.description}
        </p>
      </div>

      {#each copy.footer.columns as col (col.title)}
        <div>
          <h4 class="text-sm font-bold text-ink">{col.title}</h4>
          <ul class="mt-4 flex flex-col gap-3">
            {#each col.links as link (link.label)}
              <li>
                  <a href={link.href} class="text-sm font-semibold text-mute transition-colors hover:text-primary">
                  {link.label}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>

    <div
      class="mt-14 flex flex-col gap-4 border-t border-hairline pt-8 text-xs font-semibold text-faint sm:flex-row sm:items-center sm:justify-between"
    >
      <span>© {new Date().getFullYear()} Flowboard.</span>
      <span>{copy.footer.workflow}</span>
    </div>
  </div>
</footer>
