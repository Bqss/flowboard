<script lang="ts">
  let {
    id,
    title,
    description = '',
    children
  }: {
    id: string;
    title: string;
    description?: string;
    children: import('svelte').Snippet;
  } = $props();
</script>

<section {id} class="scroll-mt-28 space-y-4">
  <div>
    <h2 class="ds-section-title text-ink">{title}</h2>
    {#if description}
      <p class="ds-body mt-1 max-w-2xl text-mute">{description}</p>
    {/if}
  </div>
  <div class="rounded-card border border-hairline bg-card p-5 shadow-[var(--shadow-card)] md:p-6">
    {@render children()}
  </div>
</section>
