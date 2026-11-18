<script lang="ts">
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
  import ShowcaseSection from '../ShowcaseSection.svelte';
  import { Button, Checkbox, Switch, Slider, Tooltip, Label, Input, Textarea } from '$lib/components/atoms/index.js';
  import SearchInput from '$lib/components/molecules/SearchInput.svelte';
  import PasswordInput from '$lib/components/molecules/PasswordInput.svelte';
  import TagInput from '$lib/components/molecules/TagInput.svelte';
  import Radio from '$lib/components/atoms/Radio.svelte';
  import Dialog from '$lib/components/organisms/Dialog.svelte';
  import Sheet from '$lib/components/organisms/Sheet.svelte';
  import Popover from '$lib/components/organisms/Popover.svelte';
  import NotificationCenter from '$lib/components/organisms/NotificationCenter.svelte';
  import CommandPalette from '$lib/components/organisms/CommandPalette.svelte';
  import DropdownMenu from '$lib/components/molecules/DropdownMenu.svelte';
  import ContextMenu from '$lib/components/molecules/ContextMenu.svelte';
  import SelectMenu from '$lib/components/molecules/SelectMenu.svelte';
  import Combobox from '$lib/components/molecules/Combobox.svelte';
  import MultiSelectCombobox from '$lib/components/molecules/MultiSelectCombobox.svelte';
  import InternalPicPicker from '$lib/components/molecules/InternalPicPicker.svelte';
  import TaskPicPicker from '$lib/components/molecules/TaskPicPicker.svelte';
  import PortalUserPicker from '$lib/components/molecules/PortalUserPicker.svelte';
  import TimePicker from '$lib/components/molecules/TimePicker.svelte';
  import LanguageSwitcher from '$lib/components/molecules/LanguageSwitcher.svelte';
  import DatePicker from '$lib/components/molecules/DatePicker.svelte';
  import DateRangePicker from '$lib/components/molecules/DateRangePicker.svelte';
  import Tabs from '$lib/components/molecules/Tabs.svelte';
  import RadioGroup from '$lib/components/molecules/RadioGroup.svelte';
  import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
  import type { MenuItem, Option, TabItem } from '$lib/components/molecules/shared.js';
  import type { CommandItem, NotificationItem } from '$lib/components/organisms/shared.js';

  // ---- state -------------------------------------------------------------
  let dialogOpen = $state(false);
  let sheetOpen = $state(false);
  let popoverOpen = $state(false);
  let paletteOpen = $state(false);
  let lastAction = $state('—');

  let selectValue = $state('queued');
  let comboValue = $state('');
  let multiValues = $state<string[]>(['ahmad']);
  let multiPrimary = $state<string | null>('ahmad');
  let staffAssigned = $state<string[]>(['sarah']);
  let staffPrimary = $state<string | null>('sarah');
  let taskValues = $state<string[]>([]);
  let portalUser = $state('');
  let time = $state('09:00');
  let language = $state('id');
  let date = $state('');
  let rangeStart = $state('');
  let rangeEnd = $state('');
  let tab = $state('list');
  let checked = $state(true);
  let indeterminate = $state(false);
  let switchOn = $state(false);
  let radio = $state('standard');
  let sliderValue = $state(40);
  let searchQ = $state('');
  let password = $state('');
  let tags = $state<string[]>(['VIP', 'FBO']);
  let richText = $state('<p>Coba <strong>format</strong> teks di sini.</p>');

  // ---- fixtures ----------------------------------------------------------
  const statusOptions: Option[] = [
    { value: 'queued', label: 'Queued', description: 'Belum dimulai' },
    { value: 'progress', label: 'In Progress', description: 'Sedang dikerjakan' },
    { value: 'done', label: 'Done', description: 'Selesai' }
  ];

  const members = [
    { value: 'ahmad', label: 'Ahmad Rizki', role: 'Ops Lead' },
    { value: 'sarah', label: 'Sarah Chen', role: 'Admin' },
    { value: 'budi', label: 'Budi Santoso', role: 'Member' }
  ];
  const memberOptions = members.map((m) => ({ value: m.value, label: m.label, description: m.role }));
  const staff = members.map((m) => ({ id: m.value, full_name: m.label }));

  const menuItems: MenuItem[] = [
    { label: 'Edit card', shortcut: '⌘E', onselect: () => (lastAction = 'Edit card') },
    { label: 'Move lane', onselect: () => (lastAction = 'Move lane') },
    { label: 'Delete', destructive: true, separatorBefore: true, onselect: () => (lastAction = 'Delete') }
  ];

  const tabItems: TabItem[] = [
    { value: 'list', label: 'List', badge: 3 },
    { value: 'board', label: 'Board' },
    { value: 'timeline', label: 'Timeline' }
  ];

  const notifications: NotificationItem[] = [
    { id: 'n1', title: 'Follow-up due', body: 'Food Delivery Co. — 3 hari idle', time: '2 menit', unread: true },
    { id: 'n2', title: 'Kartu dipindah', body: 'Customer onboarding → Done', time: 'Kemarin' }
  ];

  const commands: CommandItem[] = [
    { id: 'new', label: 'Buat papan baru', group: 'Papan', shortcut: '⌘N', onselect: () => (lastAction = 'Buat papan') },
    { id: 'chat', label: 'Buka Mesej', group: 'Navigasi', onselect: () => (lastAction = 'Buka Mesej') },
    { id: 'members', label: 'Undang ahli', group: 'Ahli', keywords: 'invite team', onselect: () => (lastAction = 'Undang ahli') }
  ];
