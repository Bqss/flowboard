<script lang="ts">
  import { api } from '$lib/api/client';
  import { Button } from '$lib/components/atoms/index.js';
  import { toast } from '$lib/components/molecules/index.js';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { UserSwitchIcon, Logout03Icon } from '@hugeicons/core-free-icons';

  type Props = {
    impersonator: {
      id: string;
      name: string;
      email: string;
    };
    targetUser: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string | null;
    };
  };

  let { impersonator, targetUser }: Props = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  let switching = $state(false);

  async function handleStopImpersonating() {
    if (switching) return;
    switching = true;
    try {
      await api.stopImpersonating();
      toast.success(tr('admin.impersonate.returned'));
      window.location.href = '/dashboard/admin/users';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tr('admin.impersonate.failed');
      toast.error(message);
      switching = false;
    }
  }
</script>

<!-- Impersonation switcher pill fixed at bottom center -->
<div
  class="pointer-events-none fixed inset-x-0 bottom-4 z-[250] flex justify-center px-4"
  role="region"
  aria-label={tr('admin.impersonate.banner')}
>
  <div
    class="pointer-events-auto flex items-center gap-2 rounded-full border border-hairline bg-card py-1 pl-2.5 pr-1 shadow-popover"
  >
    <div class="flex size-5 shrink-0 items-center justify-center rounded-full bg-status-progress-soft text-status-progress-ink">
      <HugeiconsIcon icon={UserSwitchIcon} size={12} strokeWidth={1.8} />
    </div>

    <div class="flex items-center gap-1 text-xs">
      <span class="text-mute shrink-0">{tr('admin.impersonate.banner')}</span>
      <span
        class="max-w-[100px] truncate font-semibold text-ink sm:max-w-[140px]"
        title={targetUser.name}
      >
        {targetUser.name}
      </span>
    </div>

    <Button
      variant="primary"
      size="sm"
      loading={switching}
      onclick={handleStopImpersonating}
      class="h-6 gap-1 rounded-full px-2 text-[11px] font-medium shrink-0"
      title={`${tr('admin.impersonate.backToAdmin')} (${impersonator.name})`}
    >
      {#if !switching}
        <HugeiconsIcon icon={Logout03Icon} size={12} strokeWidth={1.8} />
      {/if}
      <span>{tr('admin.impersonate.backToAdmin')}</span>
    </Button>
  </div>
</div>
