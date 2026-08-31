<script lang="ts">
  import {
    api,
    ApiError,
    type ApiAdminSubscription,
    type ApiPlan,
    type SubscriptionStatus
  } from '$lib/api/client';
  import { dashboardText, dashboardIntlLocale } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Badge, Button, Skeleton } from '$lib/components/atoms/index.js';
  import {
    KeyValuePair,
    SelectMenu,
    StatCard,
    Tabs,
    toast
  } from '$lib/components/molecules/index.js';
  import { AlertBanner } from '$lib/components/organisms/index.js';
  import type { Option } from '$lib/components/molecules/shared.js';
  import type { TabItem } from '$lib/components/molecules/shared.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    CheckmarkCircle03Icon,
    Timer02Icon,
    AlertCircleIcon,
    Cancel01Icon
  } from '@hugeicons/core-free-icons';

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  let subscriptions = $state<ApiAdminSubscription[]>([]);
  let plans = $state<ApiPlan[]>([]);
  let loading = $state(true);
  let error = $state(false);
  let statusFilter = $state<'all' | SubscriptionStatus>('all');

  let initialized = $state(false);
  $effect(() => {
    if (initialized) return;
    initialized = true;
    load();
  });

  async function load() {
    loading = true;
    error = false;
    try {
      const [subRes, planRes] = await Promise.all([
        api.adminListSubscriptions(),
        api.adminListPlans()
      ]);
      subscriptions = subRes.subscriptions;
      plans = planRes.plans;
    } catch {
      error = true;
      subscriptions = [];
    } finally {
      loading = false;
    }
  }

  const statusTone: Record<SubscriptionStatus, 'done' | 'progress' | 'urgent' | 'idle'> = {
    trial: 'progress',
    active: 'done',
    past_due: 'urgent',
    canceled: 'idle'
  };

  const statusLabel: Record<SubscriptionStatus, string> = {
    active: tr('admin.overview.statusActive'),
    trial: tr('admin.overview.statusTrial'),
    past_due: tr('admin.overview.statusPastDue'),
    canceled: tr('admin.overview.statusCanceled')
  };

  const counts = $derived({
    active: subscriptions.filter((s) => s.status === 'active').length,
    trial: subscriptions.filter((s) => s.status === 'trial').length,
    past_due: subscriptions.filter((s) => s.status === 'past_due').length,
    canceled: subscriptions.filter((s) => s.status === 'canceled').length
  });

  const filtered = $derived(
    statusFilter === 'all'
      ? subscriptions
      : subscriptions.filter((s) => s.status === statusFilter)
  );

  const tabItems = $derived<TabItem[]>([
    { value: 'all', label: tr('admin.filter.all'), badge: subscriptions.length },
    { value: 'active', label: statusLabel.active, badge: counts.active },
    { value: 'trial', label: statusLabel.trial, badge: counts.trial },
    { value: 'past_due', label: statusLabel.past_due, badge: counts.past_due },
    { value: 'canceled', label: statusLabel.canceled, badge: counts.canceled }
  ]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Intl.DateTimeFormat(dashboardIntlLocale($locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateStr));
  };

  const formatMoney = (cents: number, currency: string) =>
    new Intl.NumberFormat(dashboardIntlLocale($locale), {
      style: 'currency',
      currency
    }).format(cents / 100);

  const planOptions = $derived<Option[]>(
    plans.map((p) => ({ value: p.id, label: p.name }))
  );

  async function changePlan(workspaceId: string, planId: string) {
    if (!planId) return;
    try {
      await api.adminChangePlan(workspaceId, planId);
      toast.success(tr('admin.subs.planChanged'));
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('admin.subs.planChanged'));
    }
  }

  async function extendTrial(workspaceId: string) {
    try {
      await api.adminExtendTrial(workspaceId, 14);
      toast.success(tr('admin.subs.trialExtended'));
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('admin.subs.trialExtended'));
    }
  }

  async function setStatus(workspaceId: string, status: SubscriptionStatus) {
    try {
      await api.adminSetStatus(workspaceId, status);
      toast.success(tr('admin.subs.statusSet', { status }));
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('admin.subs.statusSet', { status }));
    }
  }
</script>

<svelte:head><title>{tr('admin.subs.title')} — actjom</title></svelte:head>

