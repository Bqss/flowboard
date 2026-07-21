<script lang="ts">
  import { page } from '$app/stores';
  import { goto, invalidateAll } from '$app/navigation';
  import { api } from '$lib/api/client';
  import type { LayoutData } from '../$types';
  import Logo from '$lib/components/atoms/Logo.svelte';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { Home01Icon, UserGroupIcon, Settings01Icon } from '@hugeicons/core-free-icons';

  let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

  let showDropdown = $state(false);
  let loggingOut = $state(false);

  async function logout() {
    loggingOut = true;
    try {
      await api.logout();
      await invalidateAll();
      await goto('/login');
    } finally {
      loggingOut = false;
      showDropdown = false;
    }
  }
</script>

<div class="flex min-h-screen w-full bg-canvas text-body">
  <!-- Sidebar -->
  <aside class="flex w-64 flex-col border-r border-hairline bg-canvas">
    <div class="flex h-14 items-center px-6">
      <Logo size="sm" href="/dashboard" />
    </div>
    <nav class="flex-1 space-y-1 px-4 py-4">
      <a 
        href="/dashboard" 
        class="flex items-center gap-3 rounded-md px-3 py-2 text-[14px] font-medium transition-colors {$page.url.pathname === '/dashboard' ? 'bg-surface-elevated text-ink' : 'text-body hover:bg-surface hover:text-ink'}"
      >
        <HugeiconsIcon icon={Home01Icon} size={18} />
        Dashboard
      </a>
      <a 
        href="/dashboard/users" 
        class="flex items-center gap-3 rounded-md px-3 py-2 text-[14px] font-medium transition-colors {$page.url.pathname.startsWith('/dashboard/users') ? 'bg-surface-elevated text-ink' : 'text-body hover:bg-surface hover:text-ink'}"
      >
        <HugeiconsIcon icon={UserGroupIcon} size={18} />
        Users Management
      </a>
      <a 
        href="/dashboard/settings" 
        class="flex items-center gap-3 rounded-md px-3 py-2 text-[14px] font-medium transition-colors {$page.url.pathname.startsWith('/dashboard/settings') ? 'bg-surface-elevated text-ink' : 'text-body hover:bg-surface hover:text-ink'}"
      >
        <HugeiconsIcon icon={Settings01Icon} size={18} />
        Setting
      </a>
    </nav>
  </aside>

  <!-- Main Content -->
  <div class="flex min-w-0 flex-1 flex-col">
    <!-- Topbar -->
    <header class="flex h-14 items-center justify-between border-b border-hairline bg-canvas px-6">
      <div class="flex-1"></div>
      
      <div class="flex items-center gap-4">
        <!-- User Dropdown -->
        <div class="relative">
          <button 
            onclick={() => showDropdown = !showDropdown} 
            class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface-elevated text-[13px] font-medium text-ink transition-colors hover:bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hairline-strong"
            aria-expanded={showDropdown}
            aria-haspopup="true"
          >
            {#if data.user?.avatarUrl}
              <img src={data.user.avatarUrl} alt="Avatar" class="h-full w-full object-cover" />
            {:else}
              {data.user?.name?.charAt(0).toUpperCase() || 'U'}
            {/if}
          </button>
          
          {#if showDropdown}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <div 
              class="fixed inset-0 z-10" 
              onclick={() => showDropdown = false} 
              role="dialog"
              aria-label="Close dropdown"
            ></div>
            <div class="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-md border border-hairline bg-surface shadow-2xl z-20">
              <div class="border-b border-hairline px-4 py-3">
                <p class="truncate text-[14px] font-medium text-ink">{data.user?.username || data.user?.name || 'User'}</p>
                <p class="truncate text-[13px] text-mute">{data.user?.email || 'user@example.com'}</p>
              </div>
              <div class="py-1">
                <a href="/dashboard/settings" class="block px-4 py-2 text-[14px] text-body hover:bg-surface-card hover:text-ink">Setting</a>
                <button onclick={logout} disabled={loggingOut} class="block w-full text-left px-4 py-2 text-[14px] text-accent-red hover:bg-surface-card disabled:opacity-50">Logout</button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </header>

    <main class="flex-1 overflow-auto bg-canvas p-8">
      <div class="mx-auto w-full max-w-5xl">
        {@render children()}
      </div>
    </main>
  </div>
</div>
