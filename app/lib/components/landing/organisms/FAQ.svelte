<script lang="ts">
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    PlusSignIcon,
    MinusSignIcon,
    MessageQuestionIcon,
    ArrowRight01Icon
  } from '@hugeicons/core-free-icons';
  import { locale } from '$lib/i18n/index.js';
  import { landingCopy } from '$lib/i18n/landing.js';
  import { reveal } from '$lib/actions/reveal.js';
  const copy = $derived(landingCopy[$locale]);
  let openIndex = $state<number | null>(0);

  function toggle(index: number) {
    openIndex = openIndex === index ? null : index;
  }

  function handleKeys(event: KeyboardEvent, index: number) {
    const total = copy.faq.items.length;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (index + 1) % total;
      const btn = document.getElementById(`faq-trigger-${next}`);
      btn?.focus();
      openIndex = next;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = (index - 1 + total) % total;
      const btn = document.getElementById(`faq-trigger-${prev}`);
      btn?.focus();
      openIndex = prev;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      const btn = document.getElementById('faq-trigger-0');
      btn?.focus();
      openIndex = 0;
    }
    if (event.key === 'End') {
      event.preventDefault();
      const last = total - 1;
      const btn = document.getElementById(`faq-trigger-${last}`);
      btn?.focus();
      openIndex = last;
    }
  }
</script>

<section id="faq" class="scroll-mt-24 bg-canvas py-20 sm:py-28 lg:py-32">
  <div class="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
    <div class="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
      <div class="lg:sticky lg:top-28 lg:self-start" use:reveal>
        <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{copy.faq.eyebrow}</span>
        <h2 class="mt-4 font-display text-balance text-[clamp(2rem,3.8vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink">
          {copy.faq.title}
        </h2>
        <p class="mt-5 max-w-[42ch] text-[clamp(0.95rem,1.3vw,1.1rem)] font-medium leading-[1.6] tracking-[-0.01em] text-body">
          {copy.faq.body}
        </p>

        <div class="faq-contact mt-8 rounded-[20px] bg-canvas-sunken p-5 sm:p-6">
          <div class="flex items-center gap-2 text-xs font-semibold text-primary">
            <HugeiconsIcon icon={MessageQuestionIcon} size={16} strokeWidth={1.8} />
            {copy.faq.contactTitle}
          </div>
          <p class="mt-4 text-[13px] font-medium leading-[1.6] text-body">{copy.faq.contactBody}</p>
          <a
            href={copy.faq.contactHref}
            class="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors duration-300 hover:text-primary-hover"
          >
            {copy.faq.contactCta}
            <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={1.8} />
          </a>
        </div>
      </div>

      <div class="faq-list">
        {#each copy.faq.items as item, i}
          <div class="faq-item {i === copy.faq.items.length - 1 ? 'is-last' : ''}" use:reveal={i * 80}>
            <h3>
              <button
                type="button"
                id={`faq-trigger-${i}`}
                class="faq-trigger flex w-full items-center justify-between gap-5 py-5 text-left transition-colors duration-300 focus-visible:outline-none sm:py-6"
                aria-expanded={openIndex === i}
                aria-controls={`faq-panel-${i}`}
                onclick={() => toggle(i)}
                onkeydown={(e) => handleKeys(e, i)}
              >
                <span class="max-w-[44ch] text-[clamp(1rem,1.6vw,1.2rem)] font-semibold leading-snug tracking-[-0.02em] text-ink">
                  {item.question}
                </span>
                <span class="faq-icon grid size-8 shrink-0 place-items-center rounded-full bg-canvas-sunken text-ink ring-1 ring-hairline-strong transition-all duration-300 {openIndex === i ? 'is-open' : ''}">
                  <HugeiconsIcon icon={openIndex === i ? MinusSignIcon : PlusSignIcon} size={16} strokeWidth={2} />
                </span>
              </button>
            </h3>
            <div
              id={`faq-panel-${i}`}
              role="region"
              aria-labelledby={`faq-trigger-${i}`}
              class="faq-panel grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] {openIndex === i ? 'is-open' : ''}"
            >
              <div class="overflow-hidden">
                <p class="max-w-[58ch] pb-6 text-[clamp(0.92rem,1.2vw,1rem)] font-medium leading-[1.65] text-body sm:pb-7">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>

<style>
  .faq-item {
    border-bottom: 1px solid var(--color-hairline);
  }

  .faq-item.is-last {
    border-bottom: none;
  }

  .faq-trigger:focus-visible {
    box-shadow: inset 0 0 0 2px var(--color-primary);
    border-radius: 8px;
  }

  .faq-icon.is-open {
    background: var(--color-primary-soft);
    color: var(--color-primary);
    transform: rotate(180deg);
  }

  .faq-panel {
    grid-template-rows: 0fr;
  }

  .faq-panel.is-open {
    grid-template-rows: 1fr;
  }

  @media (prefers-reduced-motion: reduce) {
    .faq-panel,
    .faq-icon {
      transition: none;
    }
  }
</style>
