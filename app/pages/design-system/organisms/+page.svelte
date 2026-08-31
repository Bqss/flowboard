<script lang="ts">
  import ShowcaseSection from '../ShowcaseSection.svelte';
  import ShowcaseSubnav from '../ShowcaseSubnav.svelte';
  import { Badge, Button } from '$lib/components/atoms/index.js';
  import { StatCard } from '$lib/components/molecules/index.js';
  import {
    KanbanBoard,
    Timeline,
    ListCard,
    ChartCard,
    GaugeCard,
    ProfileCard,
    TreeView,
    DataTable,
    TableCard,
    FileUploader,
    FilterBar,
    FormSection,
    LoginForm,
    MultiStepForm,
    SettingsPanel,
    Topbar,
    SidebarRail,
    BottomTabBar,
    CommandPalette,
    NotificationCenter,
    Dialog,
    Sheet,
    ConfirmDialog,
    Popover,
    AlertBanner,
    Toaster,
    SecurityCard,
    FAQAccordion,
    FeatureGrid,
    HeroSection,
    PricingTable,
    TestimonialSlider,
    CTASection,
    LogoCloud,
    AppFooter,
    CardGrid,
    type TreeNode
  } from '$lib/components/organisms/index.js';
  import { toast } from '$lib/components/molecules/index.js';

  const subnav = [
    { href: '#board', label: 'Board' },
    { href: '#data', label: 'Data' },
    { href: '#forms', label: 'Forms' },
    { href: '#chrome', label: 'Chrome' },
    { href: '#overlays', label: 'Overlays' },
    { href: '#feedback', label: 'Feedback' },
    { href: '#marketing', label: 'Marketing' },
    { href: '#inventory', label: 'Inventory' }
  ];

  let dialogOpen = $state(false);
  let sheetOpen = $state(false);
  let confirmOpen = $state(false);
  let popoverOpen = $state(false);
  let cmdOpen = $state(false);
  let bannerVisible = $state(true);
  let filterSearch = $state('');
  let activeFilter = $state('all');
  let uploadFiles = $state<{ file: File; url?: string }[]>([]);
  let tablePage = $state(1);
  let tableSelected = $state<string[]>([]);
  let multiStep = $state(0);
  let settingsTab = $state('general');

  const kanbanColumns = [
    {
      id: 'todo',
      title: 'To Do',
      items: [
        { id: '1', title: 'UI/UX Design in the age of AI', badge: 'Important', subtitle: 'Onboarding flow' },
        { id: '2', title: 'Learn Computer Science', badge: 'Meh' }
      ]
    },
    {
      id: 'progress',
      title: 'In Progress',
      items: [{ id: '3', title: 'Customer Reporting — Dec 2024', badge: 'High Priority', subtitle: 'VIP registration' }]
    },
    {
      id: 'done',
      title: 'Completed',
      items: [{ id: '4', title: 'Send VIP Intro message', badge: 'OK' }]
    }
  ];

  const timelineItems = [
    { id: '1', title: 'Customer registered', description: 'FBO account created via portal', time: 'Today, 09:14', tone: 'positive' as const },
    { id: '2', title: 'Follow-up scheduled', description: 'WhatsApp reminder in 3 days', time: 'Yesterday', tone: 'info' as const },
    { id: '3', title: 'Payment pending', description: 'Awaiting bank transfer confirmation', time: 'Dec 12', tone: 'warning' as const }
  ];

  const listItems = [
    { id: '1', title: 'Food Delivery Co.', subtitle: 'Onboarding', badge: 'In Progress', badgeTone: 'queued' as const, delta: 12 },
    { id: '2', title: 'Retail Plus', subtitle: 'Follow-up', badge: 'Urgent', badgeTone: 'negative' as const, delta: -4 },
    { id: '3', title: 'TechStart ID', subtitle: 'Completed', badge: 'Done', badgeTone: 'positive' as const, delta: 8 }
  ];

  let treeNodes = $state<TreeNode[]>([
    {
      id: '1',
      label: 'Projects',
      expanded: true,
      children: [
        { id: '1a', label: 'Food Delivery', selected: true },
        { id: '1b', label: 'Retail Plus' }
      ]
    },
    { id: '2', label: 'Archive', expanded: false, children: [{ id: '2a', label: 'Q3 2025' }] }
  ]);

  const tableRows = [
    { id: '1', name: 'Ahmad Rizki', status: 'In Progress', revenue: 'Rp 12.4M' },
    { id: '2', name: 'Sarah Chen', status: 'Done', revenue: 'Rp 8.1M' },
    { id: '3', name: 'Budi Santoso', status: 'Queued', revenue: 'Rp 3.2M' }
  ];

  const tableColumns = [
    { key: 'name', label: 'Customer', sortable: true },
    { key: 'status', label: 'Status' },
    { key: 'revenue', label: 'Revenue', align: 'right' as const }
  ];

  const faqItems = [
    { question: 'How do lanes work?', answer: 'Each lane maps to a status hue — queued, progress, or done.' },
    { question: 'Can I drag cards between lanes?', answer: 'Yes. Cards keep white surfaces; status lives in pills and dots.' }
  ];

  const featureItems = [
    { title: 'Kanban lanes', description: '320px trays with status-colored add buttons.' },
    { title: 'Executive stats', description: 'Bold numbers with sparklines and delta badges.' }
  ];

  const pricingPlans = [
    { name: 'Starter', price: 'Rp 0', period: 'mo', description: 'For small teams', features: ['3 lanes', '5 users'], cta: 'Get started' },
    { name: 'Pro', price: 'Rp 499k', period: 'mo', description: 'Growing ops teams', features: ['Unlimited lanes', 'Analytics'], highlighted: true, cta: 'Start trial' },
    { name: 'Enterprise', price: 'Custom', description: 'SLA & SSO', features: ['Dedicated support', 'Audit logs'], cta: 'Contact sales' }
  ];

  const testimonials = [
    { quote: 'actjom cut our onboarding time in half.', author: 'Ahmad Rizki', role: 'Ops Lead' },
    { quote: 'The lane colors make status obvious at a glance.', author: 'Sarah Chen', role: 'CS Manager' }
  ];

  const commandItems = [
    { id: 'new', label: 'New customer', group: 'Actions', shortcut: '⌘N' },
    { id: 'board', label: 'Go to board', group: 'Navigation' },
    { id: 'settings', label: 'Open settings', group: 'Navigation' }
  ];

  const notifications = [
    { id: '1', title: 'Follow-up due', body: 'Food Delivery Co. — 3 days idle', time: '2m', unread: true },
    { id: '2', title: 'Card completed', body: 'Retail Plus moved to Done', time: '1h', unread: false }
  ];

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', active: true },
    { label: 'Board', href: '#' },
    { label: 'Settings', href: '#' }
  ];

  const multiSteps = [
    { label: 'Customer info', description: 'Basic details' },
    { label: 'Registration', description: 'FBO setup' },
    { label: 'Follow-up', description: 'WhatsApp sequence' }
  ];

  const settingsSections = [
    { value: 'general', label: 'General' },
    { value: 'security', label: 'Security' },
    { value: 'notifications', label: 'Notifications' }
  ];

  const organismList = [
    'SidebarRail', 'Topbar', 'BottomTabBar', 'AppFooter', 'CommandPalette', 'NotificationCenter',
    'DashboardLayout', 'CardGrid', 'ChartCard', 'GaugeCard', 'ListCard', 'ProfileCard', 'TableCard',
    'DataTable', 'SecurityCard', 'Timeline', 'TreeView', 'KanbanBoard', 'FileUploader', 'Dialog',
    'Sheet', 'ConfirmDialog', 'Popover', 'AlertBanner', 'Toaster', 'FormSection', 'MultiStepForm', 'FilterBar',
    'LoginForm', 'SettingsPanel', 'HeroSection', 'FeatureGrid', 'PricingTable', 'TestimonialSlider',
    'FAQAccordion', 'CTASection', 'LogoCloud'
  ];
