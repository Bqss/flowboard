<script lang="ts">
  import { reveal } from '$lib/actions/reveal';

  const steps = [
    {
      number: '01',
      title: 'Shape the journey',
      body: 'Start manually or let the AI wizard draft the first version of your workflow.'
    },
    {
      number: '02',
      title: 'Make the work explicit',
      body: 'Stages, required checklists, and automations live beside the customer.'
    },
    {
      number: '03',
      title: 'Follow the signal',
      body: 'Staff work the next card while Flowboard calls out reminders, replies, and handovers.'
    }
  ];
</script>

<section id="how-it-works" class="scroll-mt-20 border-y border-hairline bg-surface/40">
  <div class="mx-auto max-w-[1240px] px-6 py-24">
    <div use:reveal class="reveal max-w-2xl">
      <h2 class="font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.12] tracking-[-0.025em] text-ink">
        Set up once. Keep the team moving.
      </h2>
      <p class="mt-5 text-lg leading-[1.6] text-mute">
        The owner defines the operating rhythm. The team gets a clear next action.
        Flowboard connects both sides without adding another handoff tool.
      </p>
    </div>

    <div use:reveal={80} class="reveal mt-14 overflow-hidden rounded-xl border border-hairline bg-surface">
      <div class="grid gap-px bg-hairline md:grid-cols-3">
        {#each steps as step}
          <div class="bg-canvas p-6 sm:p-8">
            <span class="font-mono text-[12px] tracking-[0.16em] text-ash">{step.number}</span>
            <h3 class="mt-8 text-lg font-medium text-ink">{step.title}</h3>
            <p class="mt-3 text-sm leading-[1.6] text-mute">{step.body}</p>
          </div>
        {/each}
      </div>
    </div>

    <div use:reveal={140} class="reveal mt-8 grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-2">
      <div class="bg-elevated px-6 py-5 sm:px-8">
        <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-ash">Owner mode</p>
        <p class="mt-2 text-sm font-medium text-ink">Define the system.</p>
        <p class="mt-1.5 text-sm leading-relaxed text-mute">Set stages, checklists, assignees, and the rules that keep work moving.</p>
      </div>
      <div class="bg-elevated px-6 py-5 sm:px-8">
        <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-ash">Staff mode</p>
        <p class="mt-2 text-sm font-medium text-ink">Move the work.</p>
        <p class="mt-1.5 text-sm leading-relaxed text-mute">Open the next card, complete the required step, and act on the signal.</p>
      </div>
    </div>
  </div>
</section>
