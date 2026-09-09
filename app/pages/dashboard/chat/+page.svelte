<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    goto('/dashboard');
  });
</script>

<div class="flex items-center justify-center py-20 text-mute">
  <p class="text-sm">Redirecting…</p>
</div>
