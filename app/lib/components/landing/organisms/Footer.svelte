<script lang="ts">
  import Logo from '../atoms/Logo.svelte';

  const columns = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'How it works', href: '#how-it-works' },
        { label: 'Example journey', href: '#use-cases' }
      ]
    },
    {
      title: 'For teams',
      links: [
        { label: 'Webinars', href: '#use-cases' },
        { label: 'Customer onboarding', href: '#use-cases' },
        { label: 'Operational follow-up', href: '#features' }
      ]
    },
    {
      title: 'Workspace',
      links: [
        { label: 'Sign in', href: '/login' },
        { label: 'Start free', href: '/register' },
        { label: 'Open dashboard', href: '/dashboard' }
      ]
    }
  ];
</script>

<footer class="border-t border-hairline bg-canvas">
  <div class="mx-auto max-w-[1240px] px-6 py-16">
    <div class="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
      <div>
        <Logo />
        <p class="mt-4 max-w-xs text-sm leading-relaxed text-mute">
          Customer onboarding that stays organized: every card has a process, and every staff member knows the next step.
        </p>
      </div>

      {#each columns as col (col.title)}
        <div>
          <h4 class="text-[13px] font-medium text-charcoal">{col.title}</h4>
          <ul class="mt-4 flex flex-col gap-3">
            {#each col.links as link (link.label)}
              <li>
                <a href={link.href} class="text-[13px] text-mute transition-colors hover:text-ink">
                  {link.label}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>

    <div
      class="mt-14 flex flex-col gap-4 border-t border-hairline pt-8 text-[13px] text-ash sm:flex-row sm:items-center sm:justify-between"
    >
      <span>© {new Date().getFullYear()} Flowboard. Built for teams that refuse to lose customers.</span>
      <span>Workflow · Checklist · Follow-up</span>
    </div>
  </div>
</footer>
