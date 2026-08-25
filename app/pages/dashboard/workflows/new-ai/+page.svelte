<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, ApiError, type ApiWorkflowDraft } from '$lib/api/client';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Badge, Button, Input, Skeleton, Textarea } from '$lib/components/atoms/index.js';
  import { Breadcrumb, FormField, Stepper, toast } from '$lib/components/molecules/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { AiMagicIcon, ArrowRight01Icon, KanbanIcon } from '@hugeicons/core-free-icons';
  import type { LayoutData } from '../../$types';

  let { data }: { data: LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  let step = $state(1);
  let prompt = $state('');
  let generating = $state(false);
  let saving = $state(false);
  let provider = $state<'openai' | 'heuristic'>('heuristic');
  let draft = $state<ApiWorkflowDraft | null>(null);

  const steps = $derived([
    { id: 'prompt', label: tr('ai.promptStep') },
    { id: 'preview', label: tr('ai.previewStep') },
    { id: 'done', label: tr('ai.saveStep') }
  ]);

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

<div class="space-y-8">
  <header class="space-y-4">
    <Breadcrumb
      items={[
        { label: tr('common.workflows'), href: '/dashboard/workflows' },
        { label: tr('ai.title') }
      ]}
      showHomeIcon
    />
    <div>
      <h1 class="ds-page-title text-ink">{tr('ai.title')}</h1>
      <p class="ds-caption mt-1 text-mute max-w-2xl">{tr('ai.description')}</p>
    </div>
    <Stepper {steps} current={step - 1} class="max-w-xl" />
  </header>

  {#if step === 1}
    <section class="rounded-2xl border border-hairline bg-card p-6 shadow-card space-y-4 max-w-2xl">
      <FormField
        label={tr('ai.promptLabel')}
        helper={tr('ai.promptHelper')}
        required
      >
        {#snippet control(args)}
          <Textarea
            {...args}
            bind:value={prompt}
            rows={5}
            placeholder={tr('ai.promptPlaceholder')}
          />
        {/snippet}
      </FormField>

      <div class="flex flex-wrap gap-2">
        <Button variant="secondary" href="/dashboard/workflows">{tr('common.cancel')}</Button>
        <Button variant="primary" loading={generating} disabled={!prompt.trim()} onclick={generateDraft}>
          <HugeiconsIcon icon={AiMagicIcon} size={18} strokeWidth={1.8} />
          <span>{tr('ai.generate')}</span>
        </Button>
      </div>
    </section>
  {:else if step === 2 && draft}
    <section class="space-y-4">
      <div class="flex flex-wrap items-center gap-2">
        <Badge tone={provider === 'openai' ? 'progress' : 'queued'} variant="soft">
          {provider === 'openai' ? 'OpenAI' : tr('ai.heuristic')}
        </Badge>
        <span class="ds-caption text-mute">{tr('ai.previewHint')}</span>
      </div>

      <div class="rounded-2xl border border-hairline bg-card p-5 shadow-card">
        <h2 class="ds-section-title text-ink">{draft.name}</h2>
        <p class="ds-caption text-mute mt-1">{tr('ai.stageCount', { stages: draft.stages.length, checklists: draft.stages.reduce((n, s) => n + s.checklists.length, 0) })}</p>
      </div>

      <div class="flex gap-4 overflow-x-auto pb-2">
        {#each draft.stages as stage, index}
          <article class="w-72 shrink-0 rounded-2xl bg-lane p-4 space-y-3">
            <div class="flex items-center gap-2">
              <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-card text-[11px] font-bold text-ink-soft">
                {index + 1}
              </span>
              <h3 class="ds-label font-bold text-ink">{stage.name}</h3>
            </div>
            {#if stage.onReplyNotify || stage.overdueReminderHours}
              <div class="flex flex-wrap gap-1">
                {#if stage.onReplyNotify}
                  <Badge tone="progress" variant="soft" class="text-[10px]">{tr('setup.replyNotify')}</Badge>
                {/if}
                {#if stage.overdueReminderHours}
                  <Badge tone="queued" variant="soft" class="text-[10px]">{tr('setup.reminder', { hours: stage.overdueReminderHours })}</Badge>
                {/if}
              </div>
            {/if}
            <div class="space-y-2">
              {#each stage.checklists as item}
                <div class="rounded-xl bg-card p-3 shadow-card text-sm">
                  <p class="font-semibold text-ink">{item.label}</p>
                  <div class="mt-1 flex flex-wrap gap-1">
                    <Badge tone={item.required ? 'urgent' : 'idle'} variant="soft" class="text-[10px]">
                      {item.required ? tr('common.required') : tr('common.optional')}
                    </Badge>
                    {#if item.action?.kind && item.action.kind !== 'none'}
                      <Badge tone="progress" variant="soft" class="text-[10px]">{tr('setup.waAction', { kind: item.action.kind })}</Badge>
                    {/if}
                  </div>
                  {#if item.action?.messageTemplate}
                    <p class="ds-caption mt-2 text-mute line-clamp-3">{item.action.messageTemplate}</p>
                  {/if}
                </div>
              {/each}
            </div>
          </article>
        {/each}
      </div>

      <div class="flex flex-wrap gap-2 pt-2">
        <Button variant="secondary" onclick={() => (step = 1)}>{tr('ai.editPrompt')}</Button>
        <Button variant="primary" loading={saving} onclick={saveDraft}>
          <HugeiconsIcon icon={KanbanIcon} size={18} strokeWidth={1.8} />
          <span>{tr('ai.saveWorkflow')}</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} />
        </Button>
      </div>
    </section>
  {:else}
    <div class="space-y-3 max-w-xl">
      <Skeleton shape="rect" class="h-24 w-full rounded-2xl" />
      <Skeleton shape="rect" class="h-40 w-full rounded-2xl" />
    </div>
  {/if}
</div>
