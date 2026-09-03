<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { api, ApiError } from '$lib/api/client';
  import { Badge, Button, Link, Logo } from '$lib/components/atoms/index.js';
  import { cardShellClass } from '$lib/components/organisms/shared.js';
  import { cn } from '$lib/utils.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let loading = $state(false);
  let error = $state<string | null>(null);

  $effect(() => {
    error = data.error ?? null;
  });

  const invitePath = $derived(`/invite/${data.token}`);

  async function accept() {
    loading = true;
    error = null;
    try {
      await api.acceptInvite(data.token);
      await invalidateAll();
      await goto('/dashboard');
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Gagal menerima undangan.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Undangan workspace — actjom</title></svelte:head>

<div class={cn(cardShellClass, 'mx-auto w-full max-w-md border border-hairline p-6 md:p-8')}>
  <div class="mb-6 flex flex-col items-center text-center">
    <Logo size={44} class="mb-3" />
    {#if data.invite}
      <h1 class="ds-page-title text-ink">Gabung workspace</h1>
      <p class="ds-body mt-1 text-mute">
        Kamu diundang ke <strong class="text-ink">{data.invite.workspaceName}</strong>
      </p>
      <Badge tone="queued" class="mt-3">{data.invite.role}</Badge>
    {:else}
      <h1 class="ds-page-title text-ink">Undangan tidak valid</h1>
      <p class="ds-body mt-1 text-mute">{error ?? 'Link undangan ini sudah tidak berlaku.'}</p>
    {/if}
  </div>

  {#if data.invite}
    <p class="ds-caption mb-6 text-center text-mute">
      Untuk email <strong class="text-ink-soft">{data.invite.email}</strong>
    </p>

    {#if !data.user}
      <div class="space-y-3 text-center ds-body text-mute">
        <p>Masuk atau daftar dengan email di atas untuk menerima undangan.</p>
        <div class="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button href="/login?redirect={encodeURIComponent(invitePath)}&email={encodeURIComponent(data.invite.email)}" variant="primary">
            Masuk
          </Button>
          <Button href="/register?redirect={encodeURIComponent(invitePath)}&email={encodeURIComponent(data.invite.email)}" variant="secondary">
            Daftar
          </Button>
        </div>
      </div>
    {:else if data.user.email.toLowerCase() !== data.invite.email.toLowerCase()}
      <p class="ds-body text-center text-status-urgent">
        Kamu masuk sebagai {data.user.email}. Gunakan {data.invite.email} untuk menerima undangan.
      </p>
      <p class="mt-4 text-center">
        <Link href="/login?redirect={encodeURIComponent(invitePath)}&email={encodeURIComponent(data.invite.email)}">Ganti akun</Link>
      </p>
    {:else}
      {#if error}
        <p class="ds-caption mb-4 text-center text-status-urgent">{error}</p>
      {/if}
      <Button type="button" variant="primary" class="w-full" {loading} onclick={accept}>
        {loading ? 'Bergabung…' : 'Terima undangan'}
      </Button>
    {/if}
  {:else}
    <div class="text-center">
      <Link href="/login">Ke halaman masuk</Link>
    </div>
  {/if}
</div>
