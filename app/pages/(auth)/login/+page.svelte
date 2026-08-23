<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { api, ApiError } from '$lib/api/client';
  import { Link } from '$lib/components/atoms/index.js';
  import { LoginForm } from '$lib/components/organisms/index.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let email = $state('');
  let password = $state('');
  let remember = $state(false);
  let error = $state<string | undefined>(undefined);
  let loading = $state(false);

  async function handleSubmit({ email: e, password: p }: { email: string; password: string; remember: boolean }) {
    error = undefined;
    loading = true;
    const dest = data.redirectTo || '/dashboard';
    try {
      await api.login({ email: e, password: p });
      await invalidateAll();
      await goto(dest);
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Terjadi kesalahan. Coba lagi.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Masuk — Flowboard</title></svelte:head>

<LoginForm
  bind:email
  bind:password
  bind:remember
  {error}
  {loading}
  title="Masuk ke Flowboard"
  subtitle="Kelola onboarding pelanggan — tanpa pelanggan tercicir."
  submitLabel="Masuk"
  onSubmit={handleSubmit}
>
  {#snippet footer()}
    Belum punya akun?
    <Link href="/register" class="font-semibold">Daftar gratis</Link>
  {/snippet}
</LoginForm>
