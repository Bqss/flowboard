<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { api, ApiError } from '$lib/api/client';
  import { Link } from '$lib/components/atoms/index.js';
  import { RegisterForm } from '$lib/components/organisms/index.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let name = $state('');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let error = $state<string | undefined>(undefined);
  let loading = $state(false);

  async function handleSubmit(payload: { name: string; email: string; password: string }) {
    error = undefined;
    loading = true;
    const dest = data.redirectTo || '/dashboard';
    try {
      await api.register(payload);
      await invalidateAll();
      await goto(dest);
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Terjadi kesalahan. Coba lagi.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Daftar — Flowboard</title></svelte:head>

<RegisterForm
  bind:name
  bind:email
  bind:password
  bind:confirmPassword
  {error}
  {loading}
  onSubmit={handleSubmit}
>
  {#snippet footer()}
    Sudah punya akun?
    <Link href="/login" class="font-semibold">Masuk</Link>
  {/snippet}
</RegisterForm>
