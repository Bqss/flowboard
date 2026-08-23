<script lang="ts">
  import { Badge } from '$lib/components/atoms/index.js';
  import { categories } from './showcase-nav.js';

  const layers = categories.filter((c) => c.count > 0);
</script>

<svelte:head>
  <title>Design System — Overview</title>
</svelte:head>

<div class="space-y-12 pb-16">
  <div class="space-y-3">
    <Badge tone="queued">110 components</Badge>
    <p class="ds-body max-w-2xl text-mute">
      Living catalog of the Flowboard UI kit — bright kanban workspace with indigo brand,
      pill buttons, lane trays, and status-colored pills. Reference implementation for
      <code class="rounded-sm bg-lane px-1.5 py-0.5 text-[13px] text-primary-ink">DESIGN.md</code>.
    </p>
  </div>

  <div class="grid gap-4 sm:grid-cols-3">
    {#each layers as layer (layer.href)}
      <a
        href={layer.href}
        class="group rounded-lane border border-hairline bg-card p-6 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
      >
        <p class="ds-section-title text-ink group-hover:text-primary">{layer.label}</p>
        <p class="ds-caption mt-1 text-faint">{layer.count} components</p>
        <p class="ds-body mt-3 text-mute">{layer.description}</p>
        <p class="ds-label mt-4 text-primary">View showcase →</p>
      </a>
    {/each}
  </div>

  <section class="rounded-lane bg-lane p-6">
    <h2 class="ds-section-title text-ink">Design principles</h2>
    <ul class="ds-body mt-4 space-y-2 text-mute">
      <li><strong class="text-ink-soft">Light canvas</strong> — white background, slate lane trays, white floating cards</li>
      <li><strong class="text-ink-soft">One brand hue</strong> — indigo <code class="text-primary-ink">#4f46e5</code> for primary actions</li>
      <li><strong class="text-ink-soft">Status language</strong> — queued · progress · done · urgent · idle</li>
      <li><strong class="text-ink-soft">Pill geometry</strong> — buttons, inputs, and chips are fully rounded</li>
      <li><strong class="text-ink-soft">Hugeicons</strong> — stroke-rounded outline icons at 1.8px</li>
    </ul>
  </section>

  <section class="rounded-lane bg-lane p-6">
    <h2 class="ds-section-title text-ink">Import</h2>
    <pre class="mt-3 overflow-x-auto rounded-card bg-card p-4 text-[13px] text-body shadow-[var(--shadow-control)]"><code>import {'{'} Button, Badge {'}'} from '$lib/components/atoms/index.js';
import {'{'} Tabs, StatCard {'}'} from '$lib/components/molecules/index.js';
import {'{'} KanbanBoard {'}'} from '$lib/components/organisms/index.js';</code></pre>
    <p class="ds-caption mt-3 text-faint">
      Wrap app surfaces with <code class="text-primary-ink">data-theme="app"</code> and import
      <code class="text-primary-ink">app/ds.css</code>.
    </p>
  </section>
</div>
