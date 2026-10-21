import type { ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeTone = 'neutral' | 'accent' | 'gold' | 'outline' | 'dark';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}

/** Museum-label pill: small caps metadata, optionally marked with a system-colour dot. */
export default function Badge({ children, tone = 'neutral', dot = false, className }: BadgeProps) {
  return (
    <span className={clsx('badge', `badge--${tone}`, className)}>
      {dot ? <span className="badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
