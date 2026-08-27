<script lang="ts">
  import { api, type ApiAdminOverview, type SubscriptionStatus } from '$lib/api/client';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Badge, Skeleton } from '$lib/components/atoms/index.js';
  import { StatCard, StatCardHighlight } from '$lib/components/molecules/index.js';
  import { AlertBanner, GaugeCard } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    UserGroupIcon,
    GridIcon,
    Timer02Icon,
    ArrowRight01Icon,
    UserSquareIcon,
    Invoice02Icon,
    GiftIcon
  } from '@hugeicons/core-free-icons';

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  let overview = $state<ApiAdminOverview | null>(null);
  let loading = $state(true);
  let error = $state(false);

  let initialized = $state(false);
  $effect(() => {
    if (initialized) return;
    initialized = true;
    loadOverview();
  });

  async function loadOverview() {
    loading = true;
    error = false;
    try {
      overview = await api.adminOverview();
    } catch {
      error = true;
      overview = null;
    } finally {
      loading = false;
    }
  }

  const statusOrder: SubscriptionStatus[] = ['active', 'trial', 'past_due', 'canceled'];

  const statusMeta: Record<
    SubscriptionStatus,
    { tone: 'done' | 'progress' | 'urgent' | 'idle'; label: string; bar: string }
  > = {
    active: { tone: 'done', label: tr('admin.overview.statusActive'), bar: 'bg-status-done' },
    trial: { tone: 'progress', label: tr('admin.overview.statusTrial'), bar: 'bg-status-progress' },
    past_due: { tone: 'urgent', label: tr('admin.overview.statusPastDue'), bar: 'bg-status-urgent' },
    canceled: { tone: 'idle', label: tr('admin.overview.statusCanceled'), bar: 'bg-status-idle' }
  };

  const totalSubs = $derived.by(() => {
    if (!overview) return 0;
    const byStatus = overview.subscriptionsByStatus;
    return statusOrder.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0);
  });
  const activeCount = $derived(overview?.subscriptionsByStatus.active ?? 0);
  const conversionPct = $derived(totalSubs > 0 ? Math.round((activeCount / totalSubs) * 100) : 0);

  const shortcuts = [
    {
      href: '/dashboard/admin/users',
      icon: UserSquareIcon,
      title: tr('admin.overview.manageUsers'),
      desc: tr('admin.overview.manageUsersDesc')
    },
    {
      href: '/dashboard/admin/subscriptions',
      icon: Invoice02Icon,
      title: tr('admin.overview.manageSubs'),
      desc: tr('admin.overview.manageSubsDesc')
    },
    {
      href: '/dashboard/admin/vouchers',
      icon: GiftIcon,
      title: tr('admin.overview.manageVouchers'),
      desc: tr('admin.overview.manageVouchersDesc')
    }
  ];
</script>

<svelte:head><title>{tr('admin.overview.title')} — Flowboard</title></svelte:head>

