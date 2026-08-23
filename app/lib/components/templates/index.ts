import DashboardLayout from './DashboardLayout.svelte';
import AuthLayout from './AuthLayout.svelte';
import SettingsLayout from './SettingsLayout.svelte';
import DetailLayout from './DetailLayout.svelte';
import ListLayout from './ListLayout.svelte';
import WizardLayout from './WizardLayout.svelte';
import ErrorLayout from './ErrorLayout.svelte';
import MarketingLayout from './MarketingLayout.svelte';

export type {
	Crumb,
	NavLink,
	TabItem,
	PageHeader,
	ErrorLayoutAction,
	MarketingNavLink,
	DashboardShellProps,
	PageScopeProps
} from './shared.js';

export {
	cardSurfaceClass,
	pageHeaderClass,
	contentStackClass,
	shellRootClass,
	detailGridClass,
	wizardWidthClass,
	authWidthClass
} from './shared.js';

export {
	DashboardLayout,
	AuthLayout,
	SettingsLayout,
	DetailLayout,
	ListLayout,
	WizardLayout,
	ErrorLayout,
	MarketingLayout
};
