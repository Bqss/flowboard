<script lang="ts">
  import ShowcaseSection from '../ShowcaseSection.svelte';
  import ShowcaseSubnav from '../ShowcaseSubnav.svelte';
  import { Badge, Separator, Input, Button } from '$lib/components/atoms/index.js';
  import {
    Tabs,
    StatCard,
    SearchInput,
    Breadcrumb,
    FilterPill,
    AlertInline,
    Toast,
    EmptyStateBlock,
    Pagination,
    MetricDelta,
    FormField,
    NavItem,
    KeyValuePair,
    UserChip,
    IconChip,
    Stepper,
    ThemeToggle,
    PasswordInput,
    DatePicker,
    TimePicker,
    SelectMenu,
    Combobox,
    TagInput,
    CheckboxGroup,
    RadioGroup,
    QuantityStepper,
    DropdownMenu,
    ContextMenu,
    StatCardHighlight,
    Sparkline,
    ListRow,
    CopyToClipboard,
    Rating,
    LanguageSwitcher,
    InternalPicPicker,
    PortalUserPicker,
    MultiSelectCombobox
  } from '$lib/components/molecules/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { KanbanIcon, Home09Icon } from '@hugeicons/core-free-icons';

  const subnav = [
    { href: '#forms', label: 'Forms' },
    { href: '#menus', label: 'Menus' },
    { href: '#navigation', label: 'Navigation' },
    { href: '#data', label: 'Data' },
    { href: '#feedback', label: 'Feedback' },
    { href: '#inventory', label: 'Inventory' }
  ];

  const selectOptions = [
    { value: 'queued', label: 'Queued' },
    { value: 'progress', label: 'In Progress' },
    { value: 'done', label: 'Done' }
  ];

  const checkboxOptions = [
    { value: 'email', label: 'Email alerts' },
    { value: 'sms', label: 'SMS reminders' },
    { value: 'push', label: 'Push notifications' }
  ];

  const staff = [
    { id: '1', full_name: 'Ahmad Rizki' },
    { id: '2', full_name: 'Sarah Chen' },
    { id: '3', full_name: 'Budi Santoso' }
  ];

  let tabValue = $state('board');
  let segmentedTab = $state('list');
  let pillsTab = $state('all');
  let search = $state('');
  let email = $state('');
  let password = $state('');
  let pageNum = $state(2);
  let alertVisible = $state(true);
  let step = $state(1);
  let dateValue = $state('');
  let timeValue = $state('');
  let selectValue = $state('queued');
  let comboValue = $state('');
  let tags = $state<string[]>(['VIP', 'FBO']);
  let checkboxValues = $state<string[]>(['email']);
  let radioValue = $state('standard');
  let quantity = $state(2);
  let rating = $state(4);
  let lang = $state('id');
  let assignedStaff = $state<string[]>(['1']);
  let primaryStaff = $state('1');
  let portalUser = $state('');
  let menuOpen = $state(false);

  const tabItems = [
    { value: 'list', label: 'List' },
    { value: 'board', label: 'Board', badge: 3 },
    { value: 'timeline', label: 'Timeline' }
  ];

  const stepItems = [
    { label: 'Customer info', description: 'Basic details' },
    { label: 'Registration', description: 'FBO setup' },
    { label: 'Follow-up', description: 'WhatsApp sequence' }
  ];

  const menuItems = [
    { label: 'Edit card', onselect: () => {} },
    { label: 'Move lane', onselect: () => {} },
    { label: 'Delete', destructive: true, separatorBefore: true, onselect: () => {} }
  ];

  const moleculeList = [
    'FormField', 'SearchInput', 'PasswordInput', 'DatePicker', 'TimePicker', 'SelectMenu',
    'Combobox', 'TagInput', 'CheckboxGroup', 'RadioGroup', 'QuantityStepper', 'Tabs',
    'Breadcrumb', 'Pagination', 'NavItem', 'DropdownMenu', 'ContextMenu', 'Stepper',
    'FilterPill', 'StatCard', 'StatCardHighlight', 'MetricDelta', 'Sparkline', 'IconChip',
    'UserChip', 'ListRow', 'KeyValuePair', 'AlertInline', 'Toast', 'EmptyStateBlock', 'Rating',
    'CopyToClipboard', 'ThemeToggle', 'LanguageSwitcher', 'PortalUserPicker', 'InternalPicPicker'
  ];
</script>

<svelte:head>
  <title>Molecules — Design System</title>
</svelte:head>

