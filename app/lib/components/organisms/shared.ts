/** Shared types for DripDesk design-system organisms. */

export type NavLink = {
	href?: string;
	label: string;
	active?: boolean;
	badge?: number | string;
	disabled?: boolean;
	testId?: string;
	icon?: import('svelte').Snippet;
	onselect?: () => void;
};

export type NavSection = {
	label?: string;
	items: NavLink[];
};

export type NotificationItem = {
	id: string;
	title: string;
	body?: string;
	time?: string;
	unread?: boolean;
	onselect?: () => void;
};

export type CommandItem = {
	id: string;
	label: string;
	group?: string;
	shortcut?: string;
	keywords?: string;
	icon?: import('svelte').Snippet;
	onselect?: () => void;
};

export type TableColumn<T = Record<string, unknown>> = {
	key: string;
	label: string;
	sortable?: boolean;
	mono?: boolean;
	align?: 'left' | 'right' | 'center';
	width?: string;
	render?: (row: T) => string;
};

export type ListCardItem = {
	id: string;
	title: string;
	subtitle?: string;
	delta?: number;
	badge?: string;
	badgeTone?: 'neutral' | 'queued' | 'positive' | 'negative' | 'warning' | 'info';
	icon?: import('svelte').Snippet;
	onselect?: () => void;
};

export type TimelineItem = {
	id: string;
	title: string;
	description?: string;
	time?: string;
	tone?: 'positive' | 'negative' | 'warning' | 'info' | 'neutral';
};

export type TreeNode = {
	id: string;
	label: string;
	children?: TreeNode[];
	expanded?: boolean;
	selected?: boolean;
};

export type KanbanColumn = {
	id: string;
	title: string;
	items: KanbanCard[];
};

export type KanbanCard = {
	id: string;
	title: string;
	subtitle?: string;
	badge?: string;
	badgeTone?: 'urgent' | 'progress' | 'done' | 'queued' | 'neutral';
	assignee?: string;
	assigneeAvatar?: string;
	progress?: string;
	progressDone?: boolean;
	labelBarTone?: 'urgent' | 'progress' | 'done' | 'queued' | 'idle';
	selected?: boolean;
	waError?: boolean;
	dueBadge?: { label: string; tone: 'urgent' | 'progress' };
	dueDateText?: string;
	completed?: boolean;
};

export type FeatureItem = {
	title: string;
	description: string;
	icon?: import('svelte').Snippet;
};

export type PricingPlan = {
	name: string;
	price: string;
	period?: string;
	description?: string;
	features: string[];
	highlighted?: boolean;
	cta?: string;
};

export type Testimonial = {
	quote: string;
	author: string;
	role?: string;
};

export type FAQItem = {
	question: string;
	answer: string;
};

export type FooterLink = {
	label: string;
	href: string;
};

/** Modal scrim + card shell classes from DESIGN.md */
export const modalScrimClass =
	'fixed inset-0 z-[100] flex items-center justify-center bg-[var(--overlay-scrim)] p-4 backdrop-blur-[2px]';

export const modalPanelClass =
	'w-full max-w-lg rounded-xl bg-card p-6 shadow-[var(--shadow-modal)] origin-center will-change-[transform,opacity]';

export const cardShellClass = 'rounded-card bg-card shadow-card border border-hairline';
