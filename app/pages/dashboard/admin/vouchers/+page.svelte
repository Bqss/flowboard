<script lang="ts">
  import { api, ApiError, type ApiVoucher, type VoucherType } from '$lib/api/client';
  import { dashboardText, dashboardIntlLocale } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Badge, Button, Input, Skeleton } from '$lib/components/atoms/index.js';
  import { FormField, SearchInput, SelectMenu, StatCard, toast } from '$lib/components/molecules/index.js';
  import { AlertBanner, DataTable, Dialog } from '$lib/components/organisms/index.js';
  import type { TableColumn } from '$lib/components/organisms/shared.js';
  import type { Option } from '$lib/components/molecules/shared.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    GiftIcon,
    Tag01Icon,
    CheckmarkCircle03Icon,
    Coupon01Icon
  } from '@hugeicons/core-free-icons';

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  let vouchers = $state<ApiVoucher[]>([]);
  let loading = $state(true);
  let error = $state(false);
  let query = $state('');

  // Create dialog
  let showForm = $state(false);
  let form = $state({
    code: '',
    type: 'percent' as VoucherType,
    value: 10,
    maxRedemptions: '' as string | number,
    maxRedemptionsPerWorkspace: 1,
    expiresAt: '',
    note: ''
  });
  let creating = $state(false);

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
      const res = await api.adminListVouchers();
      vouchers = res.vouchers;
    } catch {
      error = true;
      vouchers = [];
    } finally {
      loading = false;
    }
  }

  async function createVoucher() {
    creating = true;
    try {
      await api.adminCreateVoucher({
        code: form.code,
        type: form.type,
        value: form.value,
        maxRedemptions: form.maxRedemptions === '' ? null : Number(form.maxRedemptions),
        maxRedemptionsPerWorkspace: form.maxRedemptionsPerWorkspace,
        expiresAt: form.expiresAt || null,
        note: form.note || null
      });
      toast.success(tr('admin.vouchers.created'));
      showForm = false;
      form = {
        code: '',
        type: 'percent',
        value: 10,
        maxRedemptions: '',
        maxRedemptionsPerWorkspace: 1,
        expiresAt: '',
        note: ''
      };
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('admin.vouchers.createError'));
    } finally {
      creating = false;
    }
  }

  const activeCount = $derived(vouchers.filter((v) => v.active).length);
  const redeemedTotal = $derived(vouchers.reduce((sum, v) => sum + (v.redeemedCount ?? 0), 0));

  const filtered = $derived(
    query.trim()
      ? vouchers.filter((v) => v.code.toLowerCase().includes(query.toLowerCase()))
      : vouchers
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Intl.DateTimeFormat(dashboardIntlLocale($locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateStr));
  };

  const typeOptions = $derived<Option[]>([
    { value: 'percent', label: tr('admin.vouchers.typePercent') },
    { value: 'fixed', label: tr('admin.vouchers.typeFixed') },
    { value: 'trial_days', label: tr('admin.vouchers.typeTrial') }
  ]);

  const formatValue = (v: ApiVoucher) => {
    if (v.type === 'percent') return `${v.value}%`;
    if (v.type === 'fixed') return `${v.value}¢`;
    return `${v.value}d`;
  };

  const columns = $derived<TableColumn<ApiVoucher & Record<string, unknown>>[]>([
    { key: 'code', label: tr('admin.vouchers.code'), mono: true, sortable: true },
    { key: 'type', label: tr('admin.vouchers.type') },
    {
      key: 'value',
      label: tr('admin.vouchers.value'),
      render: (row) => formatValue(row)
    },
    {
      key: 'redeemedCount',
      label: tr('admin.vouchers.redeemed'),
      render: (row) => `${row.redeemedCount}${row.maxRedemptions ? ` / ${row.maxRedemptions}` : ''}`
    },
    {
      key: 'expiresAt',
      label: tr('admin.vouchers.expires'),
      render: (row) => formatDate(row.expiresAt)
    },
    {
      key: 'active',
      label: tr('admin.vouchers.status'),
      render: (row) => (row.active ? tr('admin.vouchers.active') : tr('admin.vouchers.inactive'))
    }
  ]);
</script>

<svelte:head><title>{tr('admin.vouchers.title')} — Flowboard</title></svelte:head>

