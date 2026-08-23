<script lang="ts">
  import Logo from '../atoms/Logo.svelte';

  const columns = [
    {
      title: 'Produk',
      links: [
        { label: 'Fitur', href: '#features' },
        { label: 'Cara kerja', href: '#how-it-works' },
        { label: 'Contoh alur', href: '#use-cases' }
      ]
    },
    {
      title: 'Untuk tim',
      links: [
        { label: 'Webinar', href: '#use-cases' },
        { label: 'Onboarding pelanggan', href: '#use-cases' },
        { label: 'Follow-up operasional', href: '#features' }
      ]
    },
    {
      title: 'Workspace',
      links: [
        { label: 'Masuk', href: '/login' },
        { label: 'Mulai gratis', href: '/register' },
        { label: 'Buka dashboard', href: '/dashboard' }
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
          Customer onboarding yang rapi: setiap card punya proses, setiap staff tahu langkah berikutnya.
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
      <span>© {new Date().getFullYear()} Flowboard. Dibuat untuk tim yang tidak mau kehilangan pelanggan.</span>
      <span>Workflow · Checklist · Follow-up</span>
    </div>
  </div>
</footer>