</script>

<section class="space-y-10">
  <header class="space-y-2">
    <h1 class="ds-page-title text-ink">Komponen Bits — preview</h1>
    <p class="ds-body max-w-2xl text-mute">
      Semua komponen yang sudah dipindah ke Bits UI dalam satu halaman. Setiap demo memakai komponen
      aslinya dari <code class="ds-mono">$lib/components</code>. Aksi terakhir:
      <span class="font-semibold text-ink">{lastAction}</span>
    </p>
  </header>

  <ShowcaseSection id="overlays" title="Overlays" description="Dialog, sheet, popover, dan command palette. Semua portal dengan focus trap dan Escape.">
    <div class="flex flex-wrap gap-3">
      <Button onclick={() => (dialogOpen = true)}>Dialog</Button>
      <Button variant="secondary" onclick={() => (sheetOpen = true)}>Sheet</Button>
      <Button variant="secondary" onclick={() => (paletteOpen = true)}>Command palette ⌘K</Button>
      <Popover bind:open={popoverOpen} label="Popover">
        {#snippet trigger({ toggle })}
          <Button variant="ghost" onclick={toggle}>Popover</Button>
        {/snippet}
        {#snippet content()}
          <p class="ds-body px-2 py-1 text-ink">Isi popover. Klik di luar atau Escape untuk menutup.</p>
        {/snippet}
      </Popover>
      <NotificationCenter items={notifications} />
    </div>

    <Dialog bind:open={dialogOpen} title="Pengaturan Papan" description="Judul dan shadow modal sekarang dari token app.">
      <p class="ds-body text-mute">Isi dialog. Tekan Tab untuk melihat focus trap.</p>
      {#snippet footer()}
        <Button variant="ghost" onclick={() => (dialogOpen = false)}>Batal</Button>
        <Button onclick={() => (dialogOpen = false)}>Simpan</Button>
      {/snippet}
    </Dialog>

    <Sheet bind:open={sheetOpen} title="Detail customer">
      <p class="ds-body text-mute">Klik scrim di sisi kiri untuk menutup.</p>
    </Sheet>

    <CommandPalette bind:open={paletteOpen} items={commands} />
  </ShowcaseSection>

  <ShowcaseSection id="menus" title="Menu" description="Dropdown dan context menu (klik kanan di area bawah).">
    <div class="flex flex-wrap items-start gap-6">
      <DropdownMenu items={menuItems} label="Card actions">
        {#snippet trigger({ toggle })}
          <Button variant="secondary" onclick={toggle}>Actions <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={1.8} /></Button>
        {/snippet}
      </DropdownMenu>
      <ContextMenu items={menuItems}>
        <div class="grid min-h-28 min-w-64 place-items-center rounded-card border border-dashed border-hairline bg-lane/50 px-6 text-center">
          <p class="ds-caption text-mute">Klik kanan di sini</p>
        </div>
      </ContextMenu>
      <Tooltip text="Tooltip dengan role=tooltip">
        <Button variant="ghost">Hover saya</Button>
      </Tooltip>
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="selects" title="Select & combobox" description="Listbox dan pencarian di atas Bits Select / Combobox.">
    <div class="grid gap-6 md:grid-cols-2">
      <div class="space-y-2">
        <Label>Status (SelectMenu)</Label>
        <SelectMenu options={statusOptions} bind:value={selectValue} />
      </div>
      <div class="space-y-2">
        <Label>Cari orang (Combobox)</Label>
        <Combobox options={memberOptions} bind:value={comboValue} placeholder="Cari…" />
      </div>
      <div class="space-y-2">
        <Label>Multi-select dengan primary</Label>
        <MultiSelectCombobox options={memberOptions} bind:values={multiValues} bind:primary={multiPrimary} showPrimaryBadge />
      </div>
      <div class="space-y-2">
        <Label>PIC (TaskPicPicker)</Label>
        <TaskPicPicker options={memberOptions} bind:values={taskValues} />
      </div>
      <div class="space-y-2">
        <Label>Staff (InternalPicPicker)</Label>
        <InternalPicPicker {staff} bind:assigned={staffAssigned} bind:primary={staffPrimary} />
      </div>
      <div class="space-y-2">
        <Label>User portal (PortalUserPicker — butuh API DripSender)</Label>
        <PortalUserPicker bind:value={portalUser} />
      </div>
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="dates" title="Waktu & tanggal" description="TimePicker, DatePicker, dan DateRangePicker.">
    <div class="grid gap-6 md:grid-cols-2">
      <div class="space-y-2">
        <Label>Jam (TimePicker)</Label>
        <TimePicker bind:value={time} />
      </div>
      <div class="space-y-2">
        <Label>Tanggal (DatePicker)</Label>
        <DatePicker bind:value={date} />
      </div>
      <div class="space-y-2 md:col-span-2">
        <Label>Rentang (DateRangePicker)</Label>
        <DateRangePicker bind:start={rangeStart} bind:end={rangeEnd} />
      </div>
      <div class="space-y-2">
        <Label>Bahasa (LanguageSwitcher)</Label>
        <LanguageSwitcher bind:value={language} variant="labelled" />
      </div>
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="controls" title="Kontrol & navigasi" description="Tabs, checkbox, switch, radio, dan slider.">
    <div class="space-y-6">
      <Tabs items={tabItems} bind:value={tab} />
      <div class="flex flex-wrap items-center gap-6">
        <label class="flex items-center gap-2 text-ink"><Checkbox bind:checked /> Checkbox</label>
        <label class="flex items-center gap-2 text-ink"><Checkbox bind:checked={indeterminate} /> Indeterminate</label>
        <label class="flex items-center gap-2 text-ink"><Switch bind:checked={switchOn} /> Switch</label>
      </div>
      <RadioGroup
        legend="Jenis onboarding"
        options={[
          { value: 'standard', label: 'Standard onboarding' },
          { value: 'vip', label: 'VIP onboarding', description: 'Dengan dedicated support' }
        ]}
        bind:value={radio}
      />
      <div class="max-w-sm space-y-2">
        <Label>Slider — {sliderValue}</Label>
        <Slider bind:value={sliderValue} />
      </div>
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="rich" title="Rich text editor" description="Toolbar memakai Bits DropdownMenu. Pilih teks lalu buka menu Gaya teks, Format, atau Daftar.">
    <RichTextEditor bind:value={richText} placeholder="Tulis sesuatu…" />
  </ShowcaseSection>
  <ShowcaseSection id="fields" title="Field & input" description="Semua field memakai spesifikasi yang sama: tinggi 40px, radius 10px, border hairline, font 14px.">
    <div class="grid gap-6 md:grid-cols-2">
      <div class="space-y-2"><Label>Input</Label><Input placeholder="you@company.com" /></div>
      <div class="space-y-2"><Label>Input invalid</Label><Input invalid value="salah" /></div>
      <div class="space-y-2"><Label>Input sm</Label><Input size="sm" placeholder="Ukuran kecil" /></div>
      <div class="space-y-2"><Label>Password (strength)</Label><PasswordInput strength bind:value={password} placeholder="Kata sandi" /></div>
      <div class="space-y-2"><Label>Search</Label><SearchInput bind:value={searchQ} placeholder="Cari tugas…" /></div>
      <div class="space-y-2"><Label>Search (topbar, dengan tombol)</Label><SearchInput bind:value={searchQ} submit placeholder="Cari…" /></div>
      <div class="space-y-2 md:col-span-2"><Label>Tags</Label><TagInput bind:value={tags} placeholder="+ Tambah label…" /></div>
      <div class="space-y-2 md:col-span-2"><Label>Textarea</Label><Textarea rows={3} placeholder="Penerangan…" /></div>
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="buttons" title="Tombol" description="Radius tombol 10px (md), sama dengan field dan kartu.">
    <div class="flex flex-wrap items-center gap-3">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="secondary" size="sm">Small</Button>
      <Button variant="secondary" disabled>Disabled</Button>
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="tabs" title="Tabs" description="Tiga varian dengan radius yang sama (md / sm).">
    <div class="space-y-5">
      <Tabs items={tabItems} bind:value={tab} variant="underline" />
      <Tabs items={tabItems} bind:value={tab} variant="pills" />
      <Tabs items={tabItems} bind:value={tab} variant="segmented" />
    </div>
  </ShowcaseSection>

  <ShowcaseSection id="card" title="Kartu" description="Kartu memakai radius card (10px), sama dengan field.">
    <div class="rounded-card border border-hairline bg-card p-5 shadow-[var(--shadow-card)]">
      <p class="ds-section-title text-ink">Judul kartu</p>
      <p class="ds-body mt-1 text-mute">Contoh isi kartu dengan radius dan border yang seragam.</p>
    </div>
  </ShowcaseSection>
</section>
