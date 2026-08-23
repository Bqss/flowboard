import type { Snippet } from 'svelte';
import { cn } from '$lib/utils.js';
import type { Crumb } from '../molecules/shared.js';
import type { NavLink } from '../organisms/shared.js';
import type { TabItem } from '../molecules/shared.js';

export type { Crumb, NavLink, TabItem };

export type PageHeader = {
	title: string;
	description?: string;
};

export type ErrorLayoutAction = {
	label: string;
	href?: string;
	onclick?: () => void;
	variant?: 'primary' | 'secondary';
};

export type MarketingNavLink = {
	label: string;
	href: string;
	active?: boolean;
};

/** Shared chrome props for dashboard-based templates. */
export type DashboardShellProps = {
	title: string;
	subtitle?: string;
	nav: NavLink[];
	adminNav?: NavLink[];
	mobileNav?: NavLink[];
	userName?: string;
	userSrc?: string;
	search?: string;
	showSearch?: boolean;
	class?: string;
	topbarActions?: Snippet;
	/** Fit inside preview frames instead of full viewport height. */
	embedded?: boolean;
};

/** Page-level header region inside dashboard templates. */
export type PageScopeProps = {
	breadcrumbs?: Crumb[];
	pageTitle?: string;
	pageDescription?: string;
	toolbar?: Snippet;
};

export const cardSurfaceClass = 'rounded-xl bg-card shadow-[var(--shadow-card)]';
export const pageHeaderClass = 'mb-6 flex flex-wrap items-start justify-between gap-4';
export const contentStackClass = 'flex min-w-0 flex-col gap-4';
export const embeddedShellClass = 'min-h-0 h-full';
export const viewportShellClass = 'min-h-svh';

export function shellRootClass(embedded = false) {
	return embedded ? embeddedShellClass : viewportShellClass;
}

export function detailGridClass(masterWidth: 'sm' | 'md' | 'lg' = 'md') {
	const columns = {
		sm: 'lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]',
		md: 'lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]',
		lg: 'lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]'
	} as const;

	return cn('grid gap-4', columns[masterWidth]);
}

export const wizardWidthClass = {
	sm: 'max-w-md',
	md: 'max-w-2xl',
	lg: 'max-w-3xl'
} as const;

export const authWidthClass = {
	sm: 'max-w-[420px]',
	md: 'max-w-md'
} as const;
