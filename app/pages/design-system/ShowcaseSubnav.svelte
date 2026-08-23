<script lang="ts">
  let {
    items
  }: {
    items: { href: string; label: string }[];
  } = $props();
</script>

<nav class="flex flex-wrap gap-1 border-b border-hairline pb-3" aria-label="Page sections">
  {#each items as item (item.href)}
    <a
      href={item.href}
      class="ds-caption rounded-full px-3 py-1.5 text-mute transition hover:bg-lane hover:text-ink-soft"
    >
      {item.label}
    </a>
  {/each}
</nav>
