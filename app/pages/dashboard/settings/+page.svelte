<script lang="ts">
  import { Avatar, Button, Checkbox, Input, Skeleton } from '$lib/components/atoms/index.js';
  import { FormField, PasswordInput, Breadcrumb } from '$lib/components/molecules/index.js';
  import { api, ApiError, type ApiNotificationSettings } from '$lib/api/client';
  import { invalidateAll } from '$app/navigation';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    UserCircleIcon,
    LockPasswordIcon,
    Image01Icon,
    CheckmarkCircle02Icon,
    Alert02Icon,
    BellRingIcon
  } from '@hugeicons/core-free-icons';
  import type { LayoutData } from '../$types';

  let { data }: { data: LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  let loadingProfile = $state(false);
  let name = $state('');
  let phone = $state('');
  let email = $derived(data.user?.email || '');

  let profileSuccess = $state<string | null>(null);
  let profileError = $state<string | null>(null);

  $effect(() => {
    if (data.user?.name) {
      name = data.user.name;
    }
    if (data.user?.phone !== undefined) {
      phone = data.user.phone ?? '';
    }
  });

  let loadingPassword = $state(false);
  let currentPassword = $state('');
  let newPassword = $state('');
  let passwordSuccess = $state<string | null>(null);
  let passwordError = $state<string | null>(null);

  let fileInput: HTMLInputElement;
  let uploadingAvatar = $state(false);

  // Notification preferences
  type EventKey = 'waFailed' | 'customerReplied' | 'cardOverdue' | 'handover';
  const eventKeys: EventKey[] = ['waFailed', 'customerReplied', 'cardOverdue', 'handover'];
  const eventLabel = (key: EventKey) => {
    switch (key) {
      case 'waFailed':
        return tr('settings.eventWaFailed');
      case 'customerReplied':
        return tr('settings.eventCustomerReplied');
      case 'cardOverdue':
        return tr('settings.eventCardOverdue');
      case 'handover':
        return tr('settings.eventHandover');
    }
  };

  let notifSettings = $state<ApiNotificationSettings | null>(null);
  let notifLoading = $state(true);
  let notifSaving = $state(false);
  let notifSuccess = $state<string | null>(null);
  let notifError = $state<string | null>(null);

  async function loadNotifSettings() {
    const workspaceId = data.workspace?.id;
    if (!workspaceId) {
      notifLoading = false;
      return;
    }
    notifLoading = true;
    notifError = null;
    try {
      const response = await api.getNotificationSettings(workspaceId);
      notifSettings = response.settings;
    } catch (err) {
      notifError = err instanceof ApiError ? err.message : tr('settings.notificationsLoadError');
    } finally {
      notifLoading = false;
    }
  }

  async function saveNotifSettings() {
    const workspaceId = data.workspace?.id;
    if (!workspaceId || !notifSettings) return;
    notifSaving = true;
    notifSuccess = null;
    notifError = null;
    try {
      const response = await api.updateNotificationSettings(workspaceId, notifSettings);
      notifSettings = response.settings;
      notifSuccess = tr('settings.notificationsSaved');
    } catch (err) {
      notifError = err instanceof ApiError ? err.message : tr('settings.notificationsError');
    } finally {
      notifSaving = false;
    }
  }

  $effect(() => {
    if (data.workspace?.id) loadNotifSettings();
  });

  async function updateProfile() {
    if (!data.user) return;
    loadingProfile = true;
    profileSuccess = null;
    profileError = null;
    try {
      await api.updateUser(data.user.id, { name, phone: phone || undefined });
      await invalidateAll();
      profileSuccess = tr('settings.profileSaved');
    } catch (err) {
      profileError = err instanceof ApiError ? err.message : tr('settings.profileError');
    } finally {
      loadingProfile = false;
    }
  }

  async function updatePassword() {
    if (!currentPassword || !newPassword) return;
    loadingPassword = true;
    passwordSuccess = null;
    passwordError = null;
    try {
      await api.changePassword({ currentPassword, newPassword });
      passwordSuccess = tr('settings.passwordSaved');
      currentPassword = '';
      newPassword = '';
    } catch (err) {
      passwordError = err instanceof ApiError ? err.message : tr('settings.passwordError');
    } finally {
      loadingPassword = false;
    }
  }

  async function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    uploadingAvatar = true;
    profileSuccess = null;
    profileError = null;
    try {
      await api.uploadAvatar(file);
      await invalidateAll();
      profileSuccess = tr('settings.photoSaved');
    } catch (err) {
      profileError = err instanceof ApiError ? err.message : tr('settings.photoError');
    } finally {
      uploadingAvatar = false;
    }
  }
