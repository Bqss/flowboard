<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { WithElementRef } from '$lib/utils.js';
  import MultiSelectCombobox from './MultiSelectCombobox.svelte';

  type Staff = { id: string; full_name: string };

  type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    staff: Staff[];
    assigned?: string[];
    primary?: string | null;
    class?: string;
  };

  let {
    ref = $bindable(null),
    staff,
    assigned = $bindable([]),
    primary = $bindable(null),
    class: className,
    ...rest
  }: Props = $props();

  const options = $derived(staff.map((s) => ({ value: s.id, label: s.full_name })));
</script>

<MultiSelectCombobox
  bind:ref
  {options}
  bind:values={assigned}
  bind:primary
  showPrimaryBadge
  class={className}
  {...(rest as Record<string, unknown>)}
/>
