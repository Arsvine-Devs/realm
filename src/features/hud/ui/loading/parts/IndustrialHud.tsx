import React, { useRef, useImperativeHandle, useEffect } from 'react';
import styles from '../HomeLoadingScreen.module.scss';
import gsap from 'gsap';
import { useResponsive } from '@/shared/hooks/useMediaQuery';

export interface IndustrialHudRef {
  container: HTMLDivElement | null;
  hudElements: HTMLDivElement | null;
  initAnimations: () => void;
}

function IndustrialHud({ ref }: { ref?: React.Ref<IndustrialHudRef> }) {
  const bgHudLayerRef = useRef<HTMLDivElement>(null);
  const hudElementsRef = useRef<HTMLDivElement>(null);
  const clockTextRef = useRef<HTMLDivElement>(null);
  const scaleLeftRef = useRef<HTMLDivElement>(null);
  const scaleRightRef = useRef<HTMLDivElement>(null);
  const { isTablet } = useResponsive();

  const gsapCtxRef = useRef<ReturnType<typeof gsap.context> | null>(null);

  useImperativeHandle(ref, () => ({
    container: bgHudLayerRef.current,
    hudElements: hudElementsRef.current,
    initAnimations: () => {
      if (isTablet) return;
      // 用 gsap.context 包裹两个 repeat:-1 tween，卸载时统一 revert，
      // 避免 HomeLoadingScreen 的 timeline.kill() 杀不到独立 tween 而泄漏。
      gsapCtxRef.current?.revert();
      gsapCtxRef.current = gsap.context(() => {
        if (scaleLeftRef.current) {
          gsap.to(scaleLeftRef.current, { y: '-50%', duration: 10, ease: 'none', repeat: -1 });
        }
        if (scaleRightRef.current) {
          gsap.to(scaleRightRef.current, { y: '-50%', duration: 10, ease: 'none', repeat: -1 });
        }
      });
    },
  }));

  useEffect(() => {
    return () => {
      gsapCtxRef.current?.revert();
    };
  }, []);

  // ===================== Clock (direct DOM update, no re-render) =====================
  useEffect(() => {
    const update = () => {
      if (clockTextRef.current) clockTextRef.current.textContent = new Date().toLocaleTimeString();
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {/* Background HUD Layer with Corner Brackets */}
      <div ref={bgHudLayerRef} className={styles.background_hud_layer} style={{ opacity: 0 }}>
        <div className={`${styles.corner_bracket} ${styles.tl}`}></div>
        <div className={`${styles.corner_bracket} ${styles.tr}`}></div>
        <div className={`${styles.corner_bracket} ${styles.bl}`}></div>
        <div className={`${styles.corner_bracket} ${styles.br}`}></div>

        <div className={styles.right_stripe_gradient}></div>

        <div className={styles.hud_scale_left}>
          <div className={styles.scale_animation_container}>
            <div ref={scaleLeftRef} className={styles.scale_animation_content}>
              <div className={styles.scale_connecting_line}></div>
              {[...Array(20)].map((_, i) => (
                <div
                  key={`scale-l-${i}`}
                  className={styles.scale_marker}
                  style={{ top: `${5 + i * 10}%` }}
                ></div>
              ))}
            </div>
          </div>
          <span className={styles.scale_label_v}>ALT</span>
        </div>

        <div className={styles.hud_scale_right}>
          <div className={styles.scale_animation_container}>
            <div ref={scaleRightRef} className={styles.scale_animation_content}>
              <div className={styles.scale_connecting_line}></div>
              {[...Array(20)].map((_, i) => (
                <div
                  key={`scale-r-${i}`}
                  className={styles.scale_marker}
                  style={{ top: `${5 + i * 10}%` }}
                ></div>
              ))}
            </div>
          </div>
          <span className={styles.scale_label_v}>SPD</span>
        </div>
      </div>

      {/* Foreground Corner text HUD elements */}
      <div ref={hudElementsRef} className={styles.hud_elements}>
        <div className={`${styles.hud_element} ${styles.top_left}`}>
          <div className={styles.hud_line}></div>
          <div className={styles.hud_text}>STATUS MONITOR</div>
        </div>
        <div className={`${styles.hud_element} ${styles.top_right}`}>
          <div className={styles.hud_line}></div>
          <div className={styles.hud_text_with_signal}>
            <div className={styles.hud_text}>BIO-SIGNAL DETECTED</div>
            <div className={styles.signal_ekg}>
              <svg viewBox="0 0 100 30" preserveAspectRatio="none">
                <polyline
                  points="0,15 20,15 25,5 30,25 35,15 50,15 55,5 65,28 75,15 100,15"
                  className={styles.ekg_line}
                />
              </svg>
            </div>
          </div>
        </div>
        <div className={`${styles.hud_element} ${styles.bottom_left}`}>
          <div className={styles.hud_line}></div>
          <div className={styles.hud_text}>ID-E38DA0</div>
        </div>
        <div className={`${styles.hud_element} ${styles.bottom_right}`}>
          <div className={styles.hud_line}></div>
          <div className={styles.hud_text} ref={clockTextRef}>
            --:--:--
          </div>
        </div>
      </div>
    </>
  );
}

IndustrialHud.displayName = 'IndustrialHud';

export default IndustrialHud;
