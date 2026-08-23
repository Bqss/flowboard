<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  /**
   * Dark text input. Surface-elevated fill, hairline border that brightens on
   * focus (a subtle lift, not a colored ring — per DESIGN.landing.md). Binding uses
   * oninput rather than bind:value so a dynamic `type` attribute is allowed.
   */
  let {
    type = 'text',
    value = $bindable(''),
    invalid = false,
    class: klass = '',
    ...rest
  }: {
    type?: HTMLInputAttributes['type'];
    value?: string;
    invalid?: boolean;
    class?: string;
    [key: string]: unknown;
  } = $props();
</script>

<input
  {type}
  {value}
  oninput={(e) => (value = (e.currentTarget as HTMLInputElement).value)}
  aria-invalid={invalid ? 'true' : undefined}
  class="h-11 w-full rounded-md border border-hairline bg-elevated px-3.5 text-sm text-ink
    placeholder:text-ash transition-colors duration-200
    focus:border-hairline-strong focus:bg-card focus:outline-none
    aria-[invalid]:border-accent-red/60 {klass}"
  {...rest}
/>
