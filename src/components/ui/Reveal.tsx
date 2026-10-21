import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import clsx from 'clsx';

export interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger in milliseconds. */
  delay?: number;
  /** Fraction of the element that must be visible before revealing. */
  threshold?: number;
}

/**
 * Reveals content with a short fade-up the first time it enters the viewport.
 * Reads CSS `.reveal`/`.is-visible`, which already respect `prefers-reduced-motion`.
 * Falls back to visible if IntersectionObserver is unavailable.
 */
export default function Reveal({ children, className, delay = 0, threshold = 0.12 }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -6% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  const style = delay ? ({ transitionDelay: `${delay}ms` } as CSSProperties) : undefined;

  return (
    <div ref={ref} className={clsx('reveal', visible && 'is-visible', className)} style={style}>
      {children}
    </div>
  );
}
