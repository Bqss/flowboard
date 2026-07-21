<script lang="ts">
  import Badge from '$lib/components/atoms/Badge.svelte';
  import StatCard from '$lib/components/molecules/StatCard.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  /** Initials for the avatar circle from a display name. */
  function initials(name: string) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }
</script>

<svelte:head><title>Dashboard — Narko</title></svelte:head>

<div class="mx-auto w-full max-w-[1240px]">
  <header class="flex flex-col gap-2">
    <div class="flex items-center gap-3">
      <h1 class="font-display text-3xl font-semibold tracking-tight text-ink">Dashboard</h1>
      <Badge tone="green" dot>Live</Badge>
    </div>
    <p class="text-sm text-mute">
      Signed in as <span class="font-medium text-ink">{data.user?.name}</span>
      <span class="text-ash">· {data.user?.email}</span>
    </p>
  </header>

  <div class="mt-8 grid gap-4 sm:grid-cols-3">
    <StatCard value={String(data.users.length)} label="Total users" sub="registered accounts" />
    <StatCard value="1" label="Active session" sub="this browser" />
    <StatCard value="Postgres" label="Data store" sub="Drizzle ORM" />
  </div>

  <section class="mt-8 overflow-hidden rounded-xl border border-hairline bg-surface">
    <div class="flex items-center justify-between border-b border-hairline px-5 py-4">
      <h2 class="text-sm font-medium text-ink">Users</h2>
      <span class="rounded-full border border-hairline bg-elevated px-2.5 py-0.5 text-[12px] font-medium text-mute">
        {data.users.length}
      </span>
    </div>

    <ul class="divide-y divide-hairline">
      {#each data.users as user (user.id)}
        <li class="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.02]">
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-elevated text-[12px] font-semibold text-charcoal"
          >
            {initials(user.name)}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-ink">{user.name}</span>
            <span class="block truncate text-[13px] text-mute">{user.email}</span>
          </span>
        </li>
      {:else}
        <li class="px-5 py-10 text-center text-sm text-ash">No users yet.</li>
      {/each}
    </ul>
  </section>
</div>
