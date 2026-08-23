<script lang="ts">
  import Logo from '../atoms/Logo.svelte';

  /**
   * Footer: canvas background with a hairline top rule, a brand column plus
   * link columns, and a bottom meta row. Multi-column at desktop, collapsing
   * down to single column on mobile.
   */
  const columns = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Architecture', href: '#architecture' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Changelog', href: '#' }
      ]
    },
    {
      title: 'Developers',
      links: [
        { label: 'Documentation', href: '#' },
        { label: 'API reference', href: '#' },
        { label: 'CLI', href: '#' },
        { label: 'Status', href: '#' }
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '#' },
        { label: 'Blog', href: '#' },
        { label: 'Careers', href: '#' },
        { label: 'Contact', href: '#' }
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
          The full-stack boilerplate that runs your API and app on one port —
          fast by construction.
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
      <span>© {new Date().getFullYear()} Narko. Built on Bun.</span>
      <div class="flex items-center gap-6">
        {#each [{ label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }, { label: 'GitHub', href: 'https://github.com' }] as meta (meta.label)}
          <a href={meta.href} class="transition-colors hover:text-body">{meta.label}</a>
        {/each}
      </div>
    </div>
  </div>
</footer>