{#snippet totalIcon()}
  <HugeiconsIcon icon={Coupon01Icon} size={18} strokeWidth={1.8} />
{/snippet}

{#snippet activeIcon()}
  <HugeiconsIcon icon={CheckmarkCircle03Icon} size={18} strokeWidth={1.8} />
{/snippet}

{#snippet redeemedIcon()}
  <HugeiconsIcon icon={Tag01Icon} size={18} strokeWidth={1.8} />
{/snippet}

<div class="space-y-8">
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div class="space-y-3">
      <h1 class="ds-page-title text-ink">{tr('admin.vouchers.title')}</h1>
      <p class="ds-caption text-mute">{tr('admin.vouchers.description')}</p>
    </div>
    <Button variant="primary" onclick={() => (showForm = true)}>
      <HugeiconsIcon icon={GiftIcon} size={16} strokeWidth={1.8} />
      {tr('admin.vouchers.new')}
    </Button>
  </header>

  <!-- Stat summary -->
  <section>
    {#if loading}
      <div class="grid gap-4 sm:grid-cols-3">
        {#each [1, 2, 3] as _i}
          <div class="rounded-2xl border border-hairline bg-card p-5 space-y-3 shadow-card">
            <Skeleton shape="circle" class="h-9 w-9 rounded-lg" />
            <Skeleton shape="rect" class="h-4 w-20 rounded-md" />
            <Skeleton shape="rect" class="h-7 w-14 rounded-md" />
          </div>
        {/each}
      </div>
    {:else}
      <div class="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={tr('admin.stats.total')}
          value={String(vouchers.length)}
          icon={totalIcon}
          class="rounded-2xl"
        />
        <StatCard
          label={tr('admin.stats.activeVouchers')}
          value={String(activeCount)}
          icon={activeIcon}
          class="rounded-2xl"
        />
        <StatCard
          label={tr('admin.stats.redeemedTotal')}
          value={String(redeemedTotal)}
          icon={redeemedIcon}
          class="rounded-2xl"
        />
      </div>
    {/if}
  </section>

  <!-- Search + table -->
  <section class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="max-w-sm flex-1">
        <SearchInput
          bind:value={query}
          placeholder={tr('admin.search.vouchers')}
          submit={false}
          size="md"
        />
      </div>
      {#if query}
        <Badge tone="queued" variant="soft">
          {tr('admin.filter.all')}: {filtered.length}
        </Badge>
      {/if}
    </div>

    {#if loading}
      <Skeleton shape="rect" class="h-64 w-full rounded-2xl" />
    {:else if error}
      <AlertBanner tone="negative" dismissible={false}>
        {tr('admin.overview.loadError')}
      </AlertBanner>
    {:else}
      <DataTable
        {columns}
        rows={filtered as (ApiVoucher & Record<string, unknown>)[]}
        rowKey="id"
        emptyTitle={query ? tr('admin.empty.noResults') : tr('admin.vouchers.empty')}
        emptyDescription={query ? tr('admin.empty.noResultsDesc') : tr('admin.vouchers.emptyDesc')}
      />
    {/if}
  </section>
</div>

<!-- Create voucher dialog -->
<Dialog bind:open={showForm} title={tr('admin.vouchers.create')} size="lg">
  <form
    onsubmit={(e) => {
      e.preventDefault();
      createVoucher();
    }}
    class="space-y-4"
  >
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label={tr('admin.vouchers.code')} required>
        {#snippet control(args)}
          <Input {...args} bind:value={form.code} placeholder="WELCOME-2024" />
        {/snippet}
      </FormField>
      <FormField label={tr('admin.vouchers.type')} required>
        {#snippet control()}
          <SelectMenu
            options={typeOptions}
            bind:value={form.type}
            placeholder={tr('admin.vouchers.type')}
          />
        {/snippet}
      </FormField>
      <FormField label={tr('admin.vouchers.value')} required>
        {#snippet control(args)}
          <Input {...args} type="number" bind:value={form.value} />
        {/snippet}
      </FormField>
      <FormField label={tr('admin.vouchers.maxRedemptions')}>
        {#snippet control(args)}
          <Input {...args} type="number" bind:value={form.maxRedemptions} placeholder="100" />
        {/snippet}
      </FormField>
      <FormField label={tr('admin.vouchers.maxPerWorkspace')}>
        {#snippet control(args)}
          <Input {...args} type="number" bind:value={form.maxRedemptionsPerWorkspace} />
        {/snippet}
      </FormField>
      <FormField label={tr('admin.vouchers.expiresAt')}>
        {#snippet control(args)}
          <Input {...args} type="date" bind:value={form.expiresAt} />
        {/snippet}
      </FormField>
    </div>
    <FormField label={tr('admin.vouchers.note')}>
      {#snippet control(args)}
        <Input {...args} bind:value={form.note} placeholder="Campaign note" />
      {/snippet}
    </FormField>
  </form>

  {#snippet footer()}
    <Button variant="secondary" onclick={() => (showForm = false)}>
      {tr('common.cancel')}
    </Button>
    <Button variant="primary" onclick={createVoucher} loading={creating}>
      {tr('admin.vouchers.create')}
    </Button>
  {/snippet}
</Dialog>
