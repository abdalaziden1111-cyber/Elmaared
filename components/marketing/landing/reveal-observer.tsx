'use client';

import { useEffect } from 'react';

/** Wires .reveal → .reveal.is-in via IntersectionObserver on mount.
 *  Renders nothing. Safe to mount once anywhere inside the landing tree. */
export function RevealObserver() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>('.reveal');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
  return null;
}
