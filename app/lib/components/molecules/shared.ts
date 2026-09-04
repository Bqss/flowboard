/**
 * Closes a floating panel on outside pointerdown or Escape.
 * Capture phase so the panel closes before a trigger's own click re-opens it.
 */
export function dismissable(node: HTMLElement, onDismiss: () => void) {
	let dismiss = onDismiss;

	function onPointerDown(event: PointerEvent) {
		const target = event.target as Element | null;
		if (target && !node.contains(target) && !target.closest?.('[data-floating]')) dismiss();
	}

	function onKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') dismiss();
	}

	document.addEventListener('pointerdown', onPointerDown, true);
	document.addEventListener('keydown', onKeyDown);

	return {
		update(next: () => void) {
			dismiss = next;
		},
		destroy() {
			document.removeEventListener('pointerdown', onPointerDown, true);
			document.removeEventListener('keydown', onKeyDown);
		}
	};
}

export type MenuItem = {
	label: string;
	value?: string;
	icon?: import('svelte').Snippet;
	shortcut?: string;
	destructive?: boolean;
	disabled?: boolean;
	separatorBefore?: boolean;
	onselect?: () => void;
};

export type Option = {
	value: string;
	label: string;
	description?: string;
	disabled?: boolean;
};

export type Crumb = { label: string; href?: string };

export type StepItem = { label: string; description?: string };

export type TabItem = {
	value: string;
	label: string;
	badge?: number | string;
	icon?: import('svelte').Snippet;
	disabled?: boolean;
};

/** Shared surface for every floating panel: card ground, raised elevation, 14px radius. */
export const panelClass =
	'z-50 min-w-[10rem] overflow-hidden rounded-lg border border-hairline bg-card p-1.5 shadow-[var(--shadow-raised)]';

/** Shared row inside a floating panel: 10px radius per DESIGN.md dropdown items. */
export const panelItemClass =
	'text-[14px] flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-ink transition-colors duration-150 ease-out outline-none hover:bg-primary-soft focus-visible:bg-primary-soft data-[disabled=true]:pointer-events-none data-[disabled=true]:text-faint';

/** Matches Input atom surface — use on div/button triggers with focus-within. */
export const fieldTriggerClass =
	'ds-body flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-sm border border-hairline bg-card px-3 py-2.5 text-ink transition-colors duration-150 hover:border-primary-border focus-within:border-primary focus-within:ring-2 focus-within:ring-[var(--focus)]';

/** Teleports node to document.body so floating panels escape modal overflow/transform. */
export function portal(node: HTMLElement) {
	if (!node.hasAttribute('data-theme')) {
		node.setAttribute('data-theme', 'app');
	}
	document.body.appendChild(node);
	return {
		destroy() {
			node.remove();
		}
	};
}

export type FloatingRect = {
	top: number;
	left: number;
	width: number;
	maxHeight: number;
};

/** Position a fixed panel anchored to a trigger (viewport coords). */
export function computeFloatingRect(
	anchor: HTMLElement,
	preferredHeight = 240,
	gap = 6
): FloatingRect {
	const rect = anchor.getBoundingClientRect();
	const spaceBelow = window.innerHeight - rect.bottom - gap;
	const spaceAbove = rect.top - gap;
	const openUp = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
	const maxHeight = Math.min(280, openUp ? spaceAbove - gap : spaceBelow - gap);
	const height = Math.max(120, maxHeight);
	const top = openUp ? Math.max(gap, rect.top - gap - height) : rect.bottom + gap;

	return {
		top,
		left: rect.left,
		width: rect.width,
		maxHeight: height
	};
}
