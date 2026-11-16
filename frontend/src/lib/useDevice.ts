/**
 * Device detection for the "phone on desktop" presentation.
 *
 * - Mobile browser → the app runs full-bleed and suggests installing the PWA.
 * - Wide desktop browser → the app renders inside a phone frame.
 */
import { useEffect, useState } from 'react';

function detectMobileUa(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua)) return true;
  // Touch laptops/desktops have big screens; small touch screens are phones.
  return (
    navigator.maxTouchPoints > 1 &&
    Math.min(window.screen.width, window.screen.height) < 820
  );
}

function currentWidth(): number {
  return typeof window === 'undefined' ? 0 : window.innerWidth;
}

export function useViewport() {
  const [width, setWidth] = useState(currentWidth);
  const [mobileUa, setMobileUa] = useState(detectMobileUa);

  useEffect(() => {
    const onResize = () => {
      setWidth(currentWidth());
      setMobileUa(detectMobileUa());
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return {
    width,
    /** True on a phone browser (UA or small touch screen). */
    isMobile: mobileUa,
    /** Phone frame only makes sense with room around it. */
    showPhoneFrame: !mobileUa && width >= 1024,
  };
}
