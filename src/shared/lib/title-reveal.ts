import gsap from 'gsap';

type TitleRevealOptions = {
  root: HTMLElement;
  wrapperSelector: string;
  innerSelector: string;
  startDelayMs?: number;
  revealDelay?: number;
  stagger?: number;
  opacity?: number;
  onComplete?: () => void;
};

export function animateTitleCharacters({
  root,
  wrapperSelector,
  innerSelector,
  startDelayMs = 50,
  revealDelay = 0.6,
  stagger = 0.08,
  opacity = 1,
  onComplete,
}: TitleRevealOptions) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    const context = gsap.context(() => {
      gsap.set(root.querySelectorAll(innerSelector), { y: '0%', opacity });
    }, root);
    onComplete?.();
    return () => context.revert();
  }

  let context: gsap.Context | null = null;
  let cancelled = false;

  const timeoutId = window.setTimeout(() => {
    if (cancelled) return;

    const wrappers = Array.from(root.querySelectorAll<HTMLElement>(wrapperSelector));
    const inners = Array.from(root.querySelectorAll<HTMLElement>(innerSelector));
    if (inners.length === 0) {
      onComplete?.();
      return;
    }

    context = gsap.context(() => {
      gsap.set(wrappers, {
        overflow: 'hidden',
        display: 'inline-block',
        position: 'relative',
        verticalAlign: 'top',
      });
      gsap.set(inners, { y: '110%', opacity: 0, display: 'inline-block' });
      gsap.timeline({ onComplete }).to(inners, {
        y: '0%',
        opacity,
        duration: 0.6,
        delay: revealDelay,
        stagger,
        ease: 'power3.out',
      });
    }, root);
  }, startDelayMs);

  return () => {
    cancelled = true;
    window.clearTimeout(timeoutId);
    context?.revert();
    context = null;
  };
}
