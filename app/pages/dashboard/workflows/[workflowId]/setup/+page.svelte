<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  const workflowId = $derived(page.params.workflowId);

  $effect(() => {
    if (!workflowId) return;
    const tab = page.url.searchParams.get('tab');
    if (tab === 'settings') {
      goto(`/dashboard/workflows/${workflowId}/settings`, { replaceState: true });
    } else {
      goto(`/dashboard/workflows/${workflowId}?mode=edit`, { replaceState: true });
    }
  });
</script>

<div class="flex items-center justify-center min-h-[300px]">
  <p class="text-sm text-mute">Mengalihkan ke tetapan aliran kerja…</p>
</div>
