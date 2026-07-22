<script lang="ts">
  import type { PageData } from './$types';
  import { api } from '$lib/api/client';
  import Button from '$lib/components/atoms/Button.svelte';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { PlusSignIcon, Edit02Icon, Delete02Icon } from '@hugeicons/core-free-icons';
  
  let { data }: { data: PageData } = $props();

  let showModal = $state(false);
  let modalMode = $state<'create' | 'edit'>('create');
  
  let editingId = $state('');
  let formName = $state('');
  let formEmail = $state('');
  let formPassword = $state('');
  let loading = $state(false);

  function openCreate() {
    modalMode = 'create';
    editingId = '';
    formName = '';
    formEmail = '';
    formPassword = '';
    showModal = true;
  }

  function openEdit(user: { id: string, name: string, email: string }) {
    modalMode = 'edit';
    editingId = user.id;
    formName = user.name;
    formEmail = user.email;
    formPassword = '';
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  async function submitForm() {
    loading = true;
    try {
      if (modalMode === 'create') {
        await api.createUser({ name: formName, email: formEmail, password: formPassword });
      } else {
        await api.updateUser(editingId, { name: formName });
      }
      location.reload();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      loading = false;
    }
  }

</script>

<svelte:head>
  <title>Users Management — Narko</title>
</svelte:head>

<div class="mx-auto max-w-5xl">
  <div class="mb-8 flex items-center justify-between">
    <div>
      <h1 class="font-display text-2xl font-semibold tracking-tight text-ink">Users Management</h1>
      <p class="mt-2 text-mute">Manage all registered users in your application.</p>
    </div>
    <Button variant="primary" onclick={openCreate}>
      <HugeiconsIcon icon={PlusSignIcon} size={18} />
      Add User
    </Button>
  </div>

  <div class="overflow-hidden rounded-lg border border-hairline bg-surface">
    <table class="w-full text-left">
      <thead class="border-b border-hairline bg-surface-elevated">
        <tr>
          <th class="px-6 py-3 text-[13px] font-medium uppercase tracking-[0.1px] text-mute">User</th>
          <th class="px-6 py-3 text-[13px] font-medium uppercase tracking-[0.1px] text-mute">Email</th>
          <th class="px-6 py-3 text-[13px] font-medium uppercase tracking-[0.1px] text-mute">ID</th>
          <th class="px-6 py-3 text-right text-[13px] font-medium uppercase tracking-[0.1px] text-mute">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-hairline">
        {#each data.users as user}
          <tr class="transition-colors hover:bg-surface-card">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-accent-blue/20 text-[13px] font-semibold text-accent-blue">
                  {user.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <span class="text-[14px] font-medium text-ink">{user.name}</span>
              </div>
            </td>
            <td class="px-6 py-4 text-[14px] text-body">{user.email}</td>
            <td class="px-6 py-4 font-mono text-[13px] text-mute">{user.id}</td>
            <td class="px-6 py-4 text-right">
              <div class="flex items-center justify-end gap-3">
                <button 
                  onclick={() => openEdit(user)}
                  class="flex items-center gap-1.5 text-[13px] font-medium text-ink hover:underline"
                >
                  <HugeiconsIcon icon={Edit02Icon} size={14} />
                  Edit
                </button>
                <button 
                  onclick={async () => {
                    if (confirm('Delete user?')) {
                      await api.deleteUser(user.id);
                      location.reload();
                    }
                  }}
                  class="flex items-center gap-1.5 text-[13px] font-medium text-accent-red hover:underline"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={14} />
                  Delete
                </button>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="4" class="px-6 py-8 text-center text-mute">No users found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-4 backdrop-blur-sm" role="dialog" tabindex="-1">
    <div class="absolute inset-0" onclick={closeModal} role="presentation"></div>
    
    <div class="relative w-full max-w-md overflow-hidden rounded-xl border border-hairline bg-surface shadow-2xl">
      <div class="border-b border-hairline px-6 py-4">
        <h3 class="font-display text-lg font-semibold text-ink">
          {modalMode === 'create' ? 'Create User' : 'Edit User'}
        </h3>
      </div>
      
      <form onsubmit={(e) => { e.preventDefault(); submitForm(); }} class="p-6">
        <div class="space-y-4">
          <div>
            <label for="fname" class="mb-1.5 block text-[14px] font-medium text-ink">Full Name</label>
            <input 
              type="text" 
              id="fname" 
              bind:value={formName} 
              required
              class="w-full rounded-md border border-hairline bg-surface-elevated px-3 py-2 text-[14px] text-ink transition-all focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hairline-strong"
            />
          </div>
          
          <div>
            <label for="femail" class="mb-1.5 block text-[14px] font-medium text-ink">Email Address</label>
            <input 
              type="email" 
              id="femail" 
              bind:value={formEmail} 
              required
              disabled={modalMode === 'edit'}
              class="w-full rounded-md border border-hairline bg-surface-elevated px-3 py-2 text-[14px] text-ink transition-all focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hairline-strong disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {#if modalMode === 'create'}
            <div>
              <label for="fpass" class="mb-1.5 block text-[14px] font-medium text-ink">Password</label>
              <input 
                type="password" 
                id="fpass" 
                bind:value={formPassword} 
                required
                class="w-full rounded-md border border-hairline bg-surface-elevated px-3 py-2 text-[14px] text-ink transition-all focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hairline-strong"
              />
            </div>
          {/if}
        </div>
        
        <div class="mt-8 flex items-center justify-end gap-3">
          <Button variant="tertiary" type="button" onclick={closeModal}>Cancel</Button>
          <Button variant="primary" type="submit" {loading}>
            {modalMode === 'create' ? 'Create User' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}
