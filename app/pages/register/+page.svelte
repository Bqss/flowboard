<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { api, ApiError } from '$lib/api/client';
  import AuthCard from '$lib/components/molecules/AuthCard.svelte';
  import Field from '$lib/components/molecules/Field.svelte';

  let name = $state('');
  let email = $state('');
  let password = $state('');
  let error = $state<string | null>(null);
  let loading = $state(false);

  let passwordError = $derived(
    password.length > 0 && password.length < 8 ? 'At least 8 characters.' : null
  );

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (passwordError) return;
    error = null;
    loading = true;
    try {
      await api.register({ name, email, password });
      await invalidateAll();
      await goto('/dashboard');
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Something went wrong';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Create account</title></svelte:head>

<AuthCard
  title="Create account"
  subtitle="Start with a fresh account in seconds."
  {error}
  {loading}
  submitLabel="Create account"
  loadingLabel="Creating…"
  onsubmit={submit}
>
  <Field label="Name" bind:value={name} required autocomplete="name" />
  <Field label="Email" type="email" bind:value={email} required autocomplete="email" />
  <Field
    label="Password"
    type="password"
    bind:value={password}
    required
    minlength={8}
    autocomplete="new-password"
    error={passwordError}
  />

  {#snippet footer()}
    Already have an account?
    <a href="/login" class="font-medium text-ink hover:underline">Sign in</a>
  {/snippet}
</AuthCard>
