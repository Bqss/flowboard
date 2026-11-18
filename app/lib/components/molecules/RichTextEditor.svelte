<script lang="ts">
	import BoldIcon from '@lucide/svelte/icons/bold';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CodeIcon from '@lucide/svelte/icons/code';
	import EraserIcon from '@lucide/svelte/icons/eraser';
	import ImageIcon from '@lucide/svelte/icons/image';
	import ItalicIcon from '@lucide/svelte/icons/italic';
	import LinkIcon from '@lucide/svelte/icons/link';
	import ListIcon from '@lucide/svelte/icons/list';
	import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';
	import StrikethroughIcon from '@lucide/svelte/icons/strikethrough';
	import TypeIcon from '@lucide/svelte/icons/type';
	import { DropdownMenu as MenuPrimitive } from 'bits-ui';
	import Portal from '$lib/components/atoms/Portal.svelte';
	import { cn } from '$lib/utils.js';
	import { sanitizeRichText } from '$lib/rich-text.js';

	type HeadingOption = { tag: string; label: string; shortcut: string };

	type Props = {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		autofocus?: boolean;
		class?: string;
		onblur?: () => void;
		onimageupload?: (file: File) => Promise<string | null>;
	};

	let {
		value = $bindable(''),
		placeholder = 'Tambahkan deskripsi yang lebih detail…',
		disabled = false,
		autofocus = false,
		class: className,
		onblur,
		onimageupload
	}: Props = $props();

	let editor = $state<HTMLDivElement | null>(null);
	let imageInput = $state<HTMLInputElement | null>(null);
	let activeHeading = $state('Normal text');
	let imageUploading = $state(false);
	let savedSelection = $state<Range | null>(null);

	const headingOptions: HeadingOption[] = [
		{ tag: 'p', label: 'Normal text', shortcut: '⌘⌥0' },
		{ tag: 'h1', label: 'Heading 1', shortcut: '⌘⌥1' },
		{ tag: 'h2', label: 'Heading 2', shortcut: '⌘⌥2' },
		{ tag: 'h3', label: 'Heading 3', shortcut: '⌘⌥3' },
		{ tag: 'h4', label: 'Heading 4', shortcut: '⌘⌥4' },
		{ tag: 'h5', label: 'Heading 5', shortcut: '⌘⌥5' },
		{ tag: 'h6', label: 'Heading 6', shortcut: '⌘⌥6' }
	];

	function syncValue(blur = false) {
		value = sanitizeRichText(editor?.innerHTML ?? '');
		if (blur) onblur?.();
	}

	function saveSelection() {
		const selection = window.getSelection();
		if (!editor || !selection?.rangeCount) return;
		const range = selection.getRangeAt(0);
		if (editor.contains(range.commonAncestorContainer)) {
			savedSelection = range.cloneRange();
		}
	}

	function restoreSelection() {
		if (!savedSelection) return;
		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(savedSelection);
	}
	function insertImage(src: string) {
		if (!editor) return;
		restoreSelection();
		editor.focus();
		const selection = window.getSelection();
		let range = selection?.rangeCount ? selection.getRangeAt(0) : null;
		if (!range || !editor.contains(range.commonAncestorContainer)) {
			range = document.createRange();
			range.selectNodeContents(editor);
			range.collapse(false);
		}
		range.deleteContents();
		const image = document.createElement('img');
		image.src = src;
		image.alt = 'Gambar';
		range.insertNode(image);
		range.setStartAfter(image);
		range.collapse(true);
		selection?.removeAllRanges();
		selection?.addRange(range);
		savedSelection = range.cloneRange();
	}

	function run(command: string, commandValue?: string) {
		if (disabled || !editor) return;
		restoreSelection();
		editor.focus();
		document.execCommand(command, false, commandValue);
		syncValue();
	}

	function runBlock(tag: string, label: string) {
		activeHeading = label;
		run('formatBlock', tag);
	}

	function addLink() {
		if (disabled) return;
		restoreSelection();
		editor?.focus();
		const url = window.prompt('Masukkan URL');
		if (url?.trim()) run('createLink', url.trim());
	}

	function openImagePicker() {
		if (disabled || !onimageupload || imageUploading) return;
		saveSelection();
		imageInput?.click();
	}

	async function handleImageSelection(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		input.value = '';
		if (!file || !onimageupload) return;
		if (!file.type.startsWith('image/')) return;

		imageUploading = true;
		try {
			const src = await onimageupload(file);
			if (!src || !editor) return;
			insertImage(src);
			syncValue();
		} finally {
			imageUploading = false;
		}
	}

	async function handlePaste(event: ClipboardEvent) {
		const imageFiles = Array.from(event.clipboardData?.items ?? [])
			.filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
			.map((item) => item.getAsFile())
			.filter((file): file is File => file !== null);

		if (imageFiles.length > 0 && onimageupload) {
			event.preventDefault();
			const text = event.clipboardData?.getData('text/plain') ?? '';
			if (text) document.execCommand('insertText', false, text);
			saveSelection();
			imageUploading = true;
			try {
				for (const file of imageFiles) {
					const src = await onimageupload(file);
					if (src && editor) insertImage(src);
				}
				syncValue();
			} finally {
				imageUploading = false;
			}
			return;
		}

		event.preventDefault();
		const text = event.clipboardData?.getData('text/plain') ?? '';
		document.execCommand('insertText', false, text);
		syncValue();
	}

	$effect(() => {
		if (editor && document.activeElement !== editor) {
			const next = sanitizeRichText(value);
			if (editor.innerHTML !== next) editor.innerHTML = next;
		}
	});

	$effect(() => {
		if (autofocus && editor && !disabled) queueMicrotask(() => editor?.focus());
	});