<div class="space-y-10 pb-16">
  <div class="space-y-3">
    <Badge tone="progress">36/36 molecules · live demo</Badge>
    <p class="ds-body max-w-2xl text-mute">
      Composed controls built from atoms — every export from <code class="text-primary-ink">$lib/components/molecules</code>.
    </p>
    <ShowcaseSubnav items={subnav} />
  </div>

  <ShowcaseSection id="forms" title="Form molecules" description="FormField wrapper — semua field setinggi h-10 (40px).">
    <div class="grid gap-6 md:grid-cols-2">
      <FormField label="Email" helper="Login & notifications">
        {#snippet control(field)}
          <Input type="email" bind:value={email} placeholder="you@company.com" {...field} />
        {/snippet}
      </FormField>
      <FormField label="Password" error={password.length > 0 && password.length < 4 ? 'Min 4 characters' : undefined}>
        {#snippet control(field)}
          <PasswordInput bind:value={password} placeholder="••••••••" {...field} invalid={password.length > 0 && password.length < 4} />
        {/snippet}
      </FormField>
      <FormField label="Due date">
        {#snippet control(field)}
          <DatePicker bind:value={dateValue} {...field} />
        {/snippet}
      </FormField>
      <FormField label="Follow-up time">
        {#snippet control(field)}
          <TimePicker bind:value={timeValue} {...field} />
        {/snippet}
      </FormField>
      <FormField label="Status">
        {#snippet control(field)}
          <SelectMenu options={selectOptions} bind:value={selectValue} {...field} />
        {/snippet}
      </FormField>
      <FormField label="Assignee">
        {#snippet control(field)}
          <Combobox options={selectOptions} bind:value={comboValue} placeholder="Search team…" {...field} />
        {/snippet}
      </FormField>
      <FormField label="Tags">
        {#snippet control(field)}
          <TagInput bind:value={tags} {...field} />
        {/snippet}
      </FormField>
      <FormField label="Seats">
        {#snippet control(field)}
          <QuantityStepper bind:value={quantity} label="Seats" />
        {/snippet}
      </FormField>
    </div>
    <Separator class="my-6" />
    <div class="grid gap-6 md:grid-cols-2">
      <CheckboxGroup options={checkboxOptions} bind:value={checkboxValues} legend="Notify via" />
      <RadioGroup
        options={[
          { value: 'standard', label: 'Standard onboarding' },
          { value: 'vip', label: 'VIP onboarding' }
        ]}
        bind:value={radioValue}
        legend="Plan type"
        variant="card"
      />
    </div>
    <Separator class="my-6" />
    <p class="ds-label mb-3 text-ink-soft">SearchInput · topbar style</p>
    <SearchInput bind:value={search} placeholder="Search tasks…" class="max-w-md" />
    <Separator class="my-6" />
    <div class="grid gap-6 md:grid-cols-2">
      <InternalPicPicker {staff} bind:assigned={assignedStaff} bind:primary={primaryStaff} />
      <PortalUserPicker bind:value={portalUser} />
    </div>
    <Separator class="my-6" />
    <div>
      <p class="ds-label mb-2 text-ink-soft">MultiSelectCombobox · multiple team / PIC selection</p>
      <MultiSelectCombobox
        options={staff.map(s => ({ value: s.id, label: s.full_name, description: `${s.full_name.toLowerCase().replace(/\s+/g, '.')}@actjom.app` }))}
        bind:values={assignedStaff}
        bind:primary={primaryStaff}
        showPrimaryBadge
        placeholder="Pilih anggota tim PIC..."
      />
    </div>
    <Separator class="my-6" />
    <Stepper steps={stepItems} bind:current={step} />
  </ShowcaseSection>

  <ShowcaseSection id="menus" title="Menus" description="Dropdown and context menus.">
    <div class="flex flex-wrap items-start gap-6">
      <DropdownMenu items={menuItems} bind:open={menuOpen} label="Card actions">
        {#snippet trigger({ toggle })}
          <Button variant="secondary" onclick={toggle}>Actions ▾</Button>
        {/snippet}
      </DropdownMenu>
      <ContextMenu items={menuItems}>
        <div class="grid min-h-28 min-w-64 place-items-center rounded-card border border-dashed border-hairline bg-lane/50 px-6 text-center">
          <p class="ds-caption text-mute">Right-click here</p>
        </div>
      </ContextMenu>
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="navigation" title="Navigation" description="Tabs, breadcrumbs, pagination, nav items.">
    <div class="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Projects', href: '/dashboard' },
          { label: 'Food Delivery' }
        ]}
      />
      <Tabs items={tabItems} bind:value={tabValue} variant="underline" />
      <Tabs
        items={[
          { value: 'list', label: 'List' },
          { value: 'grid', label: 'Grid' },
          { value: 'board', label: 'Board' }
        ]}
        bind:value={segmentedTab}
        variant="segmented"
      />
      <Tabs
        items={[
          { value: 'all', label: 'Semua Anggota', badge: 12 },
          { value: 'owners', label: 'Owner', badge: 2 },
          { value: 'members', label: 'Staf PIC', badge: 10 }
        ]}
        bind:value={pillsTab}
        variant="pills"
      />
      <Pagination total={48} perPage={10} bind:page={pageNum} />
      <div class="flex flex-wrap items-center gap-3">
        <NavItem label="Dashboard" href="/dashboard" active icon={navIcon} variant="expanded" class="w-48" />
        <FilterPill label="All" active={true} />
        <FilterPill label="Urgent" active={false} count={3} />
        <ThemeToggle />
        <LanguageSwitcher bind:value={lang} variant="labelled" />
      </div>
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="data" title="Data display" description="Metrics, stats, rows, sparklines, ratings.">
    <div class="grid gap-4 sm:grid-cols-3">
      <StatCard label="In progress" value="12" delta={8} icon={statIcon} />
      <StatCard label="Completed" value="847" delta={-2} invertDelta sparkline={[4, 6, 5, 8, 7, 9, 5]} />
      <StatCardHighlight label="Total revenue" value="Rp 24.8M" delta={12.4} sparkline={[4, 6, 8, 7, 9, 11, 10]} />
    </div>
    <Separator class="my-5" />
    <div class="flex flex-wrap items-center gap-6">
      <MetricDelta value={12.4} />
      <MetricDelta value={-3.2} invert />
      <UserChip name="Ahmad Rizki" role="Admin" />
      <Rating bind:value={rating} />
      <Sparkline data={[4, 6, 5, 8, 7, 9, 5, 11]} width={100} height={36} />
    </div>
    <div class="mt-5 max-w-lg space-y-1 rounded-card border border-hairline p-2">
      <ListRow title="Food Delivery Co." subtitle="Onboarding" badge="In Progress" badgeTone="queued" delta={12} />
      <ListRow title="Retail Plus" subtitle="Follow-up" badge="Urgent" badgeTone="negative" delta={-4} />
    </div>
    <div class="mt-5 max-w-md space-y-2 rounded-card border border-hairline p-4">
      <KeyValuePair label="Status" value="In Progress" />
      <KeyValuePair label="Assignee" value="Sarah Chen" />
      <CopyToClipboard value="https://actjom.app/invite/abc123" label="Invite link" />
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="feedback" title="Feedback blocks" description="Inline alerts, toast pills, and empty states.">
    <div class="space-y-5">
      <div class="flex flex-wrap items-center gap-3">
        <Toast message="Checklist berhasil dihapus." tone="success" />
        <Toast message="Gagal menyimpan data." tone="error" />
        <Toast message="Syarat checklist wajib diisi." tone="warning" />
      </div>

      {#if alertVisible}
        <AlertInline title="Changes saved" tone="positive" dismissible onclose={() => (alertVisible = false)}>
          Board layout updated successfully.
        </AlertInline>
      {/if}
      <AlertInline title="Follow-up overdue" tone="warning">
        3 customers haven't been contacted in 7+ days.
      </AlertInline>
      <EmptyStateBlock
        title="No customers yet"
        description="Create your first onboarding card."
        actionLabel="Add customer"
        onaction={() => {}}
        icon={emptyIcon}
      />
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="inventory" title="Full molecule inventory" description="All exports from $lib/components/molecules/index.js">
    <div class="flex flex-wrap gap-2">
      {#each moleculeList as name (name)}
        <Badge tone="done">{name}</Badge>
      {/each}
    </div>
  </ShowcaseSection>
</div>

{#snippet navIcon()}
  <HugeiconsIcon icon={Home09Icon} size={18} strokeWidth={1.8} />
{/snippet}

{#snippet statIcon()}
  <IconChip>{@render kanbanSnippet()}</IconChip>
{/snippet}

{#snippet kanbanSnippet()}
  <HugeiconsIcon icon={KanbanIcon} size={18} strokeWidth={1.8} />
{/snippet}

{#snippet emptyIcon()}
  <HugeiconsIcon icon={KanbanIcon} size={28} strokeWidth={1.8} />
{/snippet}
