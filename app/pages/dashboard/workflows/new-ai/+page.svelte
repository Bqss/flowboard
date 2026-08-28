<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, ApiError, type ApiWorkflowDraft } from '$lib/api/client';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Badge, Button, Skeleton, Textarea } from '$lib/components/atoms/index.js';
  import { Breadcrumb, FormField, Stepper, toast } from '$lib/components/molecules/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    AiMagicIcon,
    ArrowRight01Icon,
    KanbanIcon,
    SparklesIcon,
    ViewIcon,
    CheckmarkCircle02Icon,
    MessageIncoming02Icon,
    BulbIcon,
    Route02Icon,
    CheckListIcon,
    Message01Icon,
    SmartPhone01Icon,
    Forward02Icon,
    Clock02Icon
  } from '@hugeicons/core-free-icons';

  let { data }: { data: import('../../$types').LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  let step = $state(1);
  let prompt = $state('');
  let generating = $state(false);
  let saving = $state(false);
  let provider = $state<'ai' | 'heuristic'>('heuristic');
  let draft = $state<ApiWorkflowDraft | null>(null);

  const steps = $derived([
    { id: 'prompt', label: tr('ai.promptStep') },
    { id: 'preview', label: tr('ai.previewStep') },
    { id: 'done', label: tr('ai.saveStep') }
  ]);

  const examples = $derived([
    tr('ai.example1'),
    tr('ai.example2'),
    tr('ai.example3')
  ]);

  const tips = $derived([tr('ai.tip1'), tr('ai.tip2'), tr('ai.tip3')]);

  const willGenerate = $derived([
    { icon: Route02Icon, text: tr('ai.willGenerate1') },
    { icon: CheckListIcon, text: tr('ai.willGenerate2') },
    { icon: Message01Icon, text: tr('ai.willGenerate3') }
  ]);

  const totalActions = $derived(
    draft
      ? draft.stages.reduce(
          (n, s) => n + s.checklists.filter((c) => c.action?.kind && c.action.kind !== 'none').length,
          0
        )
      : 0
  );

  const totalChecklists = $derived(
    draft ? draft.stages.reduce((n, s) => n + s.checklists.length, 0) : 0
  );

  function useExample(text: string) {
    prompt = text;
  }

  async function generateDraft() {
    if (!prompt.trim() || !data.workspace?.id) return;
    generating = true;
    try {
      const res = await api.generateWorkflowDraft(data.workspace.id, { prompt: prompt.trim() });
      draft = res.draft;
      provider = res.provider;
      step = 2;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('ai.generateError'));
    } finally {
      generating = false;
    }
  }

  async function saveDraft() {
    if (!draft || !data.workspace?.id) return;
    saving = true;
    try {
      const res = await api.saveWorkflowDraft(data.workspace.id, draft);
      toast.success(tr('ai.saved'));
      await goto(`/dashboard/workflows/${res.workflow.id}/setup`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('ai.saveError'));
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>{tr('ai.title')} — Flowboard</title></svelte:head>

<div class="space-y-6 sm:space-y-8">
  <header class="space-y-4 sm:space-y-6">
    <Breadcrumb
      items={[
        { label: tr('common.workflows'), href: '/dashboard/workflows' },
        { label: tr('ai.title') }
      ]}
      showHomeIcon
    />
    <div class="space-y-1">
      <h1 class="ds-page-title text-ink">{tr('ai.title')}</h1>
      <p class="ds-caption text-mute max-w-2xl">{tr('ai.description')}</p>
    </div>
    <Stepper {steps} current={step - 1} class="mx-auto max-w-3xl" />
  </header>

  {#if step === 1}
    <!-- Two-column: prompt card + tips sidebar -->
    <div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <!-- Prompt card -->
      <section class="rounded-card border border-hairline bg-card shadow-card">
        <div class="space-y-6 p-5 sm:p-8">
          <div class="flex items-center gap-3">
            <span class="grid size-10 place-items-center rounded-full bg-primary-soft text-primary">
              <HugeiconsIcon icon={AiMagicIcon} size={20} strokeWidth={1.8} />
            </span>
            <div>
              <p class="ds-label text-ink">{tr('ai.promptLabel')}</p>
              <p class="ds-caption text-mute">{tr('ai.promptHelper')}</p>
            </div>
          </div>

          <FormField required>
            {#snippet control(args)}
              <Textarea
                {...args}
                bind:value={prompt}
                rows={6}
                class="text-[15px] leading-relaxed"
                placeholder={tr('ai.promptPlaceholder')}
              />
            {/snippet}
          </FormField>

          {#if prompt.length > 0}
            <p class="ds-caption text-right text-faint">{tr('ai.charCount', { count: prompt.length })}</p>
          {/if}

          <!-- Example chips -->
          <div class="space-y-2">
            <p class="ds-caption font-semibold text-mute">{tr('ai.examplesTitle')}</p>
            <div class="flex flex-col gap-2">
              {#each examples as ex}
                <button
                  type="button"
                  onclick={() => useExample(ex)}
                  class="group flex items-start gap-2.5 rounded-lg border border-hairline bg-canvas-sunken px-3.5 py-2.5 text-left transition-all hover:border-primary-border hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15"
                >
                  <HugeiconsIcon
                    icon={SparklesIcon}
                    size={16}
                    strokeWidth={1.8}
                    class="mt-0.5 shrink-0 text-faint transition-colors group-hover:text-primary"
                  />
                  <span class="ds-body text-[13px] leading-snug text-body transition-colors group-hover:text-ink">{ex}</span>
                </button>
              {/each}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
            <Button variant="ghost" href="/dashboard/workflows">{tr('common.cancel')}</Button>
            <Button variant="primary" loading={generating} disabled={!prompt.trim()} onclick={generateDraft} size="lg">
              <HugeiconsIcon icon={AiMagicIcon} size={18} strokeWidth={1.8} />
              <span>{tr('ai.generate')}</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} />
            </Button>
          </div>
        </div>
      </section>

      <!-- Tips sidebar -->
      <aside class="space-y-4">
        <div class="rounded-card border border-hairline bg-card p-5 sm:p-6 shadow-card space-y-3">
          <div class="flex items-center gap-2">
            <span class="grid size-8 place-items-center rounded-full bg-status-progress-soft text-status-progress-ink">
              <HugeiconsIcon icon={BulbIcon} size={16} strokeWidth={1.8} />
            </span>
            <p class="ds-label text-ink">{tr('ai.tipsTitle')}</p>
          </div>
          <ul class="space-y-2.5">
            {#each tips as tip}
              <li class="flex items-start gap-2">
                <span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-status-progress"></span>
                <span class="ds-body text-[13px] leading-snug text-body">{tip}</span>
              </li>
            {/each}
          </ul>
        </div>

        <div class="rounded-card border border-hairline bg-card p-5 sm:p-6 shadow-card space-y-3">
          <div class="flex items-center gap-2">
            <span class="grid size-8 place-items-center rounded-full bg-primary-soft text-primary">
              <HugeiconsIcon icon={ViewIcon} size={16} strokeWidth={1.8} />
            </span>
            <p class="ds-label text-ink">{tr('ai.willGenerateTitle')}</p>
          </div>
          <ul class="space-y-2.5">
            {#each willGenerate as item}
              <li class="flex items-center gap-2.5">
                <span class="grid size-6 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
                  <HugeiconsIcon icon={item.icon} size={14} strokeWidth={1.8} />
                </span>
                <span class="ds-body text-[13px] leading-snug text-body">{item.text}</span>
              </li>
            {/each}
          </ul>
        </div>

        <div class="rounded-card border border-hairline bg-card p-5 sm:p-6 shadow-card space-y-3">
          <div class="flex items-center gap-2">
            <span class="grid size-8 place-items-center rounded-full bg-primary-soft text-primary">
              <HugeiconsIcon icon={SmartPhone01Icon} size={16} strokeWidth={1.8} />
            </span>
            <p class="ds-label text-ink">{tr('ai.senderNumber')}</p>
          </div>
          {#if data.user?.phone}
            <p class="ds-body text-[13px] font-semibold text-ink">{data.user.phone}</p>
            <p class="ds-caption text-mute">{tr('ai.senderNumberHint')}</p>
          {:else}
            <p class="ds-caption text-mute">{tr('ai.senderNumberNotSet')}</p>
            <Button variant="secondary" size="sm" href="/dashboard/settings">{tr('settings.title')}</Button>
          {/if}
        </div>
      </aside>
    </div>
  {:else if step === 2 && draft}
    <section class="space-y-6">
      <!-- Summary bar -->
      <div class="rounded-card border border-hairline bg-card p-5 sm:p-6 shadow-card">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
              <HugeiconsIcon icon={KanbanIcon} size={22} strokeWidth={1.8} />
            </span>
            <div class="space-y-1.5">
              <h2 class="ds-section-title text-ink">{draft.name}</h2>
              <div class="flex flex-wrap items-center gap-2">
                <Badge tone={provider === 'ai' ? 'progress' : 'queued'} variant="soft">
                  {provider === 'ai' ? 'Gemini AI' : tr('ai.heuristic')}
                </Badge>
                <span class="ds-caption text-mute">{tr('ai.previewHint')}</span>
              </div>
            </div>
          </div>

          <!-- Stats -->
          <div class="flex items-center gap-4 sm:gap-6">
            <div class="text-center">
              <p class="text-xl sm:text-2xl font-extrabold tracking-tight text-ink">{draft.stages.length}</p>
              <p class="ds-caption text-mute">{tr('ai.summaryStages')}</p>
            </div>
            <span class="h-10 w-px bg-hairline"></span>
            <div class="text-center">
              <p class="text-xl sm:text-2xl font-extrabold tracking-tight text-ink">{totalChecklists}</p>
              <p class="ds-caption text-mute">{tr('ai.summaryChecklists')}</p>
            </div>
            <span class="h-10 w-px bg-hairline"></span>
            <div class="text-center">
              <p class="text-xl sm:text-2xl font-extrabold tracking-tight text-ink">{totalActions}</p>
              <p class="ds-caption text-mute">{tr('ai.summaryActions')}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Stage columns -->
      <div class="flex gap-4 overflow-x-auto pb-3">
        {#each draft.stages as stage, index}
          <article class="w-72 shrink-0 rounded-card bg-lane p-5 space-y-4">
            <!-- Stage header -->
            <div class="space-y-2">
              <div class="flex items-center gap-2.5">
                <span class="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-on-primary text-[12px] font-bold">
                  {index + 1}
                </span>
                <h3 class="ds-label font-bold text-ink leading-tight">{stage.name}</h3>
              </div>

              <!-- Stage feature badges -->
              {#if stage.onReplyNotify || stage.overdueReminderHours || stage.autoMoveOnComplete}
                <div class="flex flex-wrap gap-1.5 pl-9">
                  {#if stage.autoMoveOnComplete}
                    <Badge tone="done" variant="soft" class="text-[10px]">
                      <HugeiconsIcon icon={Forward02Icon} size={12} strokeWidth={1.8} />
                      {tr('ai.autoMove')}
                    </Badge>
                  {/if}
                  {#if stage.onReplyNotify}
                    <Badge tone="progress" variant="soft" class="text-[10px]">
                      <HugeiconsIcon icon={MessageIncoming02Icon} size={12} strokeWidth={1.8} />
                      {tr('setup.replyNotify')}
                    </Badge>
                  {/if}
                  {#if stage.overdueReminderHours}
                    <Badge tone="queued" variant="soft" class="text-[10px]">
                      {tr('setup.reminder', { hours: stage.overdueReminderHours })}
                    </Badge>
                  {/if}
                </div>
              {/if}
            </div>

            <!-- Checklist items -->
            <div class="space-y-2">
              {#each stage.checklists as item}
                <div class="rounded-lg bg-card p-3.5 shadow-card">
                  <div class="flex items-start gap-2">
                    <span class="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-status-done-soft text-status-done-ink">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} strokeWidth={2} />
                    </span>
                    <p class="flex-1 text-[13px] font-semibold leading-snug text-ink">{item.label}</p>
                  </div>
                  <div class="mt-2 flex flex-wrap gap-1.5 pl-6">
                    <Badge tone={item.required ? 'urgent' : 'idle'} variant="soft" class="text-[10px]">
                      {item.required ? tr('common.required') : tr('common.optional')}
                    </Badge>
                    {#if item.deadlineHours}
                      <Badge tone="warning" variant="soft" class="text-[10px]">
                        <HugeiconsIcon icon={Clock02Icon} size={12} strokeWidth={1.8} />
                        {tr('ai.deadline', { hours: item.deadlineHours })}
                      </Badge>
                    {/if}
                    {#if item.action?.kind && item.action.kind !== 'none'}
                      <Badge tone="progress" variant="soft" class="text-[10px]">
                        {tr('setup.waAction', { kind: item.action.kind })}
                      </Badge>
                    {/if}
                  </div>
                  {#if item.action?.messageTemplate}
                    <div class="mt-2.5 rounded-md bg-canvas-sunken px-3 py-2 pl-6">
                      <p class="ds-caption line-clamp-3 text-mute">{item.action.messageTemplate}</p>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </article>
        {/each}
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
        <Button variant="secondary" onclick={() => (step = 1)}>
          <span>{tr('ai.editPrompt')}</span>
        </Button>
        <Button variant="primary" loading={saving} onclick={saveDraft} size="lg">
          <HugeiconsIcon icon={KanbanIcon} size={18} strokeWidth={1.8} />
          <span>{tr('ai.saveWorkflow')}</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} />
        </Button>
      </div>
    </section>
  {:else}
    <!-- Loading state -->
    <div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div class="space-y-4">
        <div class="flex items-center gap-3 rounded-card border border-hairline bg-card p-5 shadow-card">
          <span class="grid size-10 place-items-center rounded-full bg-primary-soft text-primary">
            <HugeiconsIcon icon={AiMagicIcon} size={20} strokeWidth={1.8} class="animate-pulse" />
          </span>
          <div class="space-y-2">
            <Skeleton shape="rect" class="h-4 w-48 rounded-full" />
            <Skeleton shape="rect" class="h-3 w-64 rounded-full" />
          </div>
        </div>
        <Skeleton shape="rect" class="h-48 w-full rounded-card" />
        <Skeleton shape="rect" class="h-32 w-full rounded-card" />
      </div>
      <div class="space-y-4">
        <Skeleton shape="rect" class="h-40 w-full rounded-card" />
        <Skeleton shape="rect" class="h-40 w-full rounded-card" />
      </div>
    </div>
  {/if}
</div>
