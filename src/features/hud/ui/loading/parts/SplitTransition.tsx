import React, { useRef, useImperativeHandle, useCallback } from 'react';
import styles from '../HomeLoadingScreen.module.scss';
import gsap from 'gsap';

export interface SplitTransitionRef {
  animateOut: () => void;
  getElements: () => (HTMLDivElement | null)[];
}

interface SplitTransitionProps {
  show: boolean;
}

function SplitTransition({
  show,
  ref,
}: SplitTransitionProps & { ref?: React.Ref<SplitTransitionRef> }) {
  const splitLinesContainerRef = useRef<(HTMLDivElement | null)[]>([]);

  const setSplitRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      splitLinesContainerRef.current[index] = el;
    },
    [],
  );

  useImperativeHandle(ref, () => ({
    animateOut: () => {
      const refs = splitLinesContainerRef.current;
      if (!refs || refs.length === 0) return;

      const tl = gsap.timeline();
      const get = (i: number) => refs[i];

      if (get(0)) {
        gsap.set(get(0)!, { scaleX: 0, x: '-100%', transformOrigin: 'left center' });
        tl.to(get(0)!, { scaleX: 1, x: '0%', duration: 0.8, ease: 'power3.out' }, 0);
      }
      if (get(1)) {
        gsap.set(get(1)!, { scaleX: 0, x: '-150%', transformOrigin: 'left center' });
        tl.to(get(1)!, { scaleX: 1, x: '0%', duration: 1.0, ease: 'power3.out' }, 0.05);
      }
      if (get(2)) {
        gsap.set(get(2)!, { scaleX: 0, x: '-200%', transformOrigin: 'left center' });
        tl.to(get(2)!, { scaleX: 1, x: '0%', duration: 1.2, ease: 'power3.out' }, 0.1);
      }
      if (get(3)) {
        gsap.set(get(3)!, { scale: 0, rotation: 45 });
        tl.to(get(3)!, { scale: 1, rotation: 45, duration: 0.4, ease: 'power3.out' }, 0);
      }
      if (get(4)) {
        gsap.set(get(4)!, { scaleX: 0, transformOrigin: 'center center' });
        tl.to(get(4)!, { scaleX: 1, duration: 0.5, ease: 'power3.out' }, 0.1);
      }
      if (get(5)) {
        gsap.set(get(5)!, { scaleY: 0, transformOrigin: 'center center' });
        tl.to(get(5)!, { scaleY: 1, duration: 0.5, ease: 'power3.out' }, 0.1);
      }
      if (get(6)) {
        gsap.set(get(6)!, { scaleX: 0, transformOrigin: 'center center' });
        tl.to(get(6)!, { scaleX: 1, duration: 0.5, ease: 'power3.out' }, 0.1);
      }
      if (get(7)) {
        gsap.set(get(7)!, { scaleX: 0, transformOrigin: 'center center' });
        tl.to(get(7)!, { scaleX: 1, duration: 0.5, ease: 'power3.out' }, 0.1);
      }
    },
    getElements: () => splitLinesContainerRef.current.filter(Boolean),
  }));

  if (!show) return null;

  return (
    <>
      <div ref={setSplitRef(0)} className={styles.horizontal_slide} />
      <div ref={setSplitRef(1)} className={styles.horizontal_slide_second} />
      <div ref={setSplitRef(2)} className={styles.horizontal_slide_third} />
      <div ref={setSplitRef(3)} className={styles.split_diamond} />
      <div ref={setSplitRef(4)} className={styles.transition_line_horizontal} />
      <div ref={setSplitRef(5)} className={styles.transition_line_vertical} />
      <div ref={setSplitRef(6)} className={`${styles.transition_glow_line} ${styles.top}`} />
      <div ref={setSplitRef(7)} className={`${styles.transition_glow_line} ${styles.bottom}`} />
    </>
  );
}

SplitTransition.displayName = 'SplitTransition';

export default SplitTransition;