</script>

<div class={cn('relative overflow-visible rounded-card border border-hairline bg-card transition-colors duration-150 hover:border-primary-border focus-within:border-primary focus-within:ring-2 focus-within:ring-[var(--focus)]', className)}>
	<div class="flex flex-wrap items-center gap-1 border-b border-hairline bg-lane/40 p-2">
		<MenuPrimitive.Root>
			<MenuPrimitive.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="rich-toolbar-button rich-toolbar-button--wide min-w-[7.5rem] justify-between gap-1 px-2"
						aria-label="Gaya teks"
						disabled={disabled}
						onmousedown={(event) => { event.preventDefault(); saveSelection(); }}
					>
						<span class="flex items-center gap-1.5"><TypeIcon class="size-4" />{activeHeading}</span>
						<ChevronDownIcon class="size-3.5" />
					</button>
				{/snippet}
			</MenuPrimitive.Trigger>
			<Portal>
				<MenuPrimitive.Content align="start" sideOffset={6} aria-label="Gaya teks" class="rich-toolbar-menu z-[400] w-60">
					{#each headingOptions as option (option.tag)}
						<MenuPrimitive.Item
							class={cn('rich-toolbar-menu-item', activeHeading === option.label && 'bg-primary-soft text-primary-ink')}
							onmousedown={(event: MouseEvent) => { event.preventDefault(); saveSelection(); }}
							onSelect={() => runBlock(option.tag, option.label)}
						>
							<span class={cn('truncate', option.tag === 'p' ? 'text-sm' : 'font-bold')}><span class="mr-2 text-mute">{option.tag === 'p' ? 'Tt' : option.tag.toUpperCase()}</span>{option.label}</span>
							<kbd>{option.shortcut}</kbd>
						</MenuPrimitive.Item>
					{/each}
				</MenuPrimitive.Content>
			</Portal>
		</MenuPrimitive.Root>

		<span class="mx-1 h-5 w-px bg-hairline"></span>

		<button type="button" class="rich-toolbar-button" aria-label="Tebal" disabled={disabled} onmousedown={(event) => { event.preventDefault(); saveSelection(); }} onclick={() => run('bold')}>
			<BoldIcon class="size-4" />
		</button>

		<MenuPrimitive.Root>
			<MenuPrimitive.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="rich-toolbar-button rich-toolbar-button--wide gap-1 px-2"
						aria-label="Format teks"
						disabled={disabled}
						onmousedown={(event) => { event.preventDefault(); saveSelection(); }}
					>
						<ItalicIcon class="size-4" /><ChevronDownIcon class="size-3.5" />
					</button>
				{/snippet}
			</MenuPrimitive.Trigger>
			<Portal>
				<MenuPrimitive.Content align="start" sideOffset={6} aria-label="Format teks" class="rich-toolbar-menu z-[400] w-52">
					<MenuPrimitive.Item class="rich-toolbar-menu-item" onmousedown={(event: MouseEvent) => { event.preventDefault(); saveSelection(); }} onSelect={() => run('italic')}><span class="flex items-center gap-3"><ItalicIcon class="size-4" />Italic</span><kbd>⌘I</kbd></MenuPrimitive.Item>
					<MenuPrimitive.Item class="rich-toolbar-menu-item" onmousedown={(event: MouseEvent) => { event.preventDefault(); saveSelection(); }} onSelect={() => run('strikeThrough')}><span class="flex items-center gap-3"><StrikethroughIcon class="size-4" />Strikethrough</span><kbd>⌘⇧S</kbd></MenuPrimitive.Item>
					<MenuPrimitive.Item class="rich-toolbar-menu-item" onmousedown={(event: MouseEvent) => { event.preventDefault(); saveSelection(); }} onSelect={() => run('formatBlock', 'pre')}><span class="flex items-center gap-3"><CodeIcon class="size-4" />Code</span><kbd>⌘⇧M</kbd></MenuPrimitive.Item>
					<div class="my-1 border-t border-hairline"></div>
					<MenuPrimitive.Item class="rich-toolbar-menu-item text-mute" onmousedown={(event: MouseEvent) => { event.preventDefault(); saveSelection(); }} onSelect={() => { run('removeFormat'); runBlock('p', 'Normal text'); }}><span class="flex items-center gap-3"><EraserIcon class="size-4" />Clear formatting</span><kbd>⌘\\</kbd></MenuPrimitive.Item>
				</MenuPrimitive.Content>
			</Portal>
		</MenuPrimitive.Root>

		<span class="mx-1 h-5 w-px bg-hairline"></span>

		<MenuPrimitive.Root>
			<MenuPrimitive.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="rich-toolbar-button rich-toolbar-button--wide gap-1 px-2"
						aria-label="Daftar"
						disabled={disabled}
						onmousedown={(event) => { event.preventDefault(); saveSelection(); }}
					>
						<ListIcon class="size-4" /><ChevronDownIcon class="size-3.5" />
					</button>
				{/snippet}
			</MenuPrimitive.Trigger>
			<Portal>
				<MenuPrimitive.Content align="start" sideOffset={6} aria-label="Daftar" class="rich-toolbar-menu z-[400] w-52">
					<MenuPrimitive.Item class="rich-toolbar-menu-item" onmousedown={(event: MouseEvent) => { event.preventDefault(); saveSelection(); }} onSelect={() => run('insertUnorderedList')}><span class="flex items-center gap-3"><ListIcon class="size-4" />Bullet list</span><kbd>⌘⇧8</kbd></MenuPrimitive.Item>
					<MenuPrimitive.Item class="rich-toolbar-menu-item" onmousedown={(event: MouseEvent) => { event.preventDefault(); saveSelection(); }} onSelect={() => run('insertOrderedList')}><span class="flex items-center gap-3"><ListOrderedIcon class="size-4" />Numbered list</span><kbd>⌘⇧7</kbd></MenuPrimitive.Item>
				</MenuPrimitive.Content>
			</Portal>
		</MenuPrimitive.Root>

		<button type="button" class="rich-toolbar-button" aria-label="Tautan" disabled={disabled} onmousedown={(event) => { event.preventDefault(); saveSelection(); }} onclick={addLink}>
			<LinkIcon class="size-4" />
		</button>

		{#if onimageupload}
			<button type="button" class="rich-toolbar-button" aria-label="Tambah gambar" disabled={disabled || imageUploading} onmousedown={(event) => { event.preventDefault(); saveSelection(); }} onclick={openImagePicker}>
				<ImageIcon class="size-4" />
			</button>
		{/if}

	</div>

	<input bind:this={imageInput} type="file" accept="image/*" class="hidden" onchange={handleImageSelection} />
	<div
		bind:this={editor}
		class="min-h-48 p-4 text-sm leading-6 text-ink outline-none focus-visible:outline-none empty:before:text-mute empty:before:content-[attr(data-placeholder)]"
		contenteditable={!disabled}
		data-placeholder={placeholder}
		oninput={() => syncValue()}
		onblur={() => syncValue(true)}
		onpaste={handlePaste}
		role="textbox"
		aria-multiline="true"
		aria-label={placeholder}
	></div>
</div>

<style>
	:global(.rich-toolbar-button) {
		display: inline-flex;
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		padding: 0;
		border-radius: var(--radius-xs);
		color: var(--color-mute);
		font-size: 0.875rem;
		transition: background-color 150ms, color 150ms;
	}

	:global(.rich-toolbar-button--wide) {
		width: auto;
		padding-right: 0.5rem;
		padding-left: 0.5rem;
	}

	:global(.rich-toolbar-button > svg) {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	:global(.rich-toolbar-button:hover:not(:disabled)) {
		background: var(--color-card);
		color: var(--color-ink);
	}

	:global(.rich-toolbar-button:focus-visible),
	:global(.rich-toolbar-menu-item:focus-visible) {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}

	:global(.rich-toolbar-button:disabled) {
		cursor: not-allowed;
		opacity: 0.5;
	}

	:global(.rich-toolbar-menu) {
		border: 1px solid var(--color-hairline);
		border-radius: var(--radius-lg);
		background: var(--color-card);
		padding: 0.375rem;
		box-shadow: var(--shadow-popover);
	}

	:global(.rich-toolbar-menu-item) {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border-radius: var(--radius-sm);
		padding: 0.625rem 0.75rem;
		color: var(--color-ink-soft);
		text-align: left;
		font-size: 0.875rem;
		transition: background-color 150ms, color 150ms;
	}

	:global(.rich-toolbar-menu-item:hover) {
		background: var(--color-canvas-sunken);
		color: var(--color-ink);
	}

	:global(.rich-toolbar-menu-item kbd) {
		flex-shrink: 0;
		border-radius: var(--radius-xs);
		background: var(--color-canvas-sunken);
		padding: 0.125rem 0.375rem;
		color: var(--color-mute);
		font-size: 0.6875rem;
	}

	:global(.rich-toolbar-menu-item span) {
		min-width: 0;
	}

	:global([contenteditable='true'] h1),
	:global([contenteditable='true'] h2),
	:global([contenteditable='true'] h3),
	:global([contenteditable='true'] h4),
	:global([contenteditable='true'] h5),
	:global([contenteditable='true'] h6) {
		margin: 0.75rem 0 0.5rem;
		color: var(--color-ink);
		font-weight: 700;
		line-height: 1.25;
	}

	:global([contenteditable='true'] h1) {
		font-size: 1.5rem;
	}

	:global([contenteditable='true'] h2) {
		font-size: 1.125rem;
	}

	:global([contenteditable='true'] h3) {
		font-size: 1rem;
	}

	:global([contenteditable='true'] h4) {
		font-size: 0.9375rem;
	}

	:global([contenteditable='true'] h5) {
		font-size: 0.875rem;
	}

	:global([contenteditable='true'] h6) {
		font-size: 0.8125rem;
	}

	:global([contenteditable='true'] a) {
		color: var(--color-primary-ink);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	:global([contenteditable='true'] img) {
		display: block;
		max-width: min(100%, 40rem);
		max-height: 28rem;
		object-fit: contain;
		height: auto;
		margin: 0.5rem 0;
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-hairline);
	}

	:global([contenteditable='true'] pre) {
		overflow-x: auto;
		border-radius: var(--radius-sm);
		background: var(--color-canvas-sunken);
		padding: 0.75rem 1rem;
		font-family: monospace;
		white-space: pre-wrap;
	}
</style>

