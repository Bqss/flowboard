<script lang="ts">
  import {
    api,
    ApiError,
    type ApiWorkspaceMember
  } from '$lib/api/client';
  import { Avatar, Badge, Button, Input, Skeleton } from '$lib/components/atoms/index.js';
  import {
    FormField,
    SearchInput,
    StatCard,
    EmptyStateBlock,
    Breadcrumb,
    Tabs
  } from '$lib/components/molecules/index.js';
  import { Dialog, ConfirmDialog } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    UserGroupIcon,
    UserAdd01Icon,
    UserCheck01Icon,
    MailSend01Icon,
    Copy01Icon,
    Delete02Icon,
    CheckmarkCircle02Icon,
    Alert02Icon
  } from '@hugeicons/core-free-icons';
  import type { LayoutData } from '../$types';

  type InviteItem = {
    id: string;
    email: string;
    role: string;
    token?: string;
    expiresAt: string;
    createdAt: string;
  };

  let { data }: { data: LayoutData } = $props();

  let loadingData = $state(true);
  let members = $state<ApiWorkspaceMember[]>([]);
  let invites = $state<InviteItem[]>([]);

  let searchQuery = $state('');
  let roleFilter = $state<'all' | 'owner' | 'member'>('all');

  let inviteDialogOpen = $state(false);
  let email = $state('');
  let error = $state<string | null>(null);
  let success = $state<string | null>(null);
  let inviting = $state(false);
  let lastInviteLink = $state<string | null>(null);

  let removeDialogOpen = $state(false);
  let memberToRemove = $state<ApiWorkspaceMember | null>(null);
  let removing = $state(false);

  let copiedKey = $state<string | null>(null);

  const isOwner = $derived(data.workspace?.role === 'owner');
  const currentUserId = $derived(data.user?.id);

  const ownersCount = $derived(members.filter((m) => m.role === 'owner').length);
  const staffCount = $derived(members.filter((m) => m.role === 'member').length);

  const filteredMembers = $derived(
    members.filter((member) => {
      const matchRole =
        roleFilter === 'all' ||
        (roleFilter === 'owner' && member.role === 'owner') ||
        (roleFilter === 'member' && member.role === 'member');
      if (!matchRole) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return member.name.toLowerCase().includes(q) || member.email.toLowerCase().includes(q);
    })
  );

  async function loadMembersData() {
    if (!data.workspace?.id) return;
    loadingData = true;
    try {
      const [membersRes, invitesRes] = await Promise.all([
        api.listWorkspaceMembers(data.workspace.id),
        data.workspace.role === 'owner'
          ? api.listWorkspaceInvites(data.workspace.id).catch(() => ({ invites: [] }))
          : Promise.resolve({ invites: [] })
      ]);
      members = membersRes.members ?? [];
      invites = (invitesRes.invites as InviteItem[]) ?? [];
    } catch (err) {
      console.error('Failed to load members data:', err);
    } finally {
      loadingData = false;
    }
  }

  $effect(() => {
    if (data.workspace?.id) {
      loadMembersData();
    }
  });

  async function invite() {
    if (!isOwner || !email.trim() || !data.workspace) return;
    inviting = true;
    error = null;
    success = null;
    lastInviteLink = null;

    try {
      const { invite: newInvite } = await api.createWorkspaceInvite(data.workspace.id, {
        email: email.trim()
      });
      const link = `${window.location.origin}/invite/${newInvite.token}`;
      lastInviteLink = link;
      success = `Undangan berhasil dikirim ke ${newInvite.email}`;
      email = '';
      await loadMembersData();
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Gagal mengirim undangan';
    } finally {
      inviting = false;
    }
  }

  function triggerRemove(member: ApiWorkspaceMember) {
    memberToRemove = member;
    removeDialogOpen = true;
  }

  async function confirmRemove() {
    if (!data.workspace || !memberToRemove) return;
    removing = true;
    try {
      await api.removeWorkspaceMember(data.workspace.id, memberToRemove.id);
      removeDialogOpen = false;
      memberToRemove = null;
      await loadMembersData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal menghapus anggota');
    } finally {
      removing = false;
    }
  }

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      copiedKey = key;
      setTimeout(() => {
        if (copiedKey === key) copiedKey = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }
</script>

<svelte:head>
  <title>Tim & Anggota — Flowboard</title>
</svelte:head>

{#snippet totalMembersIcon()}
  <HugeiconsIcon icon={UserGroupIcon} size={18} strokeWidth={1.8} />
{/snippet}

{#snippet ownersIcon()}
  <HugeiconsIcon icon={UserCheck01Icon} size={18} strokeWidth={1.8} />
{/snippet}

{#snippet pendingInvitesIcon()}
  <HugeiconsIcon icon={MailSend01Icon} size={18} strokeWidth={1.8} />
{/snippet}

<div class="space-y-6">
  <!-- Navigation & Header -->
  <header class="space-y-3">
    <Breadcrumb
      items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Anggota Tim' }
      ]}
      showHomeIcon
    />
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
      <div>
        <h1 class="ds-page-title text-ink">Anggota Tim</h1>
        <p class="ds-caption mt-1 text-mute">
          Kelola penanggung jawab (PIC) alur kerja dan akses workspace {data.workspace?.name ?? ''}.
        </p>
      </div>

      {#if isOwner}
        <Button
          variant="primary"
          onclick={() => {
            inviteDialogOpen = true;
            error = null;
            success = null;
          }}
        >
          <HugeiconsIcon icon={UserAdd01Icon} size={16} strokeWidth={1.8} />
          <span>Undang Anggota</span>
        </Button>
      {/if}
    </div>
  </header>

  <!-- Metric Overview Cards -->
  <section>
    {#if loadingData}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each [1, 2, 3] as _i}
          <div class="rounded-2xl border border-hairline bg-card p-5 space-y-3 shadow-card">
            <Skeleton shape="circle" class="size-9 rounded-lg" />
            <Skeleton shape="rect" class="h-4 w-24 rounded-md" />
            <Skeleton shape="rect" class="h-7 w-16 rounded-md" />
          </div>
        {/each}
      </div>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Anggota"
          value={String(members.length)}
          icon={totalMembersIcon}
          class="p-5 rounded-2xl"
        />
        <StatCard
          label="Pemilik Workspace"
          value={String(ownersCount)}
          icon={ownersIcon}
          class="p-5 rounded-2xl"
        />
        <StatCard
          label="Undangan Tertunda"
          value={String(invites.length)}
          icon={pendingInvitesIcon}
          class="p-5 rounded-2xl"
        />
      </div>
    {/if}
  </section>

  <!-- Members Section -->
  <section class="overflow-hidden rounded-2xl border border-hairline bg-card shadow-card">
    <!-- Section Toolbar -->
    <div class="flex flex-col gap-3 border-b border-hairline p-4 sm:flex-row sm:items-center sm:justify-between">
      <Tabs
        variant="pills"
        size="sm"
        bind:value={roleFilter}
        items={[
          { label: 'Semua', value: 'all', badge: members.length },
          { label: 'Owner', value: 'owner', badge: ownersCount },
          { label: 'Member', value: 'member', badge: staffCount }
        ]}
      />

      <div class="w-full sm:w-64">
        <SearchInput
          bind:value={searchQuery}
          placeholder="Cari nama atau email…"
          size="sm"
          submit={false}
          clearable
        />
      </div>
    </div>

    <!-- Members Table / List -->
    {#if loadingData}
      <div class="divide-y divide-hairline">
        {#each [1, 2, 3] as _i}
          <div class="flex items-center justify-between gap-3 px-6 py-4">
            <div class="flex items-center gap-3 min-w-0">
              <Skeleton shape="circle" class="size-10 rounded-full" />
              <div class="space-y-1.5 min-w-0">
                <Skeleton shape="rect" class="h-4 w-32 rounded-md" />
                <Skeleton shape="rect" class="h-3 w-44 rounded-md" />
              </div>
            </div>
            <Skeleton shape="rect" class="h-6 w-20 rounded-full" />
          </div>
        {/each}
      </div>
    {:else if filteredMembers.length === 0}
      <EmptyStateBlock
        title="Tidak ada anggota ditemukan"
        description={searchQuery ? `Tidak ada hasil pencarian untuk "${searchQuery}".` : 'Belum ada anggota yang cocok dengan filter.'}
      />
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-hairline bg-canvas-sunken text-xs font-semibold text-mute">
            <tr>
              <th scope="col" class="px-6 py-3.5">Nama & Profil</th>
              <th scope="col" class="px-6 py-3.5">Email</th>
              <th scope="col" class="px-6 py-3.5">Peran</th>
              <th scope="col" class="px-6 py-3.5">Bergabung</th>
              <th scope="col" class="px-6 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-hairline">
            {#each filteredMembers as member (member.id)}
              {@const isMe = member.id === currentUserId}
              {@const isMemberOwner = member.role === 'owner'}
              <tr class="hover:bg-lane/40 transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <Avatar
                      name={member.name}
                      src={member.avatarUrl ?? undefined}
                      size={36}
                      online
                    />
                    <div class="min-w-0">
                      <p class="font-bold text-ink truncate flex items-center gap-2">
                        {member.name}
                        {#if isMe}
                          <Badge tone="queued" variant="soft">Anda</Badge>
                        {/if}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 text-mute">
                  <div class="flex items-center gap-1.5">
                    <span>{member.email}</span>
                    <button
                      type="button"
                      onclick={() => copyToClipboard(member.email, `copy-${member.id}`)}
                      class="text-faint hover:text-ink transition-colors p-0.5"
                      title="Salin email"
                      aria-label="Salin email"
                    >
                      <HugeiconsIcon
                        icon={copiedKey === `copy-${member.id}` ? CheckmarkCircle02Icon : Copy01Icon}
                        size={13}
                        strokeWidth={1.8}
                        class={copiedKey === `copy-${member.id}` ? 'text-status-done' : ''}
                      />
                    </button>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <Badge tone={isMemberOwner ? 'done' : 'idle'} variant="soft">
                    {isMemberOwner ? 'Owner' : 'Member'}
                  </Badge>
                </td>
                <td class="px-6 py-4 ds-caption text-mute">
                  {formatDate(member.joinedAt)}
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    {#if isOwner && !isMemberOwner && !isMe}
                      <Button
                        variant="ghost"
                        size="sm"
                        class="text-status-urgent-ink hover:bg-status-urgent-soft hover:text-status-urgent-strong h-8 px-2.5"
                        onclick={() => triggerRemove(member)}
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.8} />
                        <span>Hapus</span>
                      </Button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <!-- Pending Invites Table -->
  {#if isOwner && invites.length > 0}
    <section class="overflow-hidden rounded-2xl border border-hairline bg-card shadow-card">
      <div class="border-b border-hairline px-6 py-4">
        <h2 class="ds-section-title text-ink">Undangan Tertunda ({invites.length})</h2>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-hairline bg-canvas-sunken text-xs font-semibold text-mute">
            <tr>
              <th scope="col" class="px-6 py-3.5">Email</th>
              <th scope="col" class="px-6 py-3.5">Status</th>
              <th scope="col" class="px-6 py-3.5">Kedaluwarsa</th>
              <th scope="col" class="px-6 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-hairline">
            {#each invites as invite (invite.id)}
              <tr class="hover:bg-lane/40 transition-colors">
                <td class="px-6 py-4 font-semibold text-ink">
                  {invite.email}
                </td>
                <td class="px-6 py-4">
                  <Badge tone="queued" variant="soft">Menunggu Konfirmasi</Badge>
                </td>
                <td class="px-6 py-4 ds-caption text-mute">
                  {formatDate(invite.expiresAt)}
                </td>
                <td class="px-6 py-4 text-right">
                  {#if invite.token}
                    <Button
                      variant="secondary"
                      size="sm"
                      onclick={() => copyToClipboard(`${window.location.origin}/invite/${invite.token}`, `inv-${invite.id}`)}
                    >
                      <HugeiconsIcon
                        icon={copiedKey === `inv-${invite.id}` ? CheckmarkCircle02Icon : Copy01Icon}
                        size={14}
                        strokeWidth={1.8}
                        class={copiedKey === `inv-${invite.id}` ? 'text-status-done' : ''}
                      />
                      <span>{copiedKey === `inv-${invite.id}` ? 'Disalin' : 'Salin Tautan'}</span>
                    </Button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}
</div>

<!-- Modal Dialog: Undang Anggota Baru -->
<Dialog
  bind:open={inviteDialogOpen}
  title="Undang Anggota Tim"
  description="Kirim undangan pendaftaran melalui email untuk menambahkan anggota ke workspace."
>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      invite();
    }}
    class="space-y-4"
  >
    <FormField label="Alamat Email" required>
      {#snippet control(args)}
        <Input
          {...args}
          type="email"
          bind:value={email}
          placeholder="nama@perusahaan.com"
          required
        />
      {/snippet}
    </FormField>

    {#if error}
      <div class="flex items-center gap-2 text-sm text-status-urgent-ink">
        <HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={1.8} />
        <span>{error}</span>
      </div>
    {/if}

    {#if success}
      <div class="flex items-center gap-2 text-sm text-status-done-ink">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={1.8} />
        <span>{success}</span>
      </div>
    {/if}

    {#if lastInviteLink}
      <div class="rounded-xl border border-hairline bg-lane p-4 text-sm space-y-2">
        <p class="ds-caption text-mute">Tautan pendaftaran langsung:</p>
        <code class="block break-all rounded bg-card p-2 text-xs font-mono text-ink-soft border border-hairline">
          {lastInviteLink}
        </code>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onclick={() => copyToClipboard(lastInviteLink!, 'modal-link')}
        >
          <HugeiconsIcon icon={copiedKey === 'modal-link' ? CheckmarkCircle02Icon : Copy01Icon} size={14} strokeWidth={1.8} />
          <span>{copiedKey === 'modal-link' ? 'Disalin' : 'Salin Tautan'}</span>
        </Button>
      </div>
    {/if}

    <div class="mt-6 flex justify-end gap-2 border-t border-hairline pt-4">
      <Button variant="secondary" type="button" onclick={() => (inviteDialogOpen = false)}>
        Tutup
      </Button>
      <Button
        type="submit"
        variant="primary"
        loading={inviting}
        disabled={inviting || !email.trim()}
      >
        <HugeiconsIcon icon={MailSend01Icon} size={16} strokeWidth={1.8} />
        <span>{inviting ? 'Mengirim…' : 'Kirim Undangan'}</span>
      </Button>
    </div>
  </form>
</Dialog>

<!-- Confirm Dialog: Hapus Anggota -->
<ConfirmDialog
  bind:open={removeDialogOpen}
  title="Hapus Anggota"
  description={memberToRemove ? `Apakah Anda yakin ingin menghapus ${memberToRemove.name} dari workspace?` : 'Hapus anggota?'}
  confirmLabel="Hapus"
  cancelLabel="Batal"
  destructive
  loading={removing}
  onconfirm={confirmRemove}
  oncancel={() => {
    removeDialogOpen = false;
    memberToRemove = null;
  }}
/>
