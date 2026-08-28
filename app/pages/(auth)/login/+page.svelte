<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { api, ApiError } from '$lib/api/client';
  import { locale } from '$lib/i18n/index.js';
  import { authCopy, localizeAuthError } from '$lib/i18n/auth.js';
  import { Link } from '$lib/components/atoms/index.js';
  import { LoginForm } from '$lib/components/organisms/index.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let email = $state('');
  let password = $state('');
  let remember = $state(false);
  let error = $state<string | undefined>(undefined);
  let loading = $state(false);
  const copy = $derived(authCopy[$locale].login);
  const oauthErrorMap = $derived<Record<string, string>>({
    oauth_failed: copy.errors.oauthFailed,
    oauth_cancelled: copy.errors.oauthCancelled,
    oauth_email_not_verified: copy.errors.oauthEmailNotVerified,
    oauth_state_mismatch: copy.errors.oauthStateMismatch
  });
  const oauthError = $derived(oauthErrorMap[$page.url.searchParams.get('error') ?? ''] ?? undefined);

  async function handleSubmit({ email: e, password: p }: { email: string; password: string; remember: boolean }) {
    error = undefined;
    loading = true;
    const dest = data.redirectTo || '/dashboard';
    try {
      await api.login({ email: e, password: p });
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
  <title>{authCopy[$locale].meta.loginTitle}</title>
  <meta name="description" content={authCopy[$locale].meta.loginDescription} />
</svelte:head>

<LoginForm
  bind:email
  bind:password
  bind:remember
  {copy}
  error={error ?? oauthError}
  {loading}
  title={copy.title}
  subtitle={copy.subtitle}
  submitLabel={copy.submitLabel}
  onSubmit={handleSubmit}
>
  {#snippet footer()}
    {copy.footer.prompt}
    <Link href="/register" class="font-semibold">{copy.footer.action}</Link>
  {/snippet}
</LoginForm>
