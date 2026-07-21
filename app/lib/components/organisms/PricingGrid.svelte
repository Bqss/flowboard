<script lang="ts">
  import PricingCard from '../molecules/PricingCard.svelte';
  import { reveal } from '$lib/actions/reveal';

  const tiers = [
    {
      name: 'Hobby',
      price: '$0',
      period: '',
      description: 'For side projects and learning the stack.',
      cta: 'Start free',
      features: ['Single-port dev server', 'Postgres + Drizzle', 'DB-backed sessions', 'Community support'],
      featured: false
    },
    {
      name: 'Pro',
      price: '$19',
      period: '/mo',
      description: 'For teams shipping production apps on Narko.',
      cta: 'Get Pro',
      features: ['Everything in Hobby', 'Priority build pipeline', 'Preview deployments', 'Email support'],
      featured: true
    },
    {
      name: 'Team',
      price: '$49',
      period: '/mo',
      description: 'For orgs that need control and scale.',
      cta: 'Contact sales',
      features: ['Everything in Pro', 'Role-based access', 'Audit logs', 'SLA + onboarding'],
      featured: false
    }
  ];
</script>

<section id="pricing" class="scroll-mt-20 border-t border-hairline bg-surface/40">
  <div class="mx-auto max-w-[1240px] px-6 py-24">
    <div use:reveal class="reveal mx-auto max-w-2xl text-center">
      <p class="text-[13px] font-medium uppercase tracking-[0.18em] text-accent-red">Pricing</p>
      <h2 class="font-display mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-ink">
        Start free. Scale when you ship.
      </h2>
      <p class="mt-4 text-lg leading-relaxed text-mute">
        The boilerplate is yours forever. Paid tiers add the pipeline and
        collaboration features teams reach for in production.
      </p>
    </div>

    <div class="mx-auto mt-14 grid max-w-5xl gap-4 lg:grid-cols-3">
      {#each tiers as tier, i (tier.name)}
        <PricingCard
          name={tier.name}
          price={tier.price}
          period={tier.period}
          description={tier.description}
          cta={tier.cta}
          features={tier.features}
          featured={tier.featured}
          delay={i * 80}
        />
      {/each}
    </div>
  </div>
</section>
