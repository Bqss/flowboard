import type { Snippet } from 'svelte';

export type MenuItem = {
	label: string;
	value?: string;
	icon?: Snippet;
	avatar?: { name: string; src?: string | null };
	description?: string;
	submenu?: MenuItem[];
	shortcut?: string;
	destructive?: boolean;
	disabled?: boolean;
	active?: boolean;
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

/** Single field surface — the one spec every input-like control uses (40px, 10px radius, hairline). */
export const fieldClass =
	'text-sm flex h-10 w-full min-w-0 items-center gap-2 rounded-md border border-hairline bg-card px-3 text-ink transition-colors duration-150 hover:border-primary-border focus-within:border-primary focus-within:ring-2 focus-within:ring-[var(--focus)]';

/** Field used as a div/button trigger (pointer cursor). */
export const fieldTriggerClass = `${fieldClass} cursor-pointer`;