</script>

<svelte:head>
  <title>Organisms — Design System</title>
</svelte:head>

<div class="space-y-10 pb-16">
  <div class="space-y-3">
    <Badge tone="done">36/36 organisms · live demo</Badge>
    <p class="ds-body max-w-2xl text-mute">
      Page-level sections — every export from <code class="text-primary-ink">$lib/components/organisms</code> except
      <code class="text-primary-ink">DashboardLayout</code> (full viewport shell — see /dashboard).
    </p>
    <ShowcaseSubnav items={subnav} />
  </div>

  <ShowcaseSection id="board" title="KanbanBoard" description="Lane columns with status dots and card badges.">
    <KanbanBoard columns={kanbanColumns} />
  </ShowcaseSection>

  <ShowcaseSection id="data" title="Data organisms" description="Cards, tables, charts, and hierarchical views.">
    <div class="grid gap-6 lg:grid-cols-2">
      <Timeline title="Activity" items={timelineItems} />
      <ListCard title="Top customers" items={listItems} />
    </div>
    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <ChartCard title="Monthly revenue" value="Rp 24.8M" delta={12.4} status="On track" data={[4, 6, 5, 8, 7, 9, 5, 11, 10, 12]} />
      <GaugeCard title="Completion rate" value={72} label="This month" />
      <ProfileCard name="Sarah Chen" email="sarah@actjom.app" stats={[{ label: 'Cards', value: '847' }, { label: 'Teams', value: '12' }]} />
    </div>
    <div class="mt-6 grid gap-6 lg:grid-cols-2">
      <TreeView title="Project tree" nodes={treeNodes} />
      <DataTable
        title="Customers"
        columns={tableColumns}
        rows={tableRows}
        bind:page={tablePage}
        total={24}
        perPage={10}
        selectable
        bind:selected={tableSelected}
      />
    </div>
    <div class="mt-6">
      <TableCard
        title="Customers (TableCard wrapper)"
        columns={tableColumns}
        rows={tableRows}
        total={24}
        perPage={10}
      />
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="forms" title="Form organisms" description="Sections, multi-step, filter bar, login, dropzone.">
    <MultiStepForm steps={multiSteps} bind:current={multiStep}>
      {#snippet children(step)}
        <FormSection title={multiSteps[step]?.label ?? 'Step'} description={multiSteps[step]?.description}>
          <p class="ds-body text-mute">Step {step + 1} content — swap in real form fields here.</p>
        </FormSection>
      {/snippet}
    </MultiStepForm>
    <div class="mt-8">
      <LoginForm title="LoginForm" subtitle="Email + password organism." submitLabel="Sign in" onSubmit={() => {}} class="max-w-md" />
    </div>
    <div class="mt-6">
      <FilterBar
        bind:search={filterSearch}
        bind:activeFilter
        filters={[
          { id: 'all', label: 'All', count: 48 },
          { id: 'urgent', label: 'Urgent', count: 5 },
          { id: 'done', label: 'Done', count: 12 }
        ]}
        searchPlaceholder="Filter customers…"
      >
        {#snippet actions()}
          <Button size="sm">Export</Button>
        {/snippet}
      </FilterBar>
    </div>
    <div class="mt-6">
      <p class="ds-label mb-3 text-ink-soft">FileUploader · drag & drop zone</p>
      <FileUploader bind:files={uploadFiles} accept="image/*,.pdf" maxSizeMb={5} />
    </div>
    <div class="mt-8">
      <SettingsPanel sections={settingsSections} bind:value={settingsTab} title="SettingsPanel" description="Tabbed settings layout.">
        {#snippet content(tab)}
          <p class="ds-body text-mute">
            {#if tab === 'general'}General preferences and workspace defaults.
            {:else if tab === 'security'}Password, 2FA, and session management.
            {:else}Email and push notification rules.{/if}
          </p>
        {/snippet}
      </SettingsPanel>
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="chrome" title="App chrome" description="Sidebar, topbar, bottom tabs, command palette, notifications.">
    <div class="flex flex-col gap-6 lg:flex-row">
      <SidebarRail items={navItems} userName="Admin" workspaceName="Acme Corp" class="!relative !flex !h-[420px] shrink-0 !z-0 rounded-card overflow-hidden border border-hairline shadow-card" />
      <div class="min-w-0 flex-1 overflow-hidden rounded-card border border-hairline bg-canvas-sunken">
        <Topbar title="Executive Dashboard" subtitle="Signed in as Admin" eyebrow="actjom" searchPlaceholder="Search board…" />
        <div class="border-t border-hairline p-6">
          <CardGrid columns={3}>
            <StatCard label="In progress" value="12" delta={8} />
            <StatCard label="Completed" value="847" delta={-2} invertDelta />
            <StatCard label="Urgent" value="5" delta={14} />
          </CardGrid>
        </div>
      </div>
    </div>
    <div class="mt-6 flex flex-wrap items-center gap-4">
      <BottomTabBar items={navItems} class="!relative !inset-auto !z-0 max-w-md rounded-card border border-hairline" />
      <NotificationCenter items={notifications} />
      <Button variant="secondary" onclick={() => (cmdOpen = true)}>CommandPalette ⌘K</Button>
    </div>
    <CommandPalette bind:open={cmdOpen} items={commandItems} onclose={() => (cmdOpen = false)} />
  </ShowcaseSection>

  <ShowcaseSection id="overlays" title="Overlays" description="Dialog, sheet, confirm, and popover patterns.">
    <div class="flex flex-wrap gap-3">
      <Button onclick={() => (dialogOpen = true)}>Dialog</Button>
      <Button variant="secondary" onclick={() => (sheetOpen = true)}>Sheet</Button>
      <Button variant="warning" onclick={() => (confirmOpen = true)}>Confirm</Button>
      <Popover bind:open={popoverOpen} label="Quick actions">
        {#snippet trigger({ toggle })}
          <Button variant="ghost" onclick={toggle}>Popover</Button>
        {/snippet}
        {#snippet content()}
          <div class="space-y-1 p-1">
            <button type="button" class="ds-body block w-full rounded-md px-3 py-2 text-left hover:bg-lane">Edit card</button>
            <button type="button" class="ds-body block w-full rounded-md px-3 py-2 text-left hover:bg-lane">Move lane</button>
          </div>
        {/snippet}
      </Popover>
    </div>

    <Dialog bind:open={dialogOpen} title="Edit customer" description="Update onboarding details.">
      <p class="ds-body text-mute">Dialog body — forms, confirmations, or detail views.</p>
      {#snippet footer()}
        <div class="flex justify-end gap-2">
          <Button variant="ghost" onclick={() => (dialogOpen = false)}>Cancel</Button>
          <Button onclick={() => (dialogOpen = false)}>Save</Button>
        </div>
      {/snippet}
    </Dialog>

    <Sheet bind:open={sheetOpen} title="Customer detail">
      <p class="ds-body text-mute">Sheet slides in from the edge.</p>
      {#snippet footer()}
        <Button class="w-full" onclick={() => (sheetOpen = false)}>Close</Button>
      {/snippet}
    </Sheet>

    <ConfirmDialog
      bind:open={confirmOpen}
      title="Delete customer?"
      description="This action cannot be undone."
      destructive
      confirmLabel="Delete"
      onconfirm={() => (confirmOpen = false)}
      oncancel={() => (confirmOpen = false)}
    />
  </ShowcaseSection>

  <ShowcaseSection id="feedback" title="Feedback organisms" description="Page-level alerts, toast notifications, and empty security states.">
    {#if bannerVisible}
      <AlertBanner title="System maintenance" tone="info" onclose={() => (bannerVisible = false)}>
        Scheduled downtime Sunday 02:00–04:00 WIB. Boards remain read-only.
      </AlertBanner>
    {:else}
      <Button variant="ghost" onclick={() => (bannerVisible = true)}>Show banner again</Button>
    {/if}

    <div class="mt-6 rounded-card border border-hairline bg-card p-4 space-y-3">
      <div class="space-y-0.5">
        <h3 class="ds-section-title text-sm text-ink font-semibold">Toaster Feedback (DESIGN.md)</h3>
        <p class="ds-caption text-xs text-mute">Pojok kanan bawah notification triggers</p>
      </div>
      <div class="flex flex-wrap gap-2.5">
        <Button
          variant="secondary"
          size="sm"
          onclick={() => toast.success('Checklist berhasil dihapus.', { description: 'Perubahan telah disimpan ke server.' })}
        >
          Toast Sukses
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onclick={() => toast.error('Gagal menghapus item checklist.', { description: 'Koneksi jaringan terputus.' })}
        >
          Toast Error
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onclick={() => toast.warning('Harap lengkapi semua checklist wajib.')}
        >
          Toast Peringatan
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onclick={() => toast.info('Tahapan baru telah disinkronkan.')}
        >
          Toast Info
        </Button>
      </div>
    </div>

    <div class="mt-6">
      <SecurityCard title="2FA not enabled" description="Add an extra layer of security." actionLabel="Enable 2FA" onaction={() => {}} />
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="marketing" title="Marketing organisms" description="Landing-page blocks (also used on marketing site).">
    <HeroSection
      eyebrow="actjom"
      title="Onboarding ops, visualized"
      description="Kanban lanes for customer onboarding teams."
      primaryLabel="Get started"
      secondaryLabel="See demo"
    />
    <div class="mt-8">
      <FeatureGrid title="Why actjom" description="Composable kanban for onboarding teams." items={featureItems} columns={2} />
    </div>
    <div class="mt-8">
      <PricingTable plans={pricingPlans} />
    </div>
    <div class="mt-8">
      <TestimonialSlider items={testimonials} />
    </div>
    <div class="mt-8">
      <FAQAccordion items={faqItems} />
    </div>
    <div class="mt-8">
      <CTASection title="Ready to streamline onboarding?" description="Start with a free board today." primaryLabel="Create board" />
    </div>
    <div class="mt-8">
      <LogoCloud logos={[{ name: 'DripLab' }, { name: 'actjom' }, { name: 'Acme Corp' }]} />
    </div>
    <div class="mt-8 overflow-hidden rounded-card border border-hairline">
      <AppFooter links={[{ label: 'Docs', href: '#' }, { label: 'Privacy', href: '#' }]} note="© actjom Design System" />
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="inventory" title="Full organism inventory" description="All 36 exports — DashboardLayout lives on /dashboard.">
    <div class="flex flex-wrap gap-2">
      {#each organismList as name (name)}
        <Badge tone={name === 'DashboardLayout' ? 'idle' : 'done'}>{name}</Badge>
      {/each}
    </div>
  </ShowcaseSection>
</div>
