<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Button } from '$lib/components/atoms/index.js';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import XIcon from '@lucide/svelte/icons/x';
	import { cardShellClass } from './shared.js';

	type FilePreview = { file: File; url?: string };

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		files?: FilePreview[];
		accept?: string;
		multiple?: boolean;
		maxSizeMb?: number;
		disabled?: boolean;
		onchange?: (files: File[]) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		files = $bindable([]),
		accept,
		multiple = true,
		maxSizeMb = 10,
		disabled = false,
		onchange,
		class: className,
		...rest
	}: Props = $props();

	let dragging = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);

	function add(list: FileList | File[]) {
		const next = Array.from(list).filter((f) => f.size <= maxSizeMb * 1024 * 1024);
		const mapped = next.map((file) => ({
			file,
			url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
		}));
		files = multiple ? [...files, ...mapped] : mapped.slice(0, 1);
		onchange?.(files.map((f) => f.file));
	}

	function remove(index: number) {
		const removed = files[index];
		if (removed?.url) URL.revokeObjectURL(removed.url);
		files = files.filter((_, i) => i !== index);
		onchange?.(files.map((f) => f.file));
	}

	function ondrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		if (disabled || !event.dataTransfer?.files.length) return;
		add(event.dataTransfer.files);
	}
</script>

<div bind:this={ref} class={cn('space-y-4', className)} {...rest}>
	<div
		role="button"
		tabindex="0"
		ondragover={(e) => {
			e.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		{ondrop}
		onclick={() => inputEl?.click()}
		onkeydown={(e) => e.key === 'Enter' && inputEl?.click()}
		class={cn(
			cardShellClass,
			'flex cursor-pointer flex-col items-center justify-center border-2 border-dashed px-6 py-10 text-center transition-colors',
			dragging ? 'border-primary bg-primary-soft/40' : 'border-hairline hover:border-primary-border hover:bg-lane/50',
			disabled && 'pointer-events-none opacity-60'
		)}
	>
		<UploadIcon class="mb-3 size-8 text-primary" />
		<p class="ds-body font-semibold text-ink">Seret file ke sini atau klik untuk unggah</p>
		<p class="ds-caption mt-1 text-mute">Maks. {maxSizeMb}MB per file</p>
		<input bind:this={inputEl} type="file" class="hidden" {accept} {multiple} {disabled} onchange={(e) => e.currentTarget.files && add(e.currentTarget.files)} />
	</div>

	{#if files.length}
		<ul class="grid gap-3 sm:grid-cols-2">
			{#each files as item, i (item.file.name + i)}
				<li class={cn(cardShellClass, 'flex items-center gap-3 p-3')}>
					{#if item.url}
						<img src={item.url} alt="" class="size-12 rounded-md object-cover" />
					{:else}
						<div class="grid size-12 place-items-center rounded-md bg-primary-soft text-primary">
							<UploadIcon class="size-5" />
						</div>
					{/if}
					<div class="min-w-0 flex-1">
						<p class="ds-body truncate font-medium text-ink">{item.file.name}</p>
						<p class="ds-caption text-mute">{(item.file.size / 1024).toFixed(1)} KB</p>
					</div>
					<Button variant="ghost" size="sm" onclick={() => remove(i)} aria-label="Hapus file">
						<XIcon class="size-4" />
					</Button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
