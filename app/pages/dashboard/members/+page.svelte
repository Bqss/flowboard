<script lang="ts">
  import {
    api,
    ApiError,
    type ApiWorkspaceMember,
    type ApiWorkspaceMemberGroup
  } from '$lib/api/client';
  import { dashboardIntlLocale, dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Avatar, Badge, Button, IconButton, Input, Skeleton, Tooltip } from '$lib/components/atoms/index.js';
  import {
    FormField,
    SearchInput,
    StatCard,
    EmptyStateBlock,
    Breadcrumb,
    Tabs,
    MultiSelectCombobox,
    type MultiSelectOption
  } from '$lib/components/molecules/index.js';
  import { ConfirmDialog, Dialog } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    UserGroupIcon,
    UserAdd01Icon,
    UserCheck01Icon,
    MailSend01Icon,
    Copy01Icon,
    Delete02Icon,
    Edit02Icon,
    SentIcon,
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

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  let loadingData = $state(true);
  let members = $state<ApiWorkspaceMember[]>([]);
  let groups = $state<ApiWorkspaceMemberGroup[]>([]);
  let groupDialogOpen = $state(false);
  let editingGroup = $state<ApiWorkspaceMemberGroup | null>(null);
  let groupName = $state('');
  let groupMemberIds = $state<string[]>([]);
  let groupSaving = $state(false);
  let groupError = $state<string | null>(null);
  let groupToDelete = $state<ApiWorkspaceMemberGroup | null>(null);
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
  let inviteActionId = $state<string | null>(null);
  let deleteInviteDialogOpen = $state(false);
  let inviteToDelete = $state<InviteItem | null>(null);

  const isOwner = $derived(data.workspace?.role === 'owner');
  const currentUserId = $derived(data.user?.id);
  const groupMemberOptions = $derived.by<MultiSelectOption[]>(() => {
    const options = members.map((member) => ({
      value: member.id,
      label: member.name,
      description: member.email,
      avatarUrl: member.avatarUrl ?? undefined
    }));

    if (data.user && !members.some((member) => member.id === data.user?.id)) {
      options.unshift({
        value: data.user.id,
        label: data.user.name,
        description: data.user.email,
        avatarUrl: data.user.avatarUrl ?? undefined
      });
    }

    return options;
  });

  function openGroupDialog(group?: ApiWorkspaceMemberGroup) {
    editingGroup = group ?? null;
    groupName = group?.name ?? '';
    groupMemberIds = group?.members.map((member) => member.id) ?? [];
    groupError = null;
    groupDialogOpen = true;
  }

  async function saveGroup() {
    if (!isOwner || !data.workspace?.id || !groupName.trim() || groupMemberIds.length === 0) return;
    groupSaving = true;
    groupError = null;
    try {
      if (editingGroup) {
        const response = await api.updateWorkspaceMemberGroup(data.workspace.id, editingGroup.id, {
          name: groupName.trim(),
          memberIds: groupMemberIds
        });
        groups = groups.map((group) => (group.id === editingGroup?.id ? response.group : group));
      } else {
        const response = await api.createWorkspaceMemberGroup(data.workspace.id, {
          name: groupName.trim(),
          memberIds: groupMemberIds
        });
        groups = [...groups, response.group];
      }
      groupDialogOpen = false;
    } catch (err) {
      groupError = err instanceof ApiError ? err.message : tr('members.groupSaveError');
    } finally {
      groupSaving = false;
    }
  }

  function triggerDeleteGroup(group: ApiWorkspaceMemberGroup) {
    groupToDelete = group;
  }

  async function confirmDeleteGroup() {
    if (!isOwner || !data.workspace?.id || !groupToDelete) return;
    groupSaving = true;
    try {
      await api.deleteWorkspaceMemberGroup(data.workspace.id, groupToDelete.id);
      groups = groups.filter((item) => item.id !== groupToDelete?.id);
      groupToDelete = null;
    } catch (err) {
      groupError = err instanceof ApiError ? err.message : tr('members.groupDeleteError');
    } finally {
      groupSaving = false;
    }
  }

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
      const [membersRes, invitesRes, groupsRes] = await Promise.all([
        api.listWorkspaceMembers(data.workspace.id),
        data.workspace.role === 'owner'
          ? api.listWorkspaceInvites(data.workspace.id).catch(() => ({ invites: [] }))
          : Promise.resolve({ invites: [] }),
        api.listWorkspaceMemberGroups(data.workspace.id).catch(() => ({ groups: [] }))
      ]);
      members = membersRes.members ?? [];
      invites = (invitesRes.invites as InviteItem[]) ?? [];
      groups = groupsRes.groups ?? [];
    } catch (err) {
      console.error('Failed to load members data:', err);
    } finally {
      loadingData = false;
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('onboarding-page-ready'));
      });
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
      window.dispatchEvent(new CustomEvent('onboarding-challenge', { detail: 'invite_member' }));
      const link = `${window.location.origin}/invite/${newInvite.token}`;
      lastInviteLink = link;
      success = tr('members.inviteSuccess', { email: newInvite.email });
      email = '';
      await loadMembersData();
    } catch (err) {
      error = err instanceof ApiError ? err.message : tr('members.inviteError');
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
      alert(err instanceof ApiError ? err.message : tr('members.removeError'));
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

  async function resendInvite(invite: InviteItem) {
    if (!data.workspace?.id || inviteActionId) return;
    inviteActionId = invite.id;
    try {
      await api.resendWorkspaceInvite(data.workspace.id, invite.id);
      success = tr('members.resendSuccess', { email: invite.email });
      await loadMembersData();
    } catch (err) {
      error = err instanceof ApiError ? err.message : tr('members.resendError');
    } finally {
      inviteActionId = null;
    }
  }

  function triggerDeleteInvite(invite: InviteItem) {
    inviteToDelete = invite;
    deleteInviteDialogOpen = true;
  }

  async function confirmDeleteInvite() {
    if (!data.workspace?.id || !inviteToDelete) return;
    inviteActionId = inviteToDelete.id;
    try {
      await api.deleteWorkspaceInvite(data.workspace.id, inviteToDelete.id);
      deleteInviteDialogOpen = false;
      inviteToDelete = null;
      await loadMembersData();
    } catch (err) {
      error = err instanceof ApiError ? err.message : tr('members.deleteInviteError');
    } finally {
      inviteActionId = null;
    }
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(dashboardIntlLocale($locale), {
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
  <title>{tr('members.title')} — actjom</title>
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

<div class="space-y-5 sm:space-y-6">
  <!-- Navigation & Header -->
  <header class="space-y-3">
    <Breadcrumb
      items={[
        { label: tr('common.dashboard'), href: '/dashboard' },
        { label: tr('members.title') }
      ]}
      showHomeIcon
    />
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
      <div>
        <h1 class="ds-page-title text-ink">{tr('members.title')}</h1>
        <p class="text-sm font-normal leading-relaxed text-mute mt-1">
          {tr('members.description', { workspace: data.workspace?.name ?? '' })}
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
          data-onboarding="invite-member"
        >
          <HugeiconsIcon icon={UserAdd01Icon} size={16} strokeWidth={1.8} />
          <span>{tr('members.invite')}</span>
        </Button>
      {/if}
    </div>
  </header>

  <!-- Metric Overview Cards -->
  <section data-onboarding="members-stats">
    {#if loadingData}
      <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {#each [1, 2, 3] as _i}
          <div class="rounded-2xl border border-hairline bg-card p-5 space-y-3 shadow-card">
            <Skeleton shape="circle" class="size-9 rounded-lg" />
            <Skeleton shape="rect" class="h-4 w-24 rounded-md" />
            <Skeleton shape="rect" class="h-7 w-16 rounded-md" />
          </div>
        {/each}
      </div>
    {:else}
      <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard
          label={tr('members.total')}
          value={String(members.length)}
          icon={totalMembersIcon}
          class="p-5 rounded-2xl"
        />
        <StatCard
          label={tr('members.owners')}
          value={String(ownersCount)}
          icon={ownersIcon}
          class="p-5 rounded-2xl"
        />
        <StatCard
          label={tr('members.pendingInvites')}
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
        data-onboarding="member-role-filter"
        items={[
          { label: tr('common.all'), value: 'all', badge: members.length },
          { label: tr('common.owner'), value: 'owner', badge: ownersCount },
          { label: tr('common.member'), value: 'member', badge: staffCount }
        ]}
      />

      <div class="w-full sm:w-64">
        <SearchInput
          bind:value={searchQuery}
          placeholder={tr('members.search')}
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
          <div class="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
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
        title={tr('members.empty')}
        description={searchQuery ? tr('members.emptySearch', { query: searchQuery }) : tr('members.emptyFilter')}
      />
    {:else}
      <div class="overflow-x-auto" data-onboarding="members-table">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-hairline bg-canvas-sunken text-xs font-semibold text-mute">
            <tr>
              <th scope="col" class="px-4 py-3 sm:px-6 sm:py-3.5">{tr('members.nameProfile')}</th>
              <th scope="col" class="px-4 py-3 sm:px-6 sm:py-3.5">{tr('members.email')}</th>
              <th scope="col" class="px-4 py-3 sm:px-6 sm:py-3.5">{tr('members.role')}</th>
              <th scope="col" class="px-4 py-3 sm:px-6 sm:py-3.5">{tr('members.joined')}</th>
              <th scope="col" class="px-4 py-3 sm:px-6 sm:py-3.5 text-right">{tr('common.actions')}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-hairline">
            {#each filteredMembers as member (member.id)}
              {@const isMe = member.id === currentUserId}
              {@const isMemberOwner = member.role === 'owner'}
              <tr class="hover:bg-lane/40 transition-colors">
                <td class="px-4 py-3 sm:px-6 sm:py-4">
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
                          <Badge tone="queued" variant="soft">{tr('members.you')}</Badge>
                        {/if}
                      </p>
                    </div>

                  </div>
                </td>
                <td class="px-4 py-3 sm:px-6 sm:py-4 text-mute">
                  <div class="flex items-center gap-1.5">
                    <span>{member.email}</span>
                    <button
                      type="button"
                      onclick={() => copyToClipboard(member.email, `copy-${member.id}`)}
                      class="text-faint hover:text-ink transition-colors p-0.5"
                      title={tr('members.copyEmail')}
                      aria-label={tr('members.copyEmail')}
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
                <td class="px-4 py-3 sm:px-6 sm:py-4">
                  <Badge tone={isMemberOwner ? 'done' : 'idle'} variant="soft">
                    {isMemberOwner ? tr('common.owner') : tr('common.member')}
                  </Badge>
                </td>
                <td class="px-4 py-3 sm:px-6 sm:py-4 ds-caption text-mute">
                  {formatDate(member.joinedAt)}
                </td>
                <td class="px-4 py-3 sm:px-6 sm:py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    {#if !isMe}
                      <Button
                        variant="secondary"
                        size="sm"
                        class="h-8 px-2.5"
                        onclick={() => window.dispatchEvent(new CustomEvent('chat-open-member', { detail: member.id }))}
                      >
                        <HugeiconsIcon icon={SentIcon} size={14} strokeWidth={1.8} />
                        <span>{tr('members.message')}</span>
                      </Button>
                    {/if}
                    {#if isOwner && !isMemberOwner && !isMe}
                      <Button
                        variant="ghost"
                        size="sm"
                        class="text-status-urgent-ink hover:bg-status-urgent-soft hover:text-status-urgent-strong h-8 px-2.5"
                        onclick={() => triggerRemove(member)}
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.8} />
                        <span>{tr('common.delete')}</span>
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
  <section class="rounded-2xl border border-hairline bg-card p-5 shadow-card space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="ds-section-title text-ink">{tr('members.groupsTitle')}</h2>
        <p class="ds-caption text-mute">{tr('members.groupsDescription')}</p>
      </div>
      {#if isOwner}
        <Button variant="secondary" size="sm" onclick={() => openGroupDialog()}>
          <HugeiconsIcon icon={UserGroupIcon} size={15} strokeWidth={1.8} />
          <span>{tr('members.createGroup')}</span>
        </Button>
      {/if}
    </div>
    {#if groups.length === 0}
      <p class="text-sm text-mute">{tr('members.noGroups')}</p>
    {:else}
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {#each groups as group (group.id)}
          <article class="group rounded-2xl border border-hairline bg-card p-4 shadow-card transition-shadow hover:shadow-raised">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="grid size-8 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <HugeiconsIcon icon={UserGroupIcon} size={16} strokeWidth={1.8} />
                  </span>
                  <div class="min-w-0">
                    <h3 class="truncate text-sm font-bold text-ink">{group.name}</h3>
                    <p class="mt-0.5 text-xs text-mute">{tr('members.groupMembers', { count: group.members.length })}</p>
                  </div>
                </div>
              </div>
              {#if isOwner}
                <div class="flex shrink-0 items-center gap-0.5">
                  <Tooltip text={tr('common.edit')} side="top">
                    <IconButton
                      variant="ghost"
                      size="sm"
                      label={tr('common.edit')}
                      onclick={() => openGroupDialog(group)}
                    >
                      <HugeiconsIcon icon={Edit02Icon} size={15} strokeWidth={1.8} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip text={tr('common.delete')} side="top">
                    <IconButton
                      variant="ghost"
                      size="sm"
                      label={tr('common.delete')}
                      class="text-status-urgent-ink hover:bg-status-urgent-soft hover:text-status-urgent-strong"
                      onclick={() => triggerDeleteGroup(group)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.8} />
                    </IconButton>
                  </Tooltip>
                </div>
              {/if}
            </div>
            <div class="mt-4 space-y-2 border-t border-hairline pt-3">
              {#each group.members as member (member.id)}
                <div class="flex min-w-0 items-center gap-2.5 rounded-xl bg-canvas-sunken/55 px-2.5 py-2">
                  <Avatar name={member.name} src={member.avatarUrl ?? undefined} size={28} />
                  <div class="min-w-0">
                    <p class="truncate text-xs font-semibold text-ink">{member.name}</p>
                    <p class="truncate text-[11px] text-mute">{member.email}</p>
                  </div>
                </div>
              {/each}
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Pending Invites Table -->
  {#if isOwner && invites.length > 0}
    <section class="overflow-hidden rounded-2xl border border-hairline bg-card shadow-card">
      <div class="border-b border-hairline px-4 py-3 sm:px-6 sm:py-4">
        <h2 class="ds-section-title text-ink">{tr('members.invitesTitle', { count: invites.length })}</h2>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-hairline bg-canvas-sunken text-xs font-semibold text-mute">
            <tr>
              <th class="px-4 py-3 sm:px-6 sm:py-3.5">{tr('members.email')}</th>
              <th class="px-4 py-3 sm:px-6 sm:py-3.5">{tr('members.inviteStatus')}</th>
              <th class="px-4 py-3 sm:px-6 sm:py-3.5">{tr('members.expires')}</th>
              <th class="px-4 py-3 sm:px-6 sm:py-3.5 text-right">{tr('common.actions')}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-hairline">
            {#each invites as invite (invite.id)}
              <tr class="hover:bg-lane/40 transition-colors">
                <td class="px-4 py-3 sm:px-6 sm:py-4 font-semibold text-ink">
                  {invite.email}
                </td>
                <td class="px-4 py-3 sm:px-6 sm:py-4">
                  <Badge tone="queued" variant="soft">{tr('members.inviteStatus')}</Badge>
                </td>
                <td class="px-4 py-3 sm:px-6 sm:py-4 ds-caption text-mute">
                  {formatDate(invite.expiresAt)}
                </td>
                <td class="px-4 py-3 sm:px-6 sm:py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
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
                        <span>{copiedKey === `inv-${invite.id}` ? tr('common.copied') : tr('members.copyLink')}</span>
                      </Button>
                    {/if}
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={inviteActionId === invite.id}
                      disabled={inviteActionId !== null && inviteActionId !== invite.id}
                      onclick={() => resendInvite(invite)}
                    >
                      <HugeiconsIcon icon={SentIcon} size={14} strokeWidth={1.8} />
                      <span>{tr('members.resend')}</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={inviteActionId !== null && inviteActionId !== invite.id}
                      onclick={() => triggerDeleteInvite(invite)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.8} />
                      <span>{tr('members.deleteInvite')}</span>
                    </Button>
                  </div>
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
  title={tr('members.inviteTitle')}
  description={tr('members.inviteDescription')}
>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      invite();
    }}
    class="space-y-4"
  >
    <FormField label={tr('members.emailAddress')} required>
      {#snippet control(args)}
        <Input
          {...args}
          type="email"
          bind:value={email}
          placeholder={tr('members.emailPlaceholder')}
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
        <p class="ds-caption text-mute">{tr('members.directLink')}</p>
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
          <span>{copiedKey === 'modal-link' ? tr('common.copied') : tr('members.copyLink')}</span>
        </Button>
      </div>
    {/if}

    <div class="mt-6 flex justify-end gap-2 border-t border-hairline pt-4">
      <Button variant="secondary" type="button" onclick={() => (inviteDialogOpen = false)}>
        {tr('members.close')}
      </Button>
      <Button
        type="submit"
        variant="primary"
        loading={inviting}
        disabled={inviting || !email.trim()}
      >
        <HugeiconsIcon icon={MailSend01Icon} size={16} strokeWidth={1.8} />
        <span>{inviting ? tr('members.sendingInvite') : tr('members.sendInvite')}</span>
      </Button>
    </div>
  </form>
</Dialog>

<Dialog
  bind:open={groupDialogOpen}
  title={editingGroup ? tr('members.editGroup') : tr('members.createGroup')}
  description={tr('members.groupDialogDescription')}
>
  <form
    class="space-y-4"
    onsubmit={(event) => {
      event.preventDefault();
      saveGroup();
    }}
  >
    <FormField label={tr('members.groupName')} required>
      {#snippet control(args)}
        <Input {...args} bind:value={groupName} placeholder={tr('members.groupNamePlaceholder')} required />
      {/snippet}
    </FormField>
    <FormField label={tr('members.groupMembersLabel')} required>
      {#snippet control()}
        <MultiSelectCombobox
          options={groupMemberOptions}
          bind:values={groupMemberIds}
          placeholder={tr('members.groupMembersPlaceholder')}
        />
      {/snippet}
    </FormField>
    {#if groupError}
      <p class="text-sm text-status-urgent-ink">{groupError}</p>
    {/if}
    <div class="mt-6 flex justify-end gap-2 border-t border-hairline pt-4">
      <Button variant="secondary" type="button" onclick={() => (groupDialogOpen = false)}>{tr('common.cancel')}</Button>
      <Button
        type="submit"
        variant="primary"
        loading={groupSaving}
        disabled={groupSaving || !groupName.trim() || groupMemberIds.length === 0}
      >
        {tr('common.save')}
      </Button>
    </div>
  </form>
</Dialog>

<!-- Confirm Dialog: Hapus Kumpulan -->
<ConfirmDialog
  open={groupToDelete !== null}
  title={tr('members.deleteGroupTitle')}
  description={groupToDelete ? tr('members.deleteGroupDescription', { name: groupToDelete.name }) : ''}
  confirmLabel={tr('common.delete')}
  cancelLabel={tr('common.cancel')}
  destructive
  loading={groupSaving}
  onconfirm={confirmDeleteGroup}
  oncancel={() => (groupToDelete = null)}
/>

<!-- Confirm Dialog: Hapus Anggota -->
<ConfirmDialog
  bind:open={removeDialogOpen}
  title={tr('members.removeTitle')}
  description={memberToRemove ? tr('members.removeDescription', { name: memberToRemove.name }) : tr('members.removeFallback')}
  confirmLabel={tr('members.remove')}
  cancelLabel={tr('common.cancel')}
  destructive
  loading={removing}
  onconfirm={confirmRemove}
  oncancel={() => {
    removeDialogOpen = false;
    memberToRemove = null;
  }}
/>

<!-- Confirm Dialog: Hapus Undangan -->
<ConfirmDialog
  bind:open={deleteInviteDialogOpen}
  title={tr('members.deleteInviteTitle')}
  description={inviteToDelete ? tr('members.deleteInviteDescription', { email: inviteToDelete.email }) : tr('members.deleteInviteFallback')}
  confirmLabel={tr('members.deleteInvite')}
  cancelLabel={tr('common.cancel')}
  destructive
  loading={inviteActionId !== null}
  onconfirm={confirmDeleteInvite}
  oncancel={() => {
    deleteInviteDialogOpen = false;
    inviteToDelete = null;
  }}
/>
