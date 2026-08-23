<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, ApiError, type ApiWorkflowDraft } from '$lib/api/client';
  import { Badge, Button, Input, Skeleton, Textarea } from '$lib/components/atoms/index.js';
  import { Breadcrumb, FormField, Stepper, toast } from '$lib/components/molecules/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { AiMagicIcon, ArrowRight01Icon, KanbanIcon } from '@hugeicons/core-free-icons';
  import type { LayoutData } from '../../$types';

  let { data }: { data: LayoutData } = $props();

  let step = $state(1);
  let prompt = $state('');
  let generating = $state(false);
  let saving = $state(false);
  let provider = $state<'openai' | 'heuristic'>('heuristic');
  let draft = $state<ApiWorkflowDraft | null>(null);

  const steps = [
    { id: 'prompt', label: 'Ceritakan proses' },
    { id: 'preview', label: 'Preview draf' },
    { id: 'done', label: 'Simpan' }
  ];

  async function generateDraft() {
    if (!prompt.trim() || !data.workspace?.id) return;
    generating = true;
    try {
      const res = await api.generateWorkflowDraft(data.workspace.id, { prompt: prompt.trim() });
      draft = res.draft;
      provider = res.provider;
      step = 2;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal generate draf workflow.');
    } finally {
      generating = false;
    }
  }

  async function saveDraft() {
    if (!draft || !data.workspace?.id) return;
    saving = true;
    try {
      const res = await api.saveWorkflowDraft(data.workspace.id, draft);
      toast.success('Workflow dari AI berhasil disimpan.');
      await goto(`/dashboard/workflows/${res.workflow.id}/setup`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan workflow.');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>Setup dengan AI — Flowboard</title></svelte:head>

<div class="space-y-8">
  <header class="space-y-4">
    <Breadcrumb
      items={[
        { label: 'Workflows', href: '/dashboard/workflows' },
        { label: 'Setup dengan AI' }
      ]}
      showHomeIcon
    />
    <div>
      <h1 class="ds-page-title text-ink">Setup Workflow dengan AI</h1>
      <p class="ds-caption mt-1 text-mute max-w-2xl">
        Jelaskan proses onboarding dalam 1–2 kalimat. AI akan usulkan stage, checklist, dan template WA — kamu bisa edit setelah simpan.
      </p>
    </div>
    <Stepper {steps} current={step - 1} class="max-w-xl" />
  </header>

  {#if step === 1}
    <section class="rounded-2xl border border-hairline bg-card p-6 shadow-card space-y-4 max-w-2xl">
      <FormField
        label="Ceritakan prosesnya"
        helper="Contoh: Pendaftaran webinar, dari daftar sampai follow-up, reminder H-1 via WA."
        required
      >
        {#snippet control(args)}
          <Textarea
            {...args}
            bind:value={prompt}
            rows={5}
            placeholder="Pendaftaran peserta webinar, dari pending sampai converted, dengan reminder H-1 dan follow-up sore jika belum bales..."
          />
        {/snippet}
      </FormField>

      <div class="flex flex-wrap gap-2">
        <Button variant="secondary" href="/dashboard/workflows">Batal</Button>
        <Button variant="primary" loading={generating} disabled={!prompt.trim()} onclick={generateDraft}>
          <HugeiconsIcon icon={AiMagicIcon} size={18} strokeWidth={1.8} />
          <span>Generate draf</span>
        </Button>
      </div>
    </section>
  {:else if step === 2 && draft}
    <section class="space-y-4">
      <div class="flex flex-wrap items-center gap-2">
        <Badge tone={provider === 'openai' ? 'progress' : 'queued'} variant="soft">
          {provider === 'openai' ? 'OpenAI' : 'Template heuristik'}
        </Badge>
        <span class="ds-caption text-mute">Preview — masih bisa diedit di setup setelah simpan</span>
      </div>

      <div class="rounded-2xl border border-hairline bg-card p-5 shadow-card">
        <h2 class="ds-section-title text-ink">{draft.name}</h2>
        <p class="ds-caption text-mute mt-1">{draft.stages.length} stage · {draft.stages.reduce((n, s) => n + s.checklists.length, 0)} checklist</p>
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
                  <Badge tone="progress" variant="soft" class="text-[10px]">Reply → notify</Badge>
                {/if}
                {#if stage.overdueReminderHours}
                  <Badge tone="queued" variant="soft" class="text-[10px]">Reminder {stage.overdueReminderHours}j</Badge>
                {/if}
              </div>
            {/if}
            <div class="space-y-2">
              {#each stage.checklists as item}
                <div class="rounded-xl bg-card p-3 shadow-card text-sm">
                  <p class="font-semibold text-ink">{item.label}</p>
                  <div class="mt-1 flex flex-wrap gap-1">
                    <Badge tone={item.required ? 'urgent' : 'idle'} variant="soft" class="text-[10px]">
                      {item.required ? 'Wajib' : 'Opsional'}
                    </Badge>
                    {#if item.action?.kind && item.action.kind !== 'none'}
                      <Badge tone="progress" variant="soft" class="text-[10px]">WA {item.action.kind}</Badge>
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
        <Button variant="secondary" onclick={() => (step = 1)}>Ubah prompt</Button>
        <Button variant="primary" loading={saving} onclick={saveDraft}>
          <HugeiconsIcon icon={KanbanIcon} size={18} strokeWidth={1.8} />
          <span>Simpan workflow</span>
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
