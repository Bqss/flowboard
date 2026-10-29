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
	import { cn } from '$lib/utils.js';
	import { sanitizeRichText } from '$lib/rich-text.js';

	type EditorMenu = 'heading' | 'format' | 'list' | null;
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
	let openMenu = $state<EditorMenu>(null);
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
		openMenu = null;
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
		openMenu = null;
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

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') openMenu = null;
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

<svelte:window onclick={(event) => {
	if (editor && !editor.parentElement?.contains(event.target as Node)) openMenu = null;
}} onkeydown={handleWindowKeydown} />

<div class={cn('relative overflow-visible rounded-card border border-hairline bg-card', className)}>
	<div class="flex flex-wrap items-center gap-1 border-b border-hairline bg-lane/40 p-2">
		<div class="relative">
			<button
				type="button"
				class={cn('rich-toolbar-button rich-toolbar-button--wide min-w-[7.5rem] justify-between gap-1 px-2', openMenu === 'heading' && 'bg-primary-soft text-primary-ink')}
				aria-label="Gaya teks"
				aria-haspopup="menu"
				aria-expanded={openMenu === 'heading'}
				disabled={disabled}
				onmousedown={(event) => { event.preventDefault(); saveSelection(); }}
				onclick={() => (openMenu = openMenu === 'heading' ? null : 'heading')}
			>
				<span class="flex items-center gap-1.5"><TypeIcon class="size-4" />{activeHeading}</span>
				<ChevronDownIcon class="size-3.5" />
			</button>
			{#if openMenu === 'heading'}
				<div class="rich-toolbar-menu left-0 w-60" role="menu" aria-label="Gaya teks">
					{#each headingOptions as option (option.tag)}
						<button
							type="button"
							class={cn('rich-toolbar-menu-item', activeHeading === option.label && 'bg-primary-soft text-primary-ink')}
							role="menuitem"
							onmousedown={(event) => { event.preventDefault(); saveSelection(); }}
							onclick={() => runBlock(option.tag, option.label)}
						>
							<span class={cn('truncate', option.tag === 'p' ? 'text-sm' : 'font-bold')}><span class="mr-2 text-mute">{option.tag === 'p' ? 'Tt' : option.tag.toUpperCase()}</span>{option.label}</span>
							<kbd>{option.shortcut}</kbd>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<span class="mx-1 h-5 w-px bg-hairline"></span>

		<button type="button" class="rich-toolbar-button" aria-label="Tebal" disabled={disabled} onmousedown={(event) => { event.preventDefault(); saveSelection(); }} onclick={() => run('bold')}>
			<BoldIcon class="size-4" />
		</button>

		<div class="relative">
			<button
				type="button"
				class={cn('rich-toolbar-button rich-toolbar-button--wide gap-1 px-2', openMenu === 'format' && 'bg-primary-soft text-primary-ink')}
				aria-label="Format teks"
				aria-haspopup="menu"
				aria-expanded={openMenu === 'format'}
				disabled={disabled}
				onmousedown={(event) => { event.preventDefault(); saveSelection(); }}
				onclick={() => (openMenu = openMenu === 'format' ? null : 'format')}
			>
				<ItalicIcon class="size-4" /><ChevronDownIcon class="size-3.5" />
			</button>
			{#if openMenu === 'format'}
				<div class="rich-toolbar-menu left-0 w-52" role="menu" aria-label="Format teks">
					<button type="button" class="rich-toolbar-menu-item" role="menuitem" onmousedown={(event) => { event.preventDefault(); saveSelection(); }} onclick={() => run('italic')}><span class="flex items-center gap-3"><ItalicIcon class="size-4" />Italic</span><kbd>⌘I</kbd></button>
					<button type="button" class="rich-toolbar-menu-item" role="menuitem" onmousedown={(event) => { event.preventDefault(); saveSelection(); }} onclick={() => run('strikeThrough')}><span class="flex items-center gap-3"><StrikethroughIcon class="size-4" />Strikethrough</span><kbd>⌘⇧S</kbd></button>
					<button type="button" class="rich-toolbar-menu-item" role="menuitem" onmousedown={(event) => { event.preventDefault(); saveSelection(); }} onclick={() => run('formatBlock', 'pre')}><span class="flex items-center gap-3"><CodeIcon class="size-4" />Code</span><kbd>⌘⇧M</kbd></button>
					<div class="my-1 border-t border-hairline"></div>
					<button type="button" class="rich-toolbar-menu-item text-mute" role="menuitem" onmousedown={(event) => { event.preventDefault(); saveSelection(); }} onclick={() => { run('removeFormat'); runBlock('p', 'Normal text'); }}><span class="flex items-center gap-3"><EraserIcon class="size-4" />Clear formatting</span><kbd>⌘\\</kbd></button>
				</div>
			{/if}
		</div>

		<span class="mx-1 h-5 w-px bg-hairline"></span>

		<div class="relative">
			<button
				type="button"
				class={cn('rich-toolbar-button rich-toolbar-button--wide gap-1 px-2', openMenu === 'list' && 'bg-primary-soft text-primary-ink')}
				aria-label="Daftar"
				aria-haspopup="menu"
				aria-expanded={openMenu === 'list'}
				disabled={disabled}
				onmousedown={(event) => { event.preventDefault(); saveSelection(); }}
				onclick={() => (openMenu = openMenu === 'list' ? null : 'list')}
			>
				<ListIcon class="size-4" /><ChevronDownIcon class="size-3.5" />
			</button>
			{#if openMenu === 'list'}
				<div class="rich-toolbar-menu left-0 w-52" role="menu" aria-label="Daftar">
					<button type="button" class="rich-toolbar-menu-item" role="menuitem" onmousedown={(event) => { event.preventDefault(); saveSelection(); }} onclick={() => run('insertUnorderedList')}><span class="flex items-center gap-3"><ListIcon class="size-4" />Bullet list</span><kbd>⌘⇧8</kbd></button>
					<button type="button" class="rich-toolbar-menu-item" role="menuitem" onmousedown={(event) => { event.preventDefault(); saveSelection(); }} onclick={() => run('insertOrderedList')}><span class="flex items-center gap-3"><ListOrderedIcon class="size-4" />Numbered list</span><kbd>⌘⇧7</kbd></button>
				</div>
			{/if}
		</div>

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
		class="min-h-48 p-4 text-sm leading-6 text-ink outline-none empty:before:text-mute empty:before:content-[attr(data-placeholder)]"
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
		border-radius: 0.375rem;
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
		position: absolute;
		top: calc(100% + 0.375rem);
		z-index: 30;
		border: 1px solid var(--color-hairline);
		border-radius: 0.75rem;
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
		border-radius: 0.5rem;
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
		border-radius: 0.375rem;
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
		border-radius: 0.75rem;
		border: 1px solid var(--color-hairline);
	}

	:global([contenteditable='true'] pre) {
		overflow-x: auto;
		border-radius: 0.5rem;
		background: var(--color-canvas-sunken);
		padding: 0.75rem 1rem;
		font-family: monospace;
		white-space: pre-wrap;
	}
</style>