{#snippet activeIcon()}
  <HugeiconsIcon icon={CheckmarkCircle03Icon} size={18} strokeWidth={1.8} />
{/snippet}

{#snippet trialIcon()}
  <HugeiconsIcon icon={Timer02Icon} size={18} strokeWidth={1.8} />
{/snippet}

{#snippet pastDueIcon()}
  <HugeiconsIcon icon={AlertCircleIcon} size={18} strokeWidth={1.8} />
{/snippet}

{#snippet canceledIcon()}
  <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.8} />
{/snippet}

<div class="space-y-6 sm:space-y-8">
  <header class="space-y-3">
    <h1 class="ds-page-title text-ink">{tr('admin.subs.title')}</h1>
    <p class="ds-caption text-mute">{tr('admin.subs.description')}</p>
  </header>

  {#if loading}
    <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {#each [1, 2, 3, 4] as _i}
        <div class="rounded-2xl border border-hairline bg-card p-5 space-y-3 shadow-card">
          <Skeleton shape="circle" class="h-9 w-9 rounded-lg" />
          <Skeleton shape="rect" class="h-4 w-20 rounded-md" />
          <Skeleton shape="rect" class="h-7 w-14 rounded-md" />
        </div>
      {/each}
    </div>
    <div class="space-y-4">
      {#each [1, 2, 3] as _i}
        <Skeleton shape="rect" class="h-32 w-full rounded-2xl" />
      {/each}
    </div>
  {:else if error}
    <AlertBanner tone="negative" dismissible={false}>
      {tr('admin.overview.loadError')}
    </AlertBanner>
  {:else}
    <!-- Stat summary by status -->
    <section class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard
        label={statusLabel.active}
        value={String(counts.active)}
        icon={activeIcon}
        class="rounded-2xl"
      />
      <StatCard
        label={statusLabel.trial}
        value={String(counts.trial)}
        icon={trialIcon}
        class="rounded-2xl"
      />
      <StatCard
        label={statusLabel.past_due}
        value={String(counts.past_due)}
        icon={pastDueIcon}
        class="rounded-2xl"
      />
      <StatCard
        label={statusLabel.canceled}
        value={String(counts.canceled)}
        icon={canceledIcon}
        class="rounded-2xl"
      />
    </section>

    <!-- Status filter tabs -->
    <Tabs
      items={tabItems}
      bind:value={statusFilter}
      variant="pills"
      size="md"
    />

    {#if filtered.length === 0}
      <section class="rounded-2xl border border-hairline bg-card p-6 shadow-card">
        <p class="ds-body text-mute">{tr('admin.subs.empty')}</p>
        <p class="ds-caption mt-1 text-faint">{tr('admin.subs.emptyDesc')}</p>
      </section>
    {:else}
      <div class="space-y-4">
        {#each filtered as sub (sub.id)}
          <article
            class="rounded-2xl border border-hairline bg-card shadow-card transition-all duration-200 hover:border-hairline-strong hover:shadow-card-hover"
          >
            <div class="p-4 sm:p-5 space-y-4">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="space-y-2">
                  <div class="flex items-center gap-3">
                    <h3 class="text-base font-bold text-ink">{sub.workspace.name}</h3>
                    <Badge tone={statusTone[sub.status]} variant="soft">
                      {statusLabel[sub.status]}
                    </Badge>
                  </div>
                  <p class="ds-caption text-mute font-mono">{sub.workspace.slug}</p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <div class="w-full sm:w-44">
                    <SelectMenu
                      options={planOptions}
                      value={sub.plan.id}
                      placeholder={tr('admin.subs.selectPlan')}
                      size="sm"
                      onchange={(value) => changePlan(sub.workspace.id, value)}
                    />
                  </div>
                  <Button variant="secondary" size="sm" onclick={() => extendTrial(sub.workspace.id)}>
                    {tr('admin.subs.extendTrial')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onclick={() => setStatus(sub.workspace.id, 'active')}
                  >
                    {tr('admin.subs.activate')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onclick={() => setStatus(sub.workspace.id, 'canceled')}
                  >
                    {tr('admin.subs.cancel')}
                  </Button>
                </div>
              </div>

              <!-- Plan + period details -->
              <div class="grid gap-x-6 gap-y-3 border-t border-hairline pt-4 sm:grid-cols-2 lg:grid-cols-4">
                <KeyValuePair label={tr('admin.subs.plan')} value={sub.plan.name} />
                <KeyValuePair
                  label={tr('admin.subs.trialEnds')}
                  value={formatDate(sub.trialEndsAt)}
                />
                <KeyValuePair
                  label={tr('admin.subs.periodEnd')}
                  value={formatDate(sub.currentPeriodEnd)}
                />
                <KeyValuePair
                  label={tr('admin.subs.price')}
                  value="{formatMoney(sub.plan.priceCents, sub.plan.currency)} / {sub.plan.interval}"
                />
              </div>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  {/if}
</div>
