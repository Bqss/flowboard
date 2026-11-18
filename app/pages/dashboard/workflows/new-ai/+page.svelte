<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, ApiError, type ApiWorkflowDraft, type ApiWorkflowDraftImage } from '$lib/api/client';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Badge, Button, Input, Skeleton, Textarea } from '$lib/components/atoms/index.js';
  import { Breadcrumb, FormField, SelectMenu, Stepper, toast } from '$lib/components/molecules/index.js';
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
    Clock02Icon,
    AlertCircleIcon,
    Calendar03Icon,
    RepeatIcon,
    Image01Icon,
    Cancel01Icon
  } from '@hugeicons/core-free-icons';

  let { data }: { data: import('../../$types').LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  let step = $state(1);
  let prompt = $state('');
  let generating = $state(false);
  let saving = $state(false);
  let draft = $state<ApiWorkflowDraft | null>(null);
  let aiDraftLabels = $state<string[]>([]);
  type PromptImage = ApiWorkflowDraftImage & { id: string; name: string };
  const MAX_PROMPT_IMAGES = 3;
  const MAX_PROMPT_IMAGE_BYTES = 4 * 1024 * 1024;
  let promptImageInput = $state<HTMLInputElement | null>(null);
  let promptImages = $state<PromptImage[]>([]);
  let promptImageError = $state<string | null>(null);

  const promptCanGenerate = $derived(prompt.trim().length > 0 || promptImages.length > 0);

  function promptImageId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async function addPromptImage(file: File) {
    if (promptImages.length >= MAX_PROMPT_IMAGES) {
      promptImageError = tr('ai.imageLimit');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      promptImageError = tr('ai.imageTypeError');
      return;
    }
    if (file.size > MAX_PROMPT_IMAGE_BYTES) {
      promptImageError = tr('ai.imageSizeError');
      return;
    }

    promptImageError = null;
    await new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!dataUrl) {
          promptImageError = tr('ai.imageReadError');
          resolve();
          return;
        }
        const extension = file.type.split('/')[1] ?? 'png';
        promptImages = [
          ...promptImages,
          {
            id: promptImageId(),
            name: file.name || `pasted-image.${extension}`,
            mimeType: file.type as ApiWorkflowDraftImage['mimeType'],
            dataUrl
          }
        ];
        resolve();
      };
      reader.onerror = () => {
        promptImageError = tr('ai.imageReadError');
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }

  async function handlePromptImageSelection(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    for (const file of files) await addPromptImage(file);
  }

  async function handlePromptPaste(event: ClipboardEvent) {
    const imageFiles = Array.from(event.clipboardData?.items ?? [])
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (imageFiles.length === 0) return;

    if (!(event.clipboardData?.getData('text/plain') ?? '').trim()) {
      event.preventDefault();
    }
    for (const file of imageFiles) await addPromptImage(file);
  }

  function removePromptImage(id: string) {
    promptImages = promptImages.filter((image) => image.id !== id);
    promptImageError = null;
  }

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
  type PreviewChecklist = ApiWorkflowDraft['stages'][number]['checklists'][number];
  type PreviewGroup = {
    name: string;
    items: PreviewChecklist[];
    children: PreviewGroup[];
  };

  function buildPreviewChecklistTree(items: PreviewChecklist[]) {
    const root: PreviewGroup = { name: '', items: [], children: [] };
    for (const item of items) {
      const path = item.groupPath?.filter(Boolean) ?? [];
      let current = root;
      for (const name of path) {
        let child = current.children.find((group) => group.name === name);
        if (!child) {
          child = { name, items: [], children: [] };
          current.children.push(child);
        }
        current = child;
      }
      current.items.push(item);
    }
    return root;
  }

  function previewGroupItemCount(group: PreviewGroup): number {
    return group.items.length + group.children.reduce((total, child) => total + previewGroupItemCount(child), 0);
  }


  function useExample(text: string) {
    prompt = text;
  }

  function updateDraft(patch: Partial<ApiWorkflowDraft>) {
    if (draft) draft = { ...draft, ...patch };
  }

  async function generateDraft() {
    if (!promptCanGenerate || !data.workspace?.id) return;
    generating = true;
    try {
      const images = promptImages.map(({ mimeType, dataUrl }) => ({ mimeType, dataUrl }));
      const res = await api.generateWorkflowDraft(data.workspace.id, {
        prompt: prompt.trim(),
        images: images.length > 0 ? images : undefined
      });
      draft = res.draft;
      aiDraftLabels = (res.draft.labels && res.draft.labels.length > 0)
        ? [...res.draft.labels]
        : (res.draft.label ? [res.draft.label] : []);
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
      draft = { ...draft, labels: aiDraftLabels, label: aiDraftLabels[0] ?? null };
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

<svelte:head><title>{tr('ai.title')} — actjom</title></svelte:head>

<div class="space-y-6 sm:space-y-8">
  <header class="space-y-5 sm:space-y-6">
    <div class="space-y-2">
      <Breadcrumb
        items={[
          { label: tr('common.workflows'), href: '/dashboard/workflows' },
          { label: tr('ai.title') }
        ]}
        showHomeIcon
      />
      <div class="space-y-1">
        <h1 class="ds-page-title text-ink">{tr('ai.title')}</h1>
        <p class="ds-caption max-w-xl text-mute">{tr('ai.description')}</p>
      </div>
    </div>
    <Stepper {steps} current={step - 1} variant="compact" class="mx-auto max-w-3xl" />
  </header>

  {#if step === 1}
    <!-- Two-column: prompt card + tips sidebar -->
    <div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <!-- Prompt card -->
      <section class="rounded-card border border-hairline bg-card shadow-card">
        <div class="space-y-6 p-5 sm:p-8">
          <div class="space-y-0.5">
            <p class="ds-label text-ink">{tr('ai.promptLabel')}</p>
            <p class="ds-caption text-mute">{tr('ai.promptHelper')}</p>
          </div>

          <FormField required>
            {#snippet control(args)}
              <Textarea
                {...args}
                bind:value={prompt}
                rows={6}
                class="text-sm leading-relaxed"
                placeholder={tr('ai.promptPlaceholder')}
                onpaste={handlePromptPaste}
              />
            {/snippet}
          </FormField>
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onclick={() => promptImageInput?.click()}
                disabled={promptImages.length >= MAX_PROMPT_IMAGES}
              >
                <HugeiconsIcon icon={Image01Icon} size={16} strokeWidth={1.8} />
                {tr('ai.attachImage')}
              </Button>
              <span class="ds-caption text-faint">{tr('ai.imageHint')}</span>
            </div>
            <input
              bind:this={promptImageInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              class="sr-only"
              onchange={handlePromptImageSelection}
            />

            {#if promptImages.length > 0}
              <div class="flex flex-wrap gap-3">
                {#each promptImages as image (image.id)}
                  <div class="group relative w-40 overflow-hidden rounded-md border border-hairline bg-canvas-sunken">
                    <img src={image.dataUrl} alt={image.name} class="aspect-[4/3] w-full object-cover" />
                    <div class="flex items-center gap-2 px-2 py-1.5">
                      <span class="min-w-0 flex-1 truncate text-tiny text-mute" title={image.name}>{image.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-7 shrink-0 text-mute hover:text-status-urgent"
                        aria-label={tr('ai.removeImage')}
                        onclick={() => removePromptImage(image.id)}
                      >
                        <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.8} />
                      </Button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

            {#if promptImageError}
              <p class="ds-caption text-status-urgent" role="alert">{promptImageError}</p>
            {/if}
          </div>


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
                  class="group flex items-start gap-2.5 rounded-md border border-hairline bg-canvas-sunken px-3.5 py-2.5 text-left transition-all hover:border-primary-border hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15"
                >
                  <HugeiconsIcon
                    icon={SparklesIcon}
                    size={16}
                    strokeWidth={1.8}
                    class="mt-0.5 shrink-0 text-faint transition-colors group-hover:text-primary"
                  />
                  <span class="ds-body text-meta leading-snug text-body transition-colors group-hover:text-ink">{ex}</span>
                </button>
              {/each}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
            <Button variant="ghost" href="/dashboard/workflows">{tr('common.cancel')}</Button>
            <Button variant="primary" loading={generating} disabled={!promptCanGenerate} onclick={generateDraft} size="lg">
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
            <span class="grid size-8 place-items-center rounded-md bg-status-progress-soft text-status-progress-ink">
              <HugeiconsIcon icon={BulbIcon} size={16} strokeWidth={1.8} />
            </span>
            <p class="ds-label text-ink">{tr('ai.tipsTitle')}</p>
          </div>
          <ul class="space-y-2.5">
            {#each tips as tip}
              <li class="flex items-start gap-2">
                <span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-status-progress"></span>
                <span class="ds-body text-meta leading-snug text-body">{tip}</span>
              </li>
            {/each}
          </ul>
        </div>

        <div class="rounded-card border border-hairline bg-card p-5 sm:p-6 shadow-card space-y-3">
          <div class="flex items-center gap-2">
            <span class="grid size-8 place-items-center rounded-md bg-primary-soft text-primary">
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
                <span class="ds-body text-meta leading-snug text-body">{item.text}</span>
              </li>
            {/each}
          </ul>
        </div>

        <div class="rounded-card border border-hairline bg-card p-5 sm:p-6 shadow-card space-y-3">
          <div class="flex items-center gap-2">
            <span class="grid size-8 place-items-center rounded-md bg-primary-soft text-primary">
              <HugeiconsIcon icon={SmartPhone01Icon} size={16} strokeWidth={1.8} />
            </span>
            <p class="ds-label text-ink">{tr('ai.senderNumber')}</p>
          </div>
          {#if data.user?.phone}
            <p class="ds-body text-meta font-semibold text-ink">{data.user.phone}</p>
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
            <span class="grid size-11 place-items-center rounded-md bg-primary-soft text-primary">
              <HugeiconsIcon icon={KanbanIcon} size={22} strokeWidth={1.8} />
            </span>
            <div class="space-y-1">
              <h2 class="ds-section-title text-ink">{draft.name}</h2>
              <p class="ds-caption text-mute">{tr('ai.previewHint')}</p>
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

        <!-- Config fields -->
        <div class="mt-5 grid gap-4 border-t border-hairline pt-5 sm:grid-cols-2 lg:grid-cols-4">

          <FormField label={tr('setup.urgency')} helper={tr('setup.urgencyHelper')}>
            {#snippet control(args)}
              <SelectMenu
                {...args}
                value={draft!.urgency ?? 'medium'}
                options={[
                  { value: 'high', label: tr('setup.urgencyHigh') },
                  { value: 'medium', label: tr('setup.urgencyMedium') },
                  { value: 'low', label: tr('setup.urgencyLow') }
                ]}
                onchange={(v) => updateDraft({ urgency: v as 'high' | 'medium' | 'low' })}
              />
            {/snippet}
          </FormField>

          <FormField label={tr('setup.deadline')} helper={tr('setup.deadlineHelper')}>
            {#snippet control()}
              <div class="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  max="365"
                  placeholder={tr('setup.deadlineValue')}
                  value={draft!.deadlineValue ?? ''}
                  oninput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    updateDraft({ deadlineValue: v ? Number(v) : null });
                  }}
                />
                <div class="w-28 shrink-0">
                  <SelectMenu
                    value={draft!.deadlineUnit ?? 'days'}
                    options={[
                      { value: 'hours', label: tr('setup.deadlineUnitHours') },
                      { value: 'days', label: tr('setup.deadlineUnitDays') }
                    ]}
                    onchange={(v) => updateDraft({ deadlineUnit: v as 'hours' | 'days' })}
                  />
                </div>
              </div>
            {/snippet}
          </FormField>

          <FormField label={tr('setup.reminderBefore')} helper={tr('setup.reminderHelper')}>
            {#snippet control()}
              <div class="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  max="720"
                  placeholder={tr('setup.reminderValue')}
                  value={draft!.reminderBeforeValue ?? ''}
                  oninput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    updateDraft({ reminderBeforeValue: v ? Number(v) : null });
                  }}
                />
                <div class="w-28 shrink-0">
                  <SelectMenu
                    value={draft!.reminderBeforeUnit ?? 'hours'}
                    options={[
                      { value: 'hours', label: tr('setup.reminderUnitHours') },
                      { value: 'days', label: tr('setup.reminderUnitDays') }
                    ]}
                    onchange={(v) => updateDraft({ reminderBeforeUnit: v as 'hours' | 'days' })}
                  />
                </div>
              </div>
            {/snippet}
          </FormField>

          <FormField label={tr('setup.repeat')} helper={tr('setup.repeatHelper')}>
            {#snippet control(args)}
              <SelectMenu
                {...args}
                value={draft!.repeatRule ?? 'none'}
                options={[
                  { value: 'none', label: tr('setup.repeatNone') },
                  { value: 'daily', label: tr('setup.repeatDaily') },
                  { value: 'weekly', label: tr('setup.repeatWeekly') },
                  { value: 'monthly', label: tr('setup.repeatMonthly') }
                ]}
                onchange={(v) => updateDraft({ repeatRule: v as 'none' | 'daily' | 'weekly' | 'monthly' })}
              />
            {/snippet}
          </FormField>

        </div>
      </div>
      {#snippet previewChecklistItem(item: PreviewChecklist)}
        <div class="rounded-xl border border-hairline bg-card p-3 shadow-xs">
          <div class="flex items-start gap-2">
            <span class="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-status-done-soft text-status-done-ink">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} strokeWidth={2} />
            </span>
            <p class="min-w-0 flex-1 text-meta font-semibold leading-snug text-ink">{item.label}</p>
          </div>
          <div class="mt-2 flex flex-wrap gap-1.5 pl-6">
            <Badge tone={item.required ? 'urgent' : 'idle'} variant="soft" class="px-1.5 py-0.5 text-tiny font-semibold">
              {item.required ? tr('common.required') : tr('common.optional')}
            </Badge>
            {#if item.deadlineHours}
              <Badge tone="warning" variant="soft" class="inline-flex items-center gap-1 px-1.5 py-0.5 text-tiny font-semibold">
                <HugeiconsIcon icon={Clock02Icon} size={11} strokeWidth={1.8} />
                {tr('setup.checklistDeadlineBadge', { hours: item.deadlineHours })}
              </Badge>
            {/if}
            {#if item.action?.kind && item.action.kind !== 'none'}
              <Badge tone="progress" variant="soft" class="px-1.5 py-0.5 text-tiny font-semibold">
                {tr('setup.waAction', { kind: item.action.kind })}
              </Badge>
            {/if}
          </div>
          {#if item.action?.messageTemplate}
            <div class="mt-2.5 rounded-lg bg-canvas-sunken px-3 py-2 pl-6">
              <p class="ds-caption line-clamp-3 text-mute">{item.action.messageTemplate}</p>
            </div>
          {/if}
        </div>
      {/snippet}

      {#snippet previewChecklistGroup(group: PreviewGroup, depth: number)}
        <section class={depth === 0 ? 'space-y-2 rounded-xl border border-hairline bg-card/60 p-2.5' : 'space-y-2 rounded-lg bg-canvas-sunken/60 p-2.5'}>
          <header class="flex items-center justify-between gap-2 px-0.5">
            <h4 class="min-w-0 truncate text-meta font-bold text-ink">{group.name}</h4>
            <span class="shrink-0 text-tiny font-semibold text-mute">{previewGroupItemCount(group)}</span>
          </header>
          <div class={depth > 0 ? 'space-y-2 border-l border-primary/15 pl-2' : 'space-y-2'}>
            {#each group.items as item}
              {@render previewChecklistItem(item)}
            {/each}
            {#each group.children as child}
              {@render previewChecklistGroup(child, depth + 1)}
            {/each}
          </div>
        </section>
      {/snippet}


      <!-- Stage columns -->
      <div class="flex gap-4 overflow-x-auto pb-3">
        {#each draft.stages as stage, index}
          {@const checklistTree = buildPreviewChecklistTree(stage.checklists)}
          <article class="flex w-[19rem] shrink-0 flex-col rounded-2xl border border-hairline bg-lane/70 p-4">
            <header class="space-y-3">
              <div class="flex items-start gap-2.5">
                <span class="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-on-primary text-badge font-bold shadow-xs">
                  {index + 1}
                </span>
                <div class="min-w-0 flex-1">
                  <h3 class="ds-label font-bold leading-tight text-ink">{stage.name}</h3>
                  <p class="mt-1 text-tiny font-medium text-mute">
                    {stage.checklists.length} {tr('ai.summaryChecklists').toLowerCase()}
                  </p>
                </div>
              </div>

              {#if stage.onReplyNotify || stage.overdueReminderHours || stage.autoMoveOnComplete}
                <div class="flex flex-wrap gap-1.5">
                  {#if stage.autoMoveOnComplete}
                    <Badge tone="done" variant="soft" class="px-1.5 py-0.5 text-tiny font-semibold">
                      <HugeiconsIcon icon={Forward02Icon} size={12} strokeWidth={1.8} />
                      {tr('ai.autoMove')}
                    </Badge>
                  {/if}
                  {#if stage.onReplyNotify}
                    <Badge tone="progress" variant="soft" class="px-1.5 py-0.5 text-tiny font-semibold">
                      <HugeiconsIcon icon={MessageIncoming02Icon} size={12} strokeWidth={1.8} />
                      {tr('setup.replyNotify')}
                    </Badge>
                  {/if}
                  {#if stage.overdueReminderHours}
                    <Badge tone="queued" variant="soft" class="px-1.5 py-0.5 text-tiny font-semibold">
                      {tr('setup.reminder', { hours: stage.overdueReminderHours })}
                    </Badge>
                  {/if}
                </div>
              {/if}
            </header>

            <div class="mt-4 space-y-2">
              {#each checklistTree.items as item}
                {@render previewChecklistItem(item)}
              {/each}
              {#each checklistTree.children as group}
                {@render previewChecklistGroup(group, 0)}
              {/each}
              {#if stage.checklists.length === 0}
                <div class="rounded-xl border border-dashed border-hairline bg-card/50 p-5 text-center">
                  <p class="text-meta text-mute">{tr('setup.noChecklist')}</p>
                </div>
              {/if}
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
          <span class="grid size-10 place-items-center rounded-md bg-primary-soft text-primary">
            <HugeiconsIcon icon={AiMagicIcon} size={20} strokeWidth={1.8} class="animate-pulse" />
          </span>
          <div class="space-y-2">
            <Skeleton shape="rect" class="h-4 w-48 rounded-md" />
            <Skeleton shape="rect" class="h-3 w-64 rounded-md" />
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
