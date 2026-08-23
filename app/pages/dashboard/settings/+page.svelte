<script lang="ts">
  import { Avatar, Button, Input } from '$lib/components/atoms/index.js';
  import { FormField, PasswordInput, Breadcrumb } from '$lib/components/molecules/index.js';
  import { api, ApiError } from '$lib/api/client';
  import { invalidateAll } from '$app/navigation';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    UserCircleIcon,
    LockPasswordIcon,
    Image01Icon,
    CheckmarkCircle02Icon,
    Alert02Icon
  } from '@hugeicons/core-free-icons';
  import type { LayoutData } from '../$types';

  let { data }: { data: LayoutData } = $props();

  let loadingProfile = $state(false);
  let name = $state('');
  let email = $derived(data.user?.email || '');

  let profileSuccess = $state<string | null>(null);
  let profileError = $state<string | null>(null);

  $effect(() => {
    if (data.user?.name) {
      name = data.user.name;
    }
  });

  let loadingPassword = $state(false);
  let currentPassword = $state('');
  let newPassword = $state('');
  let passwordSuccess = $state<string | null>(null);
  let passwordError = $state<string | null>(null);

  let fileInput: HTMLInputElement;
  let uploadingAvatar = $state(false);

  async function updateProfile() {
    if (!data.user) return;
    loadingProfile = true;
    profileSuccess = null;
    profileError = null;
    try {
      await api.updateUser(data.user.id, { name });
      await invalidateAll();
      profileSuccess = 'Profil berhasil diperbarui.';
    } catch (err) {
      profileError = err instanceof ApiError ? err.message : 'Gagal memperbarui profil.';
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
      passwordSuccess = 'Kata sandi berhasil diubah.';
      currentPassword = '';
      newPassword = '';
    } catch (err) {
      passwordError = err instanceof ApiError ? err.message : 'Gagal mengubah kata sandi.';
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
      profileSuccess = 'Foto profil berhasil diperbarui.';
    } catch (err) {
      profileError = err instanceof ApiError ? err.message : 'Gagal mengunggah foto profil.';
    } finally {
      uploadingAvatar = false;
    }
  }
</script>

<svelte:head>
  <title>Pengaturan Akun — Flowboard</title>
</svelte:head>

<div class="space-y-8">
  <header class="space-y-3">
    <Breadcrumb
      items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Pengaturan Akun' }
      ]}
      showHomeIcon
    />
    <div class="pt-1">
      <h1 class="ds-page-title text-ink">Pengaturan Akun</h1>
      <p class="ds-caption mt-1 text-mute">Kelola data profil pengguna dan keamanan kata sandi.</p>
    </div>
  </header>

  <div class="grid gap-6 lg:grid-cols-2">
    <!-- Profile Info Card -->
    <section class="rounded-2xl border border-hairline bg-card p-6 shadow-card space-y-6">
      <div class="flex items-center gap-2">
        <HugeiconsIcon icon={UserCircleIcon} size={20} strokeWidth={1.8} class="text-primary" />
        <h2 class="ds-section-title text-ink">Informasi Profil</h2>
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
            <span>{uploadingAvatar ? 'Mengunggah…' : 'Ganti Foto'}</span>
          </Button>
          <p class="ds-caption mt-1.5 text-mute">Format JPG, PNG atau GIF (Maks. 1MB)</p>
        </div>
      </div>

      <form
        onsubmit={(e) => {
          e.preventDefault();
          updateProfile();
        }}
        class="space-y-4"
      >
        <FormField label="Nama Lengkap" required>
          {#snippet control(args)}
            <Input {...args} bind:value={name} placeholder="Nama lengkap Anda" />
          {/snippet}
        </FormField>

        <FormField label="Alamat Email" helper="Email terdaftar tidak dapat diubah.">
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
          <Button variant="primary" type="submit" loading={loadingProfile}>Simpan Perubahan</Button>
        </div>
      </form>
    </section>

    <!-- Password Card -->
    <section class="rounded-2xl border border-hairline bg-card p-6 shadow-card space-y-6">
      <div class="flex items-center gap-2">
        <HugeiconsIcon icon={LockPasswordIcon} size={20} strokeWidth={1.8} class="text-primary" />
        <h2 class="ds-section-title text-ink">Keamanan & Kata Sandi</h2>
      </div>

      <form
        onsubmit={(e) => {
          e.preventDefault();
          updatePassword();
        }}
        class="space-y-4"
      >
        <FormField label="Kata Sandi Saat Ini" required>
          {#snippet control(args)}
            <PasswordInput {...args} bind:value={currentPassword} placeholder="••••••••" />
          {/snippet}
        </FormField>

        <FormField label="Kata Sandi Baru" required>
          {#snippet control(args)}
            <PasswordInput {...args} bind:value={newPassword} strength placeholder="••••••••" />
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
          <Button variant="primary" type="submit" loading={loadingPassword}>Perbarui Kata Sandi</Button>
        </div>
      </form>
    </section>
  </div>
</div>
