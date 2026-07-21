<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { api, ApiError } from '$lib/api/client';
  import AuthCard from '$lib/components/molecules/AuthCard.svelte';
  import Field from '$lib/components/molecules/Field.svelte';

  let email = $state('admin@example.com');
  let password = $state('password');
  let error = $state<string | null>(null);
  let loading = $state(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    loading = true;
    try {
      await api.login({ email, password });
      await invalidateAll();
      await goto('/dashboard');
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Something went wrong';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Sign in</title></svelte:head>

<AuthCard
  title="Welcome back"
  subtitle="Sign in to continue to your dashboard."
  {error}
  {loading}
  submitLabel="Sign in"
  loadingLabel="Signing in…"
  onsubmit={submit}
>
  <Field label="Email" type="email" bind:value={email} required autocomplete="email" />
  <Field
    label="Password"
    type="password"
    bind:value={password}
    required
    autocomplete="current-password"
  />

  {#snippet footer()}
    No account? <a href="/register" class="font-medium text-ink hover:underline">Register</a>
  {/snippet}
</AuthCard>
