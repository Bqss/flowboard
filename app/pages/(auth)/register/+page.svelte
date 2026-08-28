<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { api, ApiError } from '$lib/api/client';
  import { locale } from '$lib/i18n/index.js';
  import { authCopy, localizeAuthError } from '$lib/i18n/auth.js';
  import { Link } from '$lib/components/atoms/index.js';
  import { RegisterForm } from '$lib/components/organisms/index.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let name = $state('');
  let email = $state('');
  let phone = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let error = $state<string | undefined>(undefined);
  let loading = $state(false);
  const copy = $derived(authCopy[$locale].register);

  async function handleSubmit(payload: { name: string; email: string; phone: string; password: string }) {
    error = undefined;
    loading = true;
    const dest = data.redirectTo || '/dashboard';
    try {
      await api.register(payload);
      await invalidateAll();
      await goto(dest);
    } catch (err) {
      error = err instanceof ApiError ? localizeAuthError(err, copy.errors) : copy.errors.generic;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{authCopy[$locale].meta.registerTitle}</title>
  <meta name="description" content={authCopy[$locale].meta.registerDescription} />
</svelte:head>

<RegisterForm
  bind:name
  bind:email
  bind:phone
  bind:password
  bind:confirmPassword
  {copy}
  {error}
  {loading}
  title={copy.title}
  subtitle={copy.subtitle}
  submitLabel={copy.submitLabel}
  onSubmit={handleSubmit}
>
  {#snippet footer()}
    {copy.footer.prompt}
    <Link href="/login" class="font-semibold">{copy.footer.action}</Link>
  {/snippet}
</RegisterForm>
