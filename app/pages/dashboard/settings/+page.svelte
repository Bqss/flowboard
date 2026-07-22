<script lang="ts">
  import Button from '$lib/components/atoms/Button.svelte';
  import { api } from '$lib/api/client';
  import { invalidateAll } from '$app/navigation';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let loading = $state(false);
  let name = $state(data.user?.name || '');
  let email = $state(data.user?.email || '');
  
  let currentPassword = $state('');
  let newPassword = $state('');
  
  let fileInput: HTMLInputElement;

  async function updateProfile() {
    if (!data.user) return;
    loading = true;
    try {
      await api.updateUser(data.user.id, { name });
      await invalidateAll();
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    } finally {
      loading = false;
    }
  }

  async function updatePassword() {
    loading = true;
    try {
      await api.changePassword({ currentPassword, newPassword });
      alert('Password updated successfully');
      currentPassword = '';
      newPassword = '';
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      loading = false;
    }
  }

  async function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      await api.uploadAvatar(file);
      await invalidateAll();
    } catch (err) {
      console.error(err);
      alert('Failed to upload avatar');
    }
  }
</script>

<svelte:head>
  <title>Setting Profile — Narko</title>
</svelte:head>

<div class="mx-auto max-w-3xl">
  <div class="mb-8">
    <h1 class="font-display text-2xl font-semibold tracking-tight text-ink">Profile Settings</h1>
    <p class="mt-2 text-mute">Manage your account details and password.</p>
  </div>

  <div class="flex flex-col gap-8">
    <!-- Profile Info Card -->
    <div class="rounded-lg border border-hairline bg-surface p-6">
      <h2 class="mb-6 text-lg font-medium text-ink">Profile Information</h2>
      
      <div class="mb-8 flex items-center gap-6">
        {#if data.user?.avatarUrl}
          <img src={data.user.avatarUrl} alt="Avatar" class="h-20 w-20 rounded-full object-cover border border-hairline" />
        {:else}
          <div class="flex h-20 w-20 items-center justify-center rounded-full bg-accent-blue/20 text-3xl font-semibold text-accent-blue">
            {data.user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        {/if}
        <div>
          <input 
            type="file" 
            accept="image/png, image/jpeg, image/gif" 
            class="hidden" 
            bind:this={fileInput} 
            onchange={handleFileChange} 
          />
          <Button variant="tertiary" size="sm" onclick={() => fileInput.click()}>Change Picture</Button>
          <p class="mt-2 text-[13px] text-mute">JPG, GIF or PNG. 1MB max.</p>
        </div>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); updateProfile(); }} class="space-y-4">
        <div>
          <label for="name" class="mb-1.5 block text-[14px] font-medium text-ink">Full Name</label>
          <input 
            type="text" 
            id="name" 
            bind:value={name} 
            class="w-full rounded-md border border-hairline bg-surface-elevated px-3 py-2 text-[14px] text-ink transition-all focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hairline-strong"
          />
        </div>
        
        <div>
          <label for="email" class="mb-1.5 block text-[14px] font-medium text-ink">Email Address</label>
          <input 
            type="email" 
            id="email" 
            bind:value={email} 
            disabled
            class="w-full cursor-not-allowed rounded-md border border-hairline bg-surface-elevated/50 px-3 py-2 text-[14px] text-mute"
          />
          <p class="mt-1 text-[13px] text-mute">Email cannot be changed.</p>
        </div>

        <div class="pt-4">
          <Button variant="primary" type="submit" {loading}>Save Changes</Button>
        </div>
      </form>
    </div>

    <!-- Password Card -->
    <div class="rounded-lg border border-hairline bg-surface p-6">
      <h2 class="mb-6 text-lg font-medium text-ink">Change Password</h2>
      
      <form onsubmit={(e) => { e.preventDefault(); updatePassword(); }} class="space-y-4">
        <div>
          <label for="current_password" class="mb-1.5 block text-[14px] font-medium text-ink">Current Password</label>
          <input 
            type="password" 
            id="current_password" 
            bind:value={currentPassword} 
            class="w-full rounded-md border border-hairline bg-surface-elevated px-3 py-2 text-[14px] text-ink transition-all focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hairline-strong"
          />
        </div>
        
        <div>
          <label for="new_password" class="mb-1.5 block text-[14px] font-medium text-ink">New Password</label>
          <input 
            type="password" 
            id="new_password" 
            bind:value={newPassword} 
            class="w-full rounded-md border border-hairline bg-surface-elevated px-3 py-2 text-[14px] text-ink transition-all focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hairline-strong"
          />
        </div>

        <div class="pt-4">
          <Button variant="primary" type="submit" {loading}>Update Password</Button>
        </div>
      </form>
    </div>
  </div>
</div>
