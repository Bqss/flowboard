<script lang="ts">
  import type { PageData } from './$types';
  import { api } from '$lib/api/client';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Avatar, Button, Input } from '$lib/components/atoms/index.js';
  import { FormField, PasswordInput, Breadcrumb } from '$lib/components/molecules/index.js';
  import { Dialog } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { Add01Icon, Edit02Icon, Delete02Icon } from '@hugeicons/core-free-icons';
  
  let { data }: { data: PageData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  let showModal = $state(false);
  let modalMode = $state<'create' | 'edit'>('create');
  
  let editingId = $state('');
  let formName = $state('');
  let formEmail = $state('');
  let formPassword = $state('');
  let formPhone = $state('');
  let loading = $state(false);

  function openCreate() {
    modalMode = 'create';
    editingId = '';
    formName = '';
    formEmail = '';
    formPassword = '';
    formPhone = '';
    showModal = true;
  }

  function openEdit(user: { id: string, name: string, email: string }) {
    modalMode = 'edit';
    editingId = user.id;
    formName = user.name;
    formEmail = user.email;
    formPassword = '';
    formPhone = '';
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  async function submitForm() {
    loading = true;
    try {
      if (modalMode === 'create') {
        await api.createUser({ name: formName, email: formEmail, phone: formPhone, password: formPassword });
      } else {
        await api.updateUser(editingId, { name: formName, phone: formPhone || undefined });
      }
      location.reload();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : tr('users.operationFailed'));
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{tr('users.title')} — Flowboard</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-8">
  <div class="space-y-3">
    <Breadcrumb
      items={[
        { label: tr('common.dashboard'), href: '/dashboard' },
        { label: tr('users.title') }
      ]}
      showHomeIcon
    />
    <div class="flex flex-wrap items-center justify-between gap-4 pt-1">
      <div>
        <h1 class="ds-page-title text-ink">{tr('users.title')}</h1>
        <p class="ds-body mt-1 text-mute">{tr('users.description')}</p>
      </div>
      <Button variant="primary" onclick={openCreate}>
        <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.8} />
        <span>{tr('users.add')}</span>
      </Button>
    </div>
  </div>

  <div class="overflow-hidden rounded-2xl bg-card shadow-card">
    <table class="w-full text-left">
      <thead class="border-b border-hairline bg-canvas-sunken">
        <tr>
          <th class="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-mute">{tr('users.user')}</th>
          <th class="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-mute">{tr('users.email')}</th>
          <th class="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-mute">{tr('users.id')}</th>
          <th class="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-mute">{tr('users.actions')}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-hairline">
        {#each data.users as user (user.id)}
          <tr class="transition-colors hover:bg-lane/40">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <Avatar name={user.name} size={32} />
                <span class="text-sm font-semibold text-ink">{user.name}</span>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-body">{user.email}</td>
            <td class="px-6 py-4 font-mono text-xs text-mute">{user.id}</td>
            <td class="px-6 py-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onclick={() => openEdit(user)}
                >
                  <HugeiconsIcon icon={Edit02Icon} size={16} strokeWidth={1.8} />
                  {tr('common.edit')}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  class="text-status-urgent-ink hover:text-status-urgent-strong"
                  onclick={async () => {
                    if (confirm(tr('users.deleteConfirm'))) {
                      await api.deleteUser(user.id);
                      location.reload();
                    }
                  }}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.8} />
                  {tr('common.delete')}
                </Button>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="4" class="px-6 py-10 text-center ds-body text-mute">{tr('users.empty')}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<Dialog
  bind:open={showModal}
  title={modalMode === 'create' ? tr('users.createTitle') : tr('users.editTitle')}
  description={modalMode === 'create' ? tr('users.createDescription') : tr('users.editDescription')}
>
  <form onsubmit={(e) => { e.preventDefault(); submitForm(); }} class="space-y-4">
    <FormField label={tr('users.fullName')} required>
      {#snippet control(args)}
        <Input 
          {...args} 
          bind:value={formName} 
          placeholder="Jane Doe"
          required
        />
      {/snippet}
    </FormField>
    
    <FormField label={tr('users.emailAddress')} required>
      {#snippet control(args)}
        <Input 
          {...args} 
          type="email" 
          bind:value={formEmail} 
          placeholder="jane@company.com"
          disabled={modalMode === 'edit'}
          required
        />
      {/snippet}
    </FormField>

    <FormField label={tr('settings.phone')}>
      {#snippet control(args)}
        <Input
          {...args}
          bind:value={formPhone}
          placeholder={tr('settings.phonePlaceholder')}
        />
      {/snippet}
    </FormField>

    {#if modalMode === 'create'}
      <FormField label={tr('users.password')} required>
        {#snippet control(args)}
          <PasswordInput
            {...args}
            bind:value={formPassword}
            placeholder="••••••••"
            showPasswordLabel={tr('settings.showPassword')}
            hidePasswordLabel={tr('settings.hidePassword')}
            strengthLabels={[
              tr('settings.strengthTooWeak'),
              tr('settings.strengthWeak'),
              tr('settings.strengthOkay'),
              tr('settings.strengthStrong'),
              tr('settings.strengthVeryStrong')
            ]}
            required
          />
        {/snippet}
      </FormField>
    {/if}
  </form>
  
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={closeModal}>{tr('common.cancel')}</Button>
      <Button variant="primary" {loading} onclick={submitForm}>
        {modalMode === 'create' ? tr('users.add') : tr('users.saveChanges')}
      </Button>
    </div>
  {/snippet}
</Dialog>
