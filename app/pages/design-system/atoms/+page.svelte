<script lang="ts">
  import ShowcaseSection from '../ShowcaseSection.svelte';
  import ShowcaseSubnav from '../ShowcaseSubnav.svelte';
  import {
    Button,
    Badge,
    Avatar,
    Input,
    Textarea,
    Checkbox,
    Radio,
    Switch,
    Slider,
    Chip,
    StatusDot,
    ProgressBar,
    Skeleton,
    Spinner,
    Separator,
    Label,
    Heading,
    Text,
    Caption,
    Link,
    Code,
    Kbd,
    HelperText,
    ErrorText,
    IconButton,
    Logo,
    Tooltip,
    Icon,
    Image,
    Portal
  } from '$lib/components/atoms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Add01Icon,
    Search01Icon,
    Notification03Icon,
    Settings01Icon,
    CheckmarkCircle02Icon,
    Alert02Icon,
    InformationCircleIcon
  } from '@hugeicons/core-free-icons';

  const subnav = [
    { href: '#tokens', label: 'Tokens' },
    { href: '#buttons', label: 'Buttons' },
    { href: '#forms', label: 'Forms' },
    { href: '#badges', label: 'Badges' },
    { href: '#display', label: 'Display' },
    { href: '#feedback', label: 'Loading' },
    { href: '#inventory', label: 'Inventory' }
  ];

  let switchOn = $state(true);
  let checkboxOn = $state(true);
  let radioValue = $state('a');
  let sliderValue = $state(40);
  let portalOpen = $state(false);

  const solidColors = [
    { name: 'primary', var: '--color-primary', hex: '#4f46e5' },
    { name: 'status-queued', var: '--color-status-queued', hex: '#4f46e5' },
    { name: 'status-progress', var: '--color-status-progress', hex: '#f59e0b' },
    { name: 'status-done', var: '--color-status-done', hex: '#22c55e' },
    { name: 'status-urgent', var: '--color-status-urgent', hex: '#f43f5e' },
    { name: 'status-idle', var: '--color-status-idle', hex: '#94a3b8' }
  ];

  const softColors = [
    { name: 'primary-soft', var: '--color-primary-soft', hex: '#eef2ff' },
    { name: 'lane', var: '--color-lane', hex: '#f1f5f9' },
    { name: 'queued-soft', var: '--color-status-queued-soft', hex: '#eef2ff' },
    { name: 'progress-soft', var: '--color-status-progress-soft', hex: '#fffbeb' },
    { name: 'done-soft', var: '--color-status-done-soft', hex: '#f0fdf4' },
    { name: 'urgent-soft', var: '--color-status-urgent-soft', hex: '#fff1f2' }
  ];

  const atomList = [
    'Button', 'IconButton', 'Input', 'Textarea', 'Checkbox', 'Radio', 'Switch', 'Slider',
    'Badge', 'Chip', 'StatusDot', 'Avatar', 'Logo', 'ProgressBar', 'Spinner', 'Skeleton',
    'Separator', 'Tooltip', 'Heading', 'Text', 'Label', 'Caption', 'Link', 'Code', 'Kbd',
    'HelperText', 'ErrorText', 'Icon', 'Image', 'Portal'
  ];
</script>

<svelte:head>
  <title>Atoms — Design System</title>
</svelte:head>