{#snippet workspacesIcon()}
  <HugeiconsIcon icon={GridIcon} size={18} strokeWidth={1.8} />
{/snippet}

{#snippet usersIcon()}
  <HugeiconsIcon icon={UserGroupIcon} size={18} strokeWidth={1.8} />
{/snippet}

{#snippet trialIcon()}
  <HugeiconsIcon icon={Timer02Icon} size={18} strokeWidth={1.8} />
{/snippet}

<div class="space-y-8">
  <!-- Hero header -->
  <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="space-y-1">
      <p class="ds-caption font-semibold uppercase tracking-wide text-primary">
        {tr('admin.overview.subtitle')}
      </p>
      <h1 class="ds-page-title text-ink">{tr('admin.overview.title')}</h1>
      <p class="ds-caption text-mute">{tr('admin.overview.description')}</p>
    </div>
  </header>

  {#if loading}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each [1, 2, 3, 4] as _i}
        <div class="rounded-2xl border border-hairline bg-card p-5 space-y-3 shadow-card">
          <Skeleton shape="circle" class="h-9 w-9 rounded-lg" />
          <Skeleton shape="rect" class="h-4 w-20 rounded-md" />
          <Skeleton shape="rect" class="h-7 w-14 rounded-md" />
        </div>
      {/each}
    </div>
    <div class="grid gap-5 lg:grid-cols-3">
      <Skeleton shape="rect" class="h-72 rounded-2xl" />
      <Skeleton shape="rect" class="h-72 rounded-2xl lg:col-span-2" />
    </div>
  {:else if error}
    <AlertBanner tone="negative" dismissible={false}>
      {tr('admin.overview.loadError')}
    </AlertBanner>
  {:else if overview}
    <!-- KPI grid: 1 highlight + 3 stat cards -->
    <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCardHighlight
        label={tr('admin.overview.activeSubs')}
        value={String(activeCount)}
        class="rounded-2xl"
      />
      <StatCard
        label={tr('admin.overview.workspaces')}
        value={String(overview.workspaces)}
        icon={workspacesIcon}
        class="rounded-2xl"
      />
      <StatCard
        label={tr('admin.overview.users')}
        value={String(overview.users)}
        icon={usersIcon}
        class="rounded-2xl"
      />
      <StatCard
        label={tr('admin.overview.trialSubs')}
        value={String(overview.subscriptionsByStatus.trial ?? 0)}
        icon={trialIcon}
        class="rounded-2xl"
      />
    </section>

    <!-- Conversion gauge + status distribution -->
    <section class="grid gap-5 lg:grid-cols-3">
      <GaugeCard
        title={tr('admin.overview.conversion')}
        value={activeCount}
        max={totalSubs || 1}
        centerValue="{conversionPct}%"
        label="{activeCount} / {totalSubs} · {tr('admin.overview.conversionLabel')}"
        size="lg"
        class="rounded-2xl"
      />

      <article
        class="flex flex-col rounded-2xl border border-hairline bg-card p-6 shadow-card space-y-5 lg:col-span-2"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="space-y-1">
            <h2 class="ds-section-title text-ink">{tr('admin.overview.distribution')}</h2>
            <p class="ds-caption text-mute">
              {tr('admin.overview.totalSubs')}: <span class="font-semibold text-ink">{totalSubs}</span>
            </p>
          </div>
          <Badge tone="queued" variant="soft">{totalSubs} subs</Badge>
        </div>

        {#if totalSubs === 0}
          <div class="flex flex-1 items-center justify-center py-10">
            <p class="ds-body text-mute">{tr('admin.overview.noSubs')}</p>
          </div>
        {:else}
          <div class="flex flex-1 flex-col justify-center gap-5">
            {#each statusOrder as status}
              {@const count = overview.subscriptionsByStatus[status] ?? 0}
              {@const pct = totalSubs > 0 ? (count / totalSubs) * 100 : 0}
              {@const meta = statusMeta[status]}
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Badge tone={meta.tone} variant="soft">{meta.label}</Badge>
                  </div>
                  <div class="flex items-baseline gap-1.5">
                    <span class="ds-stat-sm tabular-nums text-ink">{count}</span>
                    <span class="ds-caption text-mute">{Math.round(pct)}%</span>
                  </div>
                </div>
                <div class="h-2 w-full overflow-hidden rounded-full bg-lane">
                  <div
                    class="h-full rounded-full transition-all duration-500 ease-out {meta.bar}"
                    style="width: {pct}%"
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </article>
    </section>

    <!-- Quick management shortcuts -->
    <section class="space-y-4">
      <div class="space-y-1">
        <h2 class="ds-section-title text-ink">{tr('admin.overview.shortcuts')}</h2>
        <p class="ds-caption text-mute">{tr('admin.overview.shortcutsDescription')}</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {#each shortcuts as item}
          <a
            href={item.href}
            class="group flex flex-col justify-between rounded-2xl border border-hairline bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-card-hover"
          >
            <div class="flex items-start justify-between">
              <span
                class="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary"
              >
                <HugeiconsIcon icon={item.icon} size={20} strokeWidth={1.8} />
              </span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                strokeWidth={1.8}
                class="text-faint transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
              />
            </div>
            <div class="mt-4 space-y-1">
              <h3 class="text-base font-bold text-ink">{item.title}</h3>
              <p class="ds-caption text-mute">{item.desc}</p>
            </div>
          </a>
        {/each}
      </div>
    </section>
  {/if}
</div>
