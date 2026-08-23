// Design system barrel exports
export * from './atoms/index.js';
export * from './molecules/index.js';
export * from './organisms/index.js';
export {
	AuthLayout,
	SettingsLayout,
	DetailLayout,
	ListLayout,
	WizardLayout,
	ErrorLayout,
	MarketingLayout,
	DashboardLayout as DashboardShellLayout
} from './templates/index.js';
export type {
	Crumb as TemplateCrumb,
	NavLink as TemplateNavLink,
	TabItem as TemplateTabItem,
	PageHeader,
	ErrorLayoutAction,
	MarketingNavLink,
	DashboardShellProps,
	PageScopeProps
} from './templates/shared.js';
