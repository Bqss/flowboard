import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Reveal-on-scroll: animates the node the first time it crosses into the
 * viewport, then unobserves. A `delay` (ms) staggers grouped elements.
 * Respects reduced-motion by revealing immediately.
 */
export function reveal(node: HTMLElement, delay = 0) {
  if (typeof window === 'undefined') {
    node.classList.add('is-visible');
    return {};
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) {
    node.classList.add('is-visible');
    return {};
  }

  gsap.registerPlugin(ScrollTrigger);

  // Set initial state
  gsap.set(node, { autoAlpha: 0, y: 20 });
  node.classList.remove('reveal'); // Prevent CSS from fighting GSAP

  const st = ScrollTrigger.create({
    trigger: node,
    start: 'top 85%',
    onEnter: () => {
      gsap.to(node, {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        delay: delay / 1000,
        ease: 'power3.out',
        overwrite: 'auto'
      });
    },
    once: true
  });

  return {
    destroy() {
      st.kill();
    }
  };
}
