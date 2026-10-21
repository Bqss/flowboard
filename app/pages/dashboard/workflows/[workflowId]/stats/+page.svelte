<script lang="ts">
  import { page } from '$app/state';
  import {
    api,
    type ApiWorkflow,
    type ApiWorkflowStats,
    type ApiWorkspaceMember
  } from '$lib/api/client';
  import {
    Badge,
    Button,
    Skeleton,
    Avatar
  } from '$lib/components/atoms/index.js';
  import {
    DateRangePicker
  } from '$lib/components/molecules/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    ArrowLeft01Icon,
    Layers01Icon,
    Clock01Icon,
    Alert02Icon,
    Tick02Icon,
    Refresh01Icon
  } from '@hugeicons/core-free-icons';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import type { LayoutData } from '../../../$types';

  let { data }: { data: LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  const workflowId = $derived(page.params.workflowId);

  let loadingData = $state(true);
  let statsLoading = $state(false);
  let workflow = $state<ApiWorkflow | null>(null);
  let stats = $state<ApiWorkflowStats | null>(null);
  let members = $state<ApiWorkspaceMember[]>([]);

  let activityFromDate = $state<string>('');
  let activityToDate = $state<string>('');

  function toISO(date: Date) {
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
  }

  function daysBetween(from: string, to: string) {
    const f = new Date(from);
    const t = new Date(to);
    return Math.max(1, Math.ceil((t.getTime() - f.getTime()) / 86400000));
  }

  // Initialize default range: last 30 days
  const _today = new Date();
  const _30ago = new Date();
  _30ago.setDate(_30ago.getDate() - 29);
  activityFromDate = toISO(_30ago);
  activityToDate = toISO(_today);

  function activityRangeDays() {
    return daysBetween(activityFromDate, activityToDate);
  }

  async function loadData() {
    if (!data.workspace?.id || !workflowId) return;
    loadingData = true;
    try {
      const [wfRes, membersRes, statsRes] = await Promise.all([
        api.listWorkflows(data.workspace.id),
        api.listWorkspaceMembers(data.workspace.id).catch(() => ({ members: [] })),
        api.getWorkflowStats(data.workspace.id, workflowId, activityRangeDays()).catch(() => ({ stats: null }))
      ]);
      workflow = wfRes.workflows?.find((w) => w.id === workflowId) ?? null;
      members = membersRes.members ?? [];
      stats = statsRes.stats ?? null;
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      loadingData = false;
    }
  }

  async function refetchStats() {
    if (!data.workspace?.id || !workflowId) return;
    statsLoading = true;
    try {
      const res = await api.getWorkflowStats(data.workspace.id, workflowId, activityRangeDays());
      stats = res.stats ?? null;
    } catch {
      /* keep existing stats */
    } finally {
      statsLoading = false;
    }
  }

  let lastFromDate = $state('');
  let lastToDate = $state('');
  $effect(() => {
    if (
      data.workspace?.id &&
      workflowId &&
      (activityFromDate !== lastFromDate || activityToDate !== lastToDate)
    ) {
      lastFromDate = activityFromDate;
      lastToDate = activityToDate;
      if (!loadingData) {
        refetchStats();
      }
    }
  });

  $effect(() => {
    loadData();
  });

  // Chart Helpers
  const buildLinePath = (dataPts: number[], w: number, h: number, pad = 8) => {
    if (!dataPts.length) return { line: '', area: '' };
    const min = Math.min(...dataPts, 0);
    const max = Math.max(...dataPts, 1);
    const range = max - min || 1;
    const pts = dataPts.map((v, i) => {
      const x = pad + (i / Math.max(dataPts.length - 1, 1)) * (w - pad * 2);
      const y = pad + (1 - (v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    });
    return {
      line: `M ${pts.join(' L ')}`,
      area: `M ${pts.join(' L ')} L ${w - pad},${h - pad} L ${pad},${h - pad} Z`
    };
  };

  const buildDonutSegments = (
    items: Array<{ label: string; value: number; color: string }>,
    size: number,
    stroke: number
  ) => {
    const total = items.reduce((s, i) => s + i.value, 0);
    if (total === 0)
      return {
        segments: [] as Array<{
          label: string;
          value: number;
          color: string;
          dash: string;
          offset: number;
        }>,
        total
      };
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const segments = items.map((item) => {
      const fraction = item.value / total;
      const dash = fraction * circumference;
      const seg = {
        label: item.label,
        value: item.value,
        color: item.color,
        dash: `${dash} ${circumference - dash}`,
        offset: -offset
      };
      offset += dash;
      return seg;
    });
    return { segments, total, radius, circumference };
  };
</script>

<div class="space-y-6 pb-16">
  <!-- Top Navigation & Header -->
  <header class="space-y-3">
    <div class="flex items-center gap-2">
      <Button
        href="/dashboard/workflows/{workflowId}"
        variant="ghost"
        size="sm"
        class="gap-1.5 text-mute hover:text-ink pl-1"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
        <span>Kembali ke Alur Kerja</span>
      </Button>
    </div>

    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="ds-page-title text-ink">
          {workflow?.name ?? 'Aliran Kerja'} — {tr('board.stats')}
        </h1>
        <p class="ds-caption text-mute">
          Ringkasan prestasi, agihan kad mengikut peringkat, dan aktiviti aliran kerja.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <div class="w-full sm:w-[220px]">
          <DateRangePicker
            bind:start={activityFromDate}
            bind:end={activityToDate}
            placeholder="Pilih rentang tarikh"
          />
        </div>

        <Button
          variant="secondary"
          size="sm"
          onclick={refetchStats}
          loading={statsLoading}
          title="Muat semula statistik"
        >
          <HugeiconsIcon icon={Refresh01Icon} size={16} strokeWidth={1.8} />
          <span>Muat Semula</span>
        </Button>
      </div>
    </div>
  </header>

  {#if loadingData}
    <!-- Skeleton Loading Screen -->
    <div class="space-y-6 pt-2">
      <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {#each [1, 2, 3, 4] as _i}
          <div class="rounded-2xl bg-card p-5 space-y-3 shadow-card border border-hairline">
            <div class="flex justify-between items-center">
              <Skeleton shape="rect" class="h-4 w-20 rounded-md" />
              <Skeleton shape="rect" class="h-9 w-9 rounded-xl" />
            </div>
            <Skeleton shape="rect" class="h-8 w-16 rounded-md" />
            <Skeleton shape="rect" class="h-3 w-32 rounded-md" />
          </div>
        {/each}
      </div>
      <div class="grid gap-5 lg:grid-cols-2">
        <div class="rounded-2xl bg-card p-5 space-y-4 shadow-card border border-hairline">
          <Skeleton shape="rect" class="h-6 w-36 rounded-md" />
          <Skeleton shape="rect" class="h-32 w-full rounded-xl" />
        </div>
        <div class="rounded-2xl bg-card p-5 space-y-4 shadow-card border border-hairline">
          <Skeleton shape="rect" class="h-6 w-36 rounded-md" />
          <Skeleton shape="rect" class="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  {:else if stats}
    {@const totalActive = stats.totals.active ?? 0}
    {@const totalDone = stats.totals.done ?? 0}
    {@const totalAll = totalActive + totalDone}
    {@const stageColors = ['#6366f1', '#f59e0b', '#22c55e', '#ec4899', '#06b6d4', '#8b5cf6', '#f43f5e', '#14b8a6']}
    {@const donutData = stats.byStage.map((s, i) => ({ label: s.stageName, value: s.total, color: stageColors[i % stageColors.length] }))}
    {@const donutSize = 160}
    {@const donutStroke = 28}
    {@const createdData = stats.byTime.map((b) => b.created)}
    {@const completedData = stats.byTime.map((b) => b.completed)}
    {@const chartW = 800}
    {@const chartH = 200}
    {@const createdPath = buildLinePath(createdData, chartW, chartH)}
    {@const completedPath = buildLinePath(completedData, chartW, chartH)}
    {@const maxChartVal = Math.max(...createdData, ...completedData, 1)}
    {@const tickCount = 4}
    {@const dateLabels = stats.byTime.map((b) => {
      const d = new Date(b.date);
      return d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });
    })}
    {@const labelStep = Math.max(1, Math.ceil(dateLabels.length / 8))}
    {@const donutResult = buildDonutSegments(donutData, donutSize, donutStroke)}

    <section class="space-y-6 pt-2">
      <!-- 4 Key Metrics Cards -->
      <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <!-- Active -->
        <div class="rounded-2xl bg-card p-5 shadow-card border border-hairline space-y-3">
          <div class="flex items-center justify-between">
            <span class="ds-caption text-mute uppercase tracking-wider">{tr('board.statsActive')}</span>
            <div class="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <HugeiconsIcon icon={Layers01Icon} size={18} strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <p class="ds-stat text-ink">{stats.totals.active}</p>
            <p class="ds-caption text-mute mt-1">{tr('board.activeInPipeline') || 'Pelanggan aktif dalam alur kerja'}</p>
          </div>
        </div>

        <!-- Waiting -->
        <div class="rounded-2xl bg-card p-5 shadow-card border border-hairline space-y-3">
          <div class="flex items-center justify-between">
            <span class="ds-caption text-mute uppercase tracking-wider">{tr('board.statsWaiting')}</span>
            <div class="flex size-9 items-center justify-center rounded-xl bg-status-progress-soft text-status-progress-ink">
              <HugeiconsIcon icon={Clock01Icon} size={18} strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <p class="ds-stat text-ink">{stats.totals.waiting}</p>
            <p class="ds-caption text-mute mt-1">{tr('board.waitingActionDesc') || 'Menunggu maklum balas / semakan'}</p>
          </div>
        </div>

        <!-- Overdue -->
        <div class="rounded-2xl bg-card p-5 shadow-card border border-hairline space-y-3">
          <div class="flex items-center justify-between">
            <span class="ds-caption text-mute uppercase tracking-wider">{tr('board.statsOverdue')}</span>
            <div class="flex size-9 items-center justify-center rounded-xl bg-status-urgent-soft text-status-urgent-ink">
              <HugeiconsIcon icon={Alert02Icon} size={18} strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <p class="ds-stat text-ink">{stats.totals.overdue}</p>
            <p class="ds-caption text-mute mt-1">{tr('board.overdueDesc') || 'Melebihi had masa tindak balas'}</p>
          </div>
        </div>

        <!-- Done -->
        <div class="rounded-2xl bg-card p-5 shadow-card border border-hairline space-y-3">
          <div class="flex items-center justify-between">
            <span class="ds-caption text-mute uppercase tracking-wider">{tr('board.statsDone')}</span>
            <div class="flex size-9 items-center justify-center rounded-xl bg-status-done-soft text-status-done-ink">
              <HugeiconsIcon icon={Tick02Icon} size={18} strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <p class="ds-stat text-ink">{stats.totals.done}</p>
            <p class="ds-caption text-mute mt-1">
              {#if totalAll > 0}
                {Math.round((totalDone / totalAll) * 100)}% {tr('board.completionRate') || 'kadar selesai'}
              {:else}
                {tr('board.completedDesc') || 'Berjaya diselesaikan'}
              {/if}
            </p>
          </div>
        </div>
      </div>

      <!-- Middle Grid: Donut by Stage & Team Workload -->
      <div class="grid gap-5 lg:grid-cols-2">
        <!-- Donut Chart: Distribution by Stage -->
        <div class="rounded-2xl bg-card p-5 shadow-card border border-hairline space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="ds-section-title text-ink">{tr('board.statsByStage')}</h3>
            <span class="ds-caption text-mute">{stats.byStage.length} peringkat</span>
          </div>

          {#if stats.byStage.length === 0 || donutResult.total === 0}
            <p class="ds-body text-mute py-8 text-center">{tr('board.noStages')}</p>
          {:else}
            <div class="flex flex-col items-center gap-4 sm:flex-row sm:gap-6 pt-2">
              <div class="relative shrink-0" style="width: {donutSize}px; height: {donutSize}px">
                <svg width={donutSize} height={donutSize} viewBox="0 0 {donutSize} {donutSize}" style="transform: rotate(-90deg)">
                  <circle cx={donutSize / 2} cy={donutSize / 2} r={donutResult.radius} fill="none" stroke="var(--color-lane, #e8edf4)" stroke-width={donutStroke} />
                  {#each donutResult.segments as seg}
                    <circle cx={donutSize / 2} cy={donutSize / 2} r={donutResult.radius} fill="none" stroke={seg.color} stroke-width={donutStroke} stroke-dasharray={seg.dash} stroke-dashoffset={seg.offset} />
                  {/each}
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="ds-stat text-ink text-xl sm:text-2xl">{donutResult.total}</span>
                  <span class="ds-caption text-mute text-[11px]">total</span>
                </div>
              </div>

              <!-- Legend -->
              <div class="flex-1 space-y-2 min-w-0">
                {#each donutResult.segments as seg, i}
                  {@const stage = stats.byStage[i]}
                  {@const pct = donutResult.total > 0 ? Math.round((seg.value / donutResult.total) * 100) : 0}
                  <div class="flex items-center gap-2.5">
                    <span class="size-3 rounded-full shrink-0" style="background: {seg.color}"></span>
                    <span class="ds-label text-ink truncate flex-1">{seg.label}</span>
                    {#if stage?.overdue > 0}
                      <span class="inline-flex items-center rounded-full bg-status-urgent-soft text-status-urgent-ink px-1.5 py-0.2 text-[12px] font-semibold shrink-0">
                        {stage.overdue} {tr('board.statsOverdue').toLowerCase()}
                      </span>
                    {/if}
                    <span class="ds-label text-ink font-medium shrink-0">{seg.value}</span>
                    <span class="ds-caption text-mute shrink-0 w-10 text-right">({pct}%)</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <!-- Team Workload -->
        <div class="rounded-2xl bg-card p-5 shadow-card border border-hairline space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="ds-section-title text-ink">{tr('board.statsByAssignee')}</h3>
            <span class="ds-caption text-mute">{stats.byAssignee.length} PIC</span>
          </div>

          <div class="space-y-2.5 pt-1 max-h-[280px] overflow-y-auto">
            {#if stats.byAssignee.length === 0}
              <p class="ds-body text-mute py-8 text-center">{tr('board.unassigned')}</p>
            {:else}
              {#each stats.byAssignee as assignee (assignee.assigneeId ?? 'unassigned')}
                <div class="flex items-center justify-between gap-3 rounded-xl bg-canvas-sunken/50 p-3 transition-colors hover:bg-canvas-sunken">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <Avatar name={assignee.assigneeName ?? tr('board.statsUnassigned')} size={30} />
                    <div class="min-w-0">
                      <p class="ds-label text-ink truncate">
                        {assignee.assigneeName ?? tr('board.statsUnassigned')}
                      </p>
                      <p class="ds-caption text-mute truncate">{assignee.active} {tr('board.statsActive').toLowerCase()}</p>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center gap-1.5 shrink-0">
                    <Badge tone="queued" variant="soft" class="text-[12px] font-semibold">
                      {assignee.active} {tr('board.statsActive').toLowerCase()}
                    </Badge>
                    {#if assignee.waiting > 0}
                      <Badge tone="progress" variant="soft" class="text-[12px] font-semibold">
                        {assignee.waiting} {tr('board.statsWaiting').toLowerCase()}
                      </Badge>
                    {/if}
                    {#if assignee.overdue > 0}
                      <Badge tone="urgent" variant="soft" class="text-[12px] font-semibold">
                        {assignee.overdue} {tr('board.statsOverdue').toLowerCase()}
                      </Badge>
                    {/if}
                    {#if assignee.done > 0}
                      <Badge tone="done" variant="soft" class="text-[12px] font-semibold">
                        {assignee.done} {tr('board.statsDone').toLowerCase()}
                      </Badge>
                    {/if}
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      </div>

      <!-- Line Chart: Activity Over Time -->
      <div class="rounded-2xl bg-card p-5 shadow-card border border-hairline space-y-5">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <h3 class="ds-section-title text-ink">{tr('board.statsByTime')}</h3>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-1.5">
              <span class="size-2.5 rounded-full bg-primary"></span>
              <span class="ds-caption text-mute">{tr('board.statsCreated')}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="size-2.5 rounded-full bg-status-done"></span>
              <span class="ds-caption text-mute">{tr('board.statsCompleted')}</span>
            </div>
          </div>
        </div>

        {#if statsLoading}
          <div class="flex items-center justify-center py-12">
            <Skeleton shape="rect" class="h-48 w-full rounded-xl" />
          </div>
        {:else if stats.byTime.length === 0}
          <p class="ds-body text-mute py-8 text-center">Tiada data aktiviti dalam tempoh ini</p>
        {:else}
          <div class="relative overflow-hidden">
            <svg viewBox="0 0 {chartW} {chartH}" class="w-full" style="height: {chartH}px" preserveAspectRatio="none">
              {#each Array(tickCount + 1) as _, i}
                {@const ratio = i / tickCount}
                <line
                  x1="0" y1={chartH * ratio} x2={chartW} y2={chartH * ratio}
                  stroke="var(--color-hairline, #e2e8f0)" stroke-width="1" stroke-dasharray="4 4"
                />
              {/each}
              {#if createdPath.line}
                <path d={createdPath.area} fill="rgba(79, 70, 229, 0.06)" />
                <path
                  d={createdPath.line} fill="none"
                  stroke="var(--color-primary, #4f46e5)" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round"
                />
                {#each createdData as val, i}
                  {@const x = 8 + (i / Math.max(createdData.length - 1, 1)) * (chartW - 16)}
                  {@const min = 0}
                  {@const max = maxChartVal}
                  {@const range = max - min || 1}
                  {@const y = 8 + (1 - (val - min) / range) * (chartH - 16)}
                  <circle cx={x} cy={y} r="3" fill="var(--color-primary, #4f46e5)" />
                {/each}
              {/if}
              {#if completedPath.line}
                <path d={completedPath.area} fill="rgba(34, 197, 94, 0.06)" />
                <path
                  d={completedPath.line} fill="none"
                  stroke="var(--color-status-done, #22c55e)" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round"
                />
                {#each completedData as val, i}
                  {@const x = 8 + (i / Math.max(completedData.length - 1, 1)) * (chartW - 16)}
                  {@const min = 0}
                  {@const max = maxChartVal}
                  {@const range = max - min || 1}
                  {@const y = 8 + (1 - (val - min) / range) * (chartH - 16)}
                  <circle cx={x} cy={y} r="3" fill="var(--color-status-done, #22c55e)" />
                {/each}
              {/if}
            </svg>
          </div>

          <div class="flex justify-between px-1">
            {#each dateLabels as label, i}
              {#if i % labelStep === 0 || i === dateLabels.length - 1}
                <span class="ds-caption text-mute">{label}</span>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    </section>
  {/if}
</div>