</script>

<svelte:head>
  <title>{tr('settings.title')} — Flowboard</title>
</svelte:head>

<div class="space-y-8">
  <header class="space-y-3">
    <Breadcrumb
      items={[
        { label: tr('common.dashboard'), href: '/dashboard' },
        { label: tr('settings.title') }
      ]}
      showHomeIcon
    />
    <div class="pt-1">
      <h1 class="ds-page-title text-ink">{tr('settings.title')}</h1>
      <p class="text-sm font-normal leading-relaxed text-mute mt-1">{tr('settings.description')}</p>
    </div>
  </header>

  <div class="grid gap-6 lg:grid-cols-2">
    <section class="rounded-2xl border border-hairline bg-card p-6 shadow-card space-y-6">
      <div class="flex items-center gap-2">
        <HugeiconsIcon icon={UserCircleIcon} size={20} strokeWidth={1.8} class="text-primary" />
        <h2 class="ds-section-title text-ink">{tr('settings.profile')}</h2>
      </div>

      <div class="flex items-center gap-5">
        <Avatar name={data.user?.name} src={data.user?.avatarUrl ?? undefined} size={72} />
        <div>
          <input
            type="file"
            accept="image/png, image/jpeg, image/gif"
            class="hidden"
            bind:this={fileInput}
            onchange={handleFileChange}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={uploadingAvatar}
            onclick={() => fileInput.click()}
          >
            <HugeiconsIcon icon={Image01Icon} size={15} strokeWidth={1.8} />
            <span>{uploadingAvatar ? tr('settings.uploading') : tr('settings.changePhoto')}</span>
          </Button>
          <p class="text-sm font-normal leading-relaxed text-mute mt-1.5">{tr('settings.photoHint')}</p>
        </div>
      </div>

      <form
        onsubmit={(e) => {
          e.preventDefault();
          updateProfile();
        }}
        class="space-y-4"
      >
        <FormField label={tr('settings.fullName')} required>
          {#snippet control(args)}
            <Input {...args} bind:value={name} placeholder={tr('settings.fullNamePlaceholder')} />
          {/snippet}
        </FormField>

        <FormField label={tr('settings.phone')} helper={tr('settings.phoneHint')}>
          {#snippet control(args)}
            <Input {...args} bind:value={phone} placeholder={tr('settings.phonePlaceholder')} />
          {/snippet}
        </FormField>

        <FormField label={tr('settings.emailAddress')} helper={tr('settings.emailLocked')}>
          {#snippet control(args)}
            <Input {...args} value={email} disabled />
          {/snippet}
        </FormField>

        {#if profileError}
          <div class="flex items-center gap-2 text-sm text-status-urgent-ink">
            <HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={1.8} />
            <span>{profileError}</span>
          </div>
        {/if}

        {#if profileSuccess}
          <div class="flex items-center gap-2 text-sm text-status-done-ink">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={1.8} />
            <span>{profileSuccess}</span>
          </div>
        {/if}

        <div class="pt-2">
          <Button variant="primary" type="submit" loading={loadingProfile}>{tr('settings.saveChanges')}</Button>
        </div>
      </form>
    </section>

    <section class="rounded-2xl border border-hairline bg-card p-6 shadow-card space-y-6">
      <div class="flex items-center gap-2">
        <HugeiconsIcon icon={LockPasswordIcon} size={20} strokeWidth={1.8} class="text-primary" />
        <h2 class="ds-section-title text-ink">{tr('settings.security')}</h2>
      </div>

      <form
        onsubmit={(e) => {
          e.preventDefault();
          updatePassword();
        }}
        class="space-y-4"
      >
        <FormField label={tr('settings.currentPassword')} required>
          {#snippet control(args)}
            <PasswordInput
              {...args}
              bind:value={currentPassword}
              placeholder="••••••••"
              showPasswordLabel={tr('settings.showPassword')}
              hidePasswordLabel={tr('settings.hidePassword')}
            />
          {/snippet}
        </FormField>

        <FormField label={tr('settings.newPassword')} required>
          {#snippet control(args)}
            <PasswordInput
              {...args}
              bind:value={newPassword}
              strength
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
            />
          {/snippet}
        </FormField>

        {#if passwordError}
          <div class="flex items-center gap-2 text-sm text-status-urgent-ink">
            <HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={1.8} />
            <span>{passwordError}</span>
          </div>
        {/if}

        {#if passwordSuccess}
          <div class="flex items-center gap-2 text-sm text-status-done-ink">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={1.8} />
            <span>{passwordSuccess}</span>
          </div>
        {/if}

        <div class="pt-2">
          <Button variant="primary" type="submit" loading={loadingPassword}>{tr('settings.updatePassword')}</Button>
        </div>
      </form>
    </section>
  </div>

  <section class="rounded-2xl border border-hairline bg-card p-6 shadow-card space-y-6">
    <div class="flex items-center gap-2">
      <HugeiconsIcon icon={BellRingIcon} size={20} strokeWidth={1.8} class="text-primary" />
      <div>
        <h2 class="ds-section-title text-ink">{tr('settings.notifications')}</h2>
        <p class="text-sm font-normal leading-relaxed text-mute mt-1">{tr('settings.notificationsDescription')}</p>
      </div>
    </div>

    {#if notifLoading}
      <div class="space-y-3">
        {#each Array(4) as _}
          <Skeleton class="h-12 w-full" />
        {/each}
      </div>
    {:else if notifSettings}
      <form
        onsubmit={(e) => {
          e.preventDefault();
          saveNotifSettings();
        }}
        class="space-y-5"
      >
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-hairline text-left">
                <th class="pb-3 pr-4 font-medium text-ink">{tr('settings.notifications')}</th>
                <th class="pb-3 px-4 text-center font-medium text-mute">{tr('settings.inAppColumn')}</th>
                <th class="pb-3 pl-4 text-center font-medium text-mute">{tr('settings.emailColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {#each eventKeys as key (key)}
                <tr class="border-b border-hairline/60">
                  <td class="py-3 pr-4 text-ink">{eventLabel(key)}</td>
                  <td class="py-3 px-4 text-center">
                    <Checkbox
                      checked={notifSettings[key]}
                      onchange={() => {
                        notifSettings = { ...notifSettings!, [key]: !notifSettings![key] };
                      }}
                    />
                  </td>
                  <td class="py-3 pl-4 text-center">
                    <Checkbox
                      checked={notifSettings[`email${key.charAt(0).toUpperCase()}${key.slice(1)}` as keyof ApiNotificationSettings] as boolean}
                      onchange={() => {
                        const emailKey = `email${key.charAt(0).toUpperCase()}${key.slice(1)}` as keyof ApiNotificationSettings;
                        notifSettings = { ...notifSettings!, [emailKey]: !(notifSettings![emailKey] as boolean) };
                      }}
                    />
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <label class="flex items-start gap-3 rounded-xl border border-hairline bg-lane/45 p-4">
          <Checkbox
            checked={notifSettings.emailDigest}
            onchange={() => {
              notifSettings = { ...notifSettings!, emailDigest: !notifSettings!.emailDigest };
            }}
          />
          <span class="min-w-0">
            <span class="block text-sm font-medium text-ink">{tr('settings.emailDigest')}</span>
            <span class="text-sm font-normal leading-relaxed text-mute block">{tr('settings.emailDigestHelper')}</span>
          </span>
        </label>

        {#if notifError}
          <div class="flex items-center gap-2 text-sm text-status-urgent-ink">
            <HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={1.8} />
            <span>{notifError}</span>
          </div>
        {/if}

        {#if notifSuccess}
          <div class="flex items-center gap-2 text-sm text-status-done-ink">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={1.8} />
            <span>{notifSuccess}</span>
          </div>
        {/if}

        <div class="pt-2">
          <Button variant="primary" type="submit" loading={notifSaving}>{tr('settings.saveChanges')}</Button>
        </div>
      </form>
    {:else}
      <p class="text-sm text-mute">{tr('settings.notificationsLoadError')}</p>
    {/if}
  </section>
</div>