<div class="space-y-10 pb-16">
  <div class="space-y-3">
    <Badge tone="done">30/30 atoms · live demo</Badge>
    <p class="ds-body max-w-2xl text-mute">
      Smallest building blocks — every export from <Code>$lib/components/atoms</Code>.
      Compose into molecules; never import organisms from atom-level code.
    </p>
    <ShowcaseSubnav items={subnav} />
  </div>

  <ShowcaseSection id="tokens" title="Color & typography tokens" description="CSS variables from DESIGN.md — scoped to data-theme=&quot;app&quot;.">
    <p class="ds-label mb-3 text-ink-soft">Solid hues</p>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {#each solidColors as swatch (swatch.name)}
        <div class="space-y-2">
          <div
            class="h-16 rounded-card border border-hairline shadow-control"
            style={`background: var(${swatch.var})`}
          ></div>
          <p class="ds-caption text-mute">{swatch.name}</p>
          <p class="ds-caption text-faint">{swatch.hex}</p>
        </div>
      {/each}
    </div>
    <Separator class="my-6" />
    <p class="ds-label mb-3 text-ink-soft">Soft surfaces</p>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {#each softColors as swatch (swatch.name)}
        <div class="space-y-2">
          <div
            class="h-16 rounded-card border border-hairline"
            style={`background: var(${swatch.var})`}
          ></div>
          <p class="ds-caption text-mute">{swatch.name}</p>
          <p class="ds-caption text-faint">{swatch.hex}</p>
        </div>
      {/each}
    </div>
    <Separator class="my-6" />
    <div class="space-y-3">
      <p class="ds-page-title text-ink">Page title</p>
      <p class="ds-section-title text-ink">Section title</p>
      <p class="ds-stat text-ink">24,891</p>
      <p class="ds-body text-body">Body · 15px / 500</p>
      <p class="ds-label text-mute">Label · controls</p>
      <p class="ds-caption text-faint">Caption · metadata</p>
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="buttons" title="Button & IconButton" description="Pill actions — semantic status variants plus lane CTAs.">
    <p class="ds-label mb-3 text-ink-soft">Core variants</p>
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="tertiary">Tertiary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
    <Separator class="my-5" />
    <p class="ds-label mb-3 text-ink-soft">Semantic</p>
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="success">Success</Button>
      <Button variant="info">Info</Button>
      <Button variant="warning">Warning</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
    <Separator class="my-5" />
    <p class="ds-label mb-3 text-ink-soft">Sizes</p>
    <div class="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button variant="primary" loading>Loading</Button>
      <Button variant="primary" disabled>Disabled</Button>
    </div>
    <Separator class="my-5" />
    <p class="ds-label mb-3 text-ink-soft">Lane CTAs</p>
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="lane" lane="queued" size="lane" class="max-w-xs">
        <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.8} />
        Lane queued
      </Button>
      <Button variant="lane" lane="progress" size="lane" class="max-w-xs">
        <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.8} />
        Lane progress
      </Button>
      <Button variant="lane" lane="done" size="lane" class="max-w-xs">
        <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.8} />
        Lane done
      </Button>
    </div>
    <Separator class="my-5" />
    <p class="ds-label mb-3 text-ink-soft">IconButton</p>
    <div class="flex flex-wrap items-center gap-3">
      <IconButton label="Search" variant="card">
        <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.8} />
      </IconButton>
      <IconButton label="Notifications" variant="ghost" size="sm">
        <HugeiconsIcon icon={Notification03Icon} size={18} strokeWidth={1.8} />
      </IconButton>
      <IconButton label="Settings" variant="rail-active">
        <HugeiconsIcon icon={Settings01Icon} size={20} strokeWidth={1.8} />
      </IconButton>
      <IconButton label="Primary" variant="primary" size="lg">
        <HugeiconsIcon icon={Add01Icon} size={20} strokeWidth={1.8} />
      </IconButton>
      <IconButton label="Bare" variant="bare">
        <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.8} />
      </IconButton>
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="forms" title="Form inputs" description="Rounded-full fields — subtle 2px focus ring, not the heavy global outline.">
    <div class="grid max-w-2xl gap-6">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-1.5">
          <Label for="email">Email · md</Label>
          <Input id="email" type="email" placeholder="you@company.com" />
          <HelperText>Used for login notifications</HelperText>
        </div>
        <div class="space-y-1.5">
          <Label for="email-sm">Email · sm</Label>
          <Input id="email-sm" type="email" size="sm" placeholder="you@company.com" />
        </div>
      </div>
      <div class="space-y-1.5">
        <Label for="email-invalid">Invalid state</Label>
        <Input id="email-invalid" invalid placeholder="invalid@email" />
        <ErrorText>Please enter a valid email address</ErrorText>
      </div>
      <div class="space-y-1.5">
        <Label for="notes">Textarea</Label>
        <Textarea id="notes" placeholder="Onboarding notes…" rows={3} />
      </div>
      <div class="flex flex-wrap items-center gap-8">
        <Label class="flex items-center gap-2">
          <Checkbox bind:checked={checkboxOn} />
          Checkbox
        </Label>
        <Label class="flex items-center gap-2">
          <Checkbox size="sm" />
          Checkbox sm
        </Label>
        <Label class="flex items-center gap-2">
          <Switch bind:checked={switchOn} />
          Switch
        </Label>
      </div>
      <div class="space-y-2">
        <Label>Radio group</Label>
        <div class="flex gap-4">
          <Label class="flex items-center gap-2">
            <Radio name="demo" value="a" bind:group={radioValue} />
            Option A
          </Label>
          <Label class="flex items-center gap-2">
            <Radio name="demo" value="b" bind:group={radioValue} />
            Option B
          </Label>
        </div>
      </div>
      <div class="space-y-2">
        <Label>Slider · {sliderValue}%</Label>
        <Slider bind:value={sliderValue} />
      </div>
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="badges" title="Badge, Chip & StatusDot" description="Status tags with soft fill + border for readable contrast.">
    <p class="ds-label mb-3 text-ink-soft">Soft badges · all tones</p>
    <div class="flex flex-wrap gap-2">
      <Badge tone="neutral">Neutral</Badge>
      <Badge tone="queued">Important</Badge>
      <Badge tone="progress">In Progress</Badge>
      <Badge tone="done">Complete</Badge>
      <Badge tone="urgent">Overdue</Badge>
      <Badge tone="idle">Not started</Badge>
      <Badge tone="positive">Positive</Badge>
      <Badge tone="negative">Negative</Badge>
      <Badge tone="warning">Warning</Badge>
      <Badge tone="info">Info</Badge>
    </div>
    <Separator class="my-5" />
    <p class="ds-label mb-3 text-ink-soft">Solid pills</p>
    <div class="flex flex-wrap gap-2">
      <Badge variant="solid" solid="queued">Started</Badge>
      <Badge variant="solid" solid="progress">Ongoing</Badge>
      <Badge variant="solid" solid="done">Done</Badge>
      <Badge variant="solid" solid="urgent">P1</Badge>
      <Badge variant="solid" solid="idle">Idle</Badge>
    </div>
    <Separator class="my-5" />
    <p class="ds-label mb-3 text-ink-soft">Outline</p>
    <div class="flex flex-wrap gap-2">
      <Badge variant="outline" tone="queued">Queued</Badge>
      <Badge variant="outline" tone="progress">Progress</Badge>
      <Badge variant="outline" tone="done">Done</Badge>
    </div>
    <Separator class="my-5" />
    <p class="ds-label mb-3 text-ink-soft">Chips & status dots</p>
    <div class="flex flex-wrap items-center gap-3">
      <Chip tone="queued">VIP</Chip>
      <Chip tone="positive">Verified</Chip>
      <Chip tone="warning">Pending</Chip>
      <Chip tone="negative" removable onremove={() => {}}>Urgent</Chip>
      <StatusDot tone="done" label="Online" />
      <StatusDot tone="progress" pulse label="Syncing" />
      <StatusDot tone="urgent" label="Overdue" />
      <StatusDot tone="idle" label="Idle" />
    </div>
    <Separator class="my-5" />
    <p class="ds-label mb-3 text-ink-soft">Avatar & Logo</p>
    <div class="flex flex-wrap items-center gap-4">
      <Avatar name="Ahmad Rizki" online />
      <Avatar name="Sarah Chen" size={36} />
      <Avatar name="Budi" size={28} />
      <Logo size={32} />
      <Logo size={40} />
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="display" title="Typography, Icon, Image & Portal" description="Text primitives plus media helpers.">
    <div class="space-y-4">
      <Heading level={1}>Heading 1</Heading>
      <Heading level={2}>Heading 2</Heading>
      <Heading level={3}>Heading 3</Heading>
      <Text>Default body text for paragraphs.</Text>
      <Text muted>Muted supporting copy.</Text>
      <Caption>Caption metadata</Caption>
      <p>
        <Link href="/design-system">Inline link</Link>
        · Press <Kbd>⌘</Kbd> + <Kbd>K</Kbd> · Inline <Code>const x = 1</Code>
      </p>
    </div>
    <Separator class="my-6" />
    <div class="flex flex-wrap items-center gap-6">
      <Icon size={24}>
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} strokeWidth={1.8} class="text-status-done" />
      </Icon>
      <Icon size={24}>
        <HugeiconsIcon icon={Alert02Icon} size={24} strokeWidth={1.8} class="text-status-urgent" />
      </Icon>
      <Icon size={24}>
        <HugeiconsIcon icon={InformationCircleIcon} size={24} strokeWidth={1.8} class="text-status-queued" />
      </Icon>
      <Tooltip text="Tooltip on hover">
        <Button variant="ghost">Hover me</Button>
      </Tooltip>
    </div>
    <Separator class="my-6" />
    <div class="grid gap-4 sm:grid-cols-3">
      <Image
        src=""
        alt="Placeholder"
        ratio="wide"
        radius="lg"
        class="w-full"
        fallback="No image"
      />
      <Image
        src=""
        alt="Square"
        ratio="square"
        radius="xl"
        class="w-full max-w-40"
        fallback="AR"
      />
      <div class="rounded-card border border-hairline p-4">
        <p class="ds-label mb-2 text-ink-soft">Portal</p>
        <Button variant="secondary" size="sm" onclick={() => (portalOpen = !portalOpen)}>
          {portalOpen ? 'Hide' : 'Show'} portaled badge
        </Button>
        {#if portalOpen}
          <Portal>
            <div class="fixed bottom-6 right-6 z-50">
              <Badge tone="done">Rendered via Portal</Badge>
            </div>
          </Portal>
        {/if}
      </div>
    </div>
    <Separator class="my-6" />
    <Separator />
    <p class="ds-caption mt-2 text-faint">Separator above</p>
  </ShowcaseSection>

  <ShowcaseSection id="feedback" title="Progress & loading" description="Progress bars, spinners, and lane-colored skeleton placeholders.">
    <div class="grid max-w-xl gap-4">
      <div class="space-y-1.5">
        <div class="flex justify-between">
          <Caption>Queued</Caption>
          <Caption>68%</Caption>
        </div>
        <ProgressBar value={68} tone="queued" />
      </div>
      <div class="space-y-1.5">
        <div class="flex justify-between">
          <Caption>Warning</Caption>
          <Caption>40%</Caption>
        </div>
        <ProgressBar value={40} tone="warning" />
      </div>
      <div class="space-y-1.5">
        <div class="flex justify-between">
          <Caption>Positive</Caption>
          <Caption>90%</Caption>
        </div>
        <ProgressBar value={90} tone="positive" />
      </div>
    </div>
    <Separator class="my-6" />
    <p class="ds-label mb-3 text-ink-soft">Spinners</p>
    <div class="flex flex-wrap items-center gap-6">
      <Spinner />
      <Spinner size={18} />
      <Spinner size={32} />
    </div>
    <Separator class="my-6" />
    <p class="ds-label mb-3 text-ink-soft">Skeleton layouts</p>
    <div class="grid gap-4 lg:grid-cols-2">
      <div class="rounded-card border border-hairline bg-card p-5 shadow-card">
        <div class="flex items-center gap-3">
          <Skeleton shape="circle" class="size-10 shrink-0" />
          <div class="min-w-0 flex-1 space-y-2">
            <Skeleton shape="text" class="h-3 w-2/3" />
            <Skeleton shape="text" class="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton class="mt-4 h-24 w-full rounded-lg" />
        <div class="mt-4 flex gap-2">
          <Skeleton class="h-8 w-20 rounded-full" />
          <Skeleton class="h-8 w-24 rounded-full" />
        </div>
      </div>
      <div class="rounded-card border border-hairline bg-card p-5 shadow-card">
        <Skeleton class="mb-4 h-4 w-32" />
        {#each Array(4) as _, i (i)}
          <div class="flex items-center gap-3 py-2.5">
            <Skeleton shape="circle" class="size-8 shrink-0" />
            <div class="flex-1 space-y-2">
              <Skeleton shape="text" class="h-3 w-full max-w-48" />
              <Skeleton shape="text" class="h-2.5 w-24" />
            </div>
            <Skeleton class="h-6 w-14 rounded-sm" />
          </div>
        {/each}
      </div>
    </div>
    <div class="mt-4 grid gap-3 sm:grid-cols-3">
      <Skeleton class="h-28 rounded-lane" />
      <Skeleton class="h-28 rounded-lane" />
      <Skeleton class="h-28 rounded-lane" />
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="inventory" title="Full atom inventory" description="All 30 exports from $lib/components/atoms/index.js">
    <div class="flex flex-wrap gap-2">
      {#each atomList as name (name)}
        <Badge tone="neutral">{name}</Badge>
      {/each}
    </div>
  </ShowcaseSection>
</div>
