<script lang="ts">
  /**
   * A compact metric tile: large numeric value over a muted label. Used in the
   * landing "by the numbers" band. Elevation from the surface ladder, no shadow.
   */
  let {
    value,
    label,
    sub = undefined
  }: {
    value: string;
    label: string;
    sub?: string;
  } = $props();
</script>

<div class="rounded-lg border border-hairline bg-surface p-5">
  <div class="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
    {value}
  </div>
  <div class="mt-1.5 text-sm font-medium text-charcoal">{label}</div>
  {#if sub}
    <div class="mt-0.5 text-[13px] text-mute">{sub}</div>
  {/if}
</div>
